const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { auth: authV1 } = require("firebase-functions/v1");
const { defineSecret, defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const hotmartToken = defineSecret("HOTMART_WEBHOOK_TOKEN");
// Gmail configurado via functions/.env (GMAIL_EMAIL e GMAIL_APP_PASSWORD)
// Se não configurado, o email de boas-vindas é silenciosamente ignorado

const ACTIVE_EVENTS = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"];
const INACTIVE_EVENTS = [
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_CANCELED",
  "SUBSCRIPTION_CANCELLATION",
];

// Emails configurados via Firebase Functions config (firebase functions:secrets:set ou .env.local)
// Fallback para desenvolvimento local — não commitar .env.local
const bootstrapPremiumParam = defineString("BOOTSTRAP_PREMIUM_EMAILS", { default: "" });
const bootstrapAdminParam   = defineString("BOOTSTRAP_ADMIN_EMAILS",   { default: "" });

const getBootstrapEmails = () => ({
  premium: bootstrapPremiumParam.value().split(",").map(e => e.trim()).filter(Boolean),
  admin:   bootstrapAdminParam.value().split(",").map(e => e.trim()).filter(Boolean),
});

// ─── Webhook Hotmart ──────────────────────────────────────────────────────────
exports.hotmartWebhook = onRequest(
  { secrets: [hotmartToken], cors: false },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const receivedToken = req.query.hottok || req.headers["x-hotmart-webhook-token"];
    if (!receivedToken || receivedToken !== hotmartToken.value()) {
      console.error("❌ Token Hotmart inválido");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { event, data } = req.body;
    if (!event || !data) {
      console.error("❌ Payload inválido:", req.body);
      return res.status(400).json({ error: "Payload inválido" });
    }

    const email = data.buyer?.email;
    if (!email) {
      console.log(`⚠️ Evento ${event} sem email — ignorado`);
      return res.json({ received: true });
    }

    console.log(`📨 Evento: ${event} | Comprador: ${email}`);

    try {
      // Idempotência: deduplica por transactionId para evitar processamento duplo em retries
      const transactionId = data.purchase?.transaction || data.subscription?.subscriber?.code;
      if (transactionId) {
        const eventKey = `${transactionId}_${event}`;
        const dedupRef = db.doc(`processedWebhooks/${eventKey}`);
        const dedupSnap = await dedupRef.get();
        if (dedupSnap.exists) {
          console.log(`⏭️ Evento duplicado ignorado: ${eventKey}`);
          return res.json({ received: true, status: "duplicate" });
        }
        await dedupRef.set({ processedAt: admin.firestore.FieldValue.serverTimestamp(), email, event });
      }

      let uid;
      try {
        const userRecord = await auth.getUserByEmail(email);
        uid = userRecord.uid;
      } catch {
        await db.doc(`pendingSubscriptions/${email.replace("@", "_at_")}`).set({
          email,
          event,
          hotmartCode: data.subscription?.subscriber?.code || data.purchase?.transaction || null,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`⚠️ Sem conta Firebase para ${email} — salvo como pendente`);
        return res.json({ received: true, status: "pending" });
      }

      const hotmartCode =
        data.subscription?.subscriber?.code ||
        data.purchase?.transaction ||
        null;

      if (ACTIVE_EVENTS.includes(event)) {
        await db.doc(`users/${uid}`).set(
          {
            subscription: {
              status: "active",
              hotmartEmail: email,
              hotmartCode,
              activatedAt: admin.firestore.FieldValue.serverTimestamp(),
              cancelledAt: null,
            },
          },
          { merge: true }
        );
        console.log(`✅ PRO ativado: uid=${uid} email=${email}`);
      }

      if (INACTIVE_EVENTS.includes(event)) {
        await db.doc(`users/${uid}`).update({
          "subscription.status": "free",
          "subscription.cancelledAt": admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`⚠️ PRO cancelado: uid=${uid} email=${email}`);
      }

      res.json({ received: true, uid, event });
    } catch (err) {
      console.error("❌ Erro no webhook:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Bootstrap (uma vez só) ───────────────────────────────────────────────────
// POST /bootstrapAdmins?token=SEU_HOTTOK
exports.bootstrapAdmins = onRequest(
  { secrets: [hotmartToken], cors: false },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const token = req.query.token || req.headers["x-admin-token"];
    if (!token || token !== hotmartToken.value()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { premium: BOOTSTRAP_PREMIUM, admin: BOOTSTRAP_ADMIN } = getBootstrapEmails();
    const results = [];
    for (const email of BOOTSTRAP_PREMIUM) {
      const isAdminEmail = BOOTSTRAP_ADMIN.includes(email);
      try {
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;
        await db.doc(`users/${uid}`).set(
          {
            subscription: {
              status: "active",
              hotmartEmail: email,
              activatedAt: admin.firestore.FieldValue.serverTimestamp(),
              cancelledAt: null,
            },
            ...(isAdminEmail ? { isAdmin: true } : {}),
          },
          { merge: true }
        );
        results.push({ email, uid, status: "activated", isAdmin: isAdminEmail });
        console.log(`✅ Bootstrap: ${email} (admin=${isAdminEmail})`);
      } catch {
        await db.doc(`pendingSubscriptions/${email.replace("@", "_at_")}`).set({
          email,
          isPremium: true,
          isAdmin: isAdminEmail,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        results.push({ email, status: "pending_registration", isAdmin: isAdminEmail });
        console.log(`⚠️ Bootstrap pendente: ${email}`);
      }
    }

    res.json({ success: true, results });
  }
);

// ─── Admin: buscar usuário por email ─────────────────────────────────────────
exports.adminGetUser = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Unauthenticated");

  const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
  if (!callerSnap.exists() || !callerSnap.data().isAdmin) {
    throw new HttpsError("permission-denied", "Sem permissão de admin");
  }

  const { email } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "Email obrigatório");

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch {
    throw new HttpsError("not-found", `Usuário não encontrado: ${email}`);
  }

  const uid = userRecord.uid;
  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.exists() ? userSnap.data() : {};

  return {
    uid,
    email: userRecord.email,
    displayName: userRecord.displayName || "",
    subscription: userData.subscription || { status: "free" },
    isAdmin: userData.isAdmin === true,
  };
});

// ─── Proxy Gemini (evita expor API key no cliente) ───────────────────────────
exports.geminiProxy = onCall({ cors: true, timeoutSeconds: 60 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Unauthenticated");

  const uid = request.auth.uid;
  const userSnap = await db.doc(`users/${uid}`).get();
  const apiKey = userSnap.data()?.geminiKey;
  if (!apiKey) throw new HttpsError("failed-precondition", "Chave da API Gemini não configurada. Acesse Análise → Inteligência IA.");

  const { model, contents, systemInstruction, generationConfig } = request.data;
  if (!model || !contents) throw new HttpsError("invalid-argument", "model e contents são obrigatórios");

  const body = { contents, generationConfig: generationConfig || {} };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await resp.json();

  if (data.error) throw new HttpsError("internal", data.error.message);
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || "" };
});

// ─── Auth: processar pendingSubscriptions ao criar conta ─────────────────────
exports.onUserCreated = authV1.user().onCreate(async (user) => {
  const { email, uid } = user;
  if (!email) return;

  const key = email.replace("@", "_at_");
  const pendingRef = db.doc(`pendingSubscriptions/${key}`);
  const pendingSnap = await pendingRef.get();

  let isPro = false;

  if (!pendingSnap.exists) {
    console.log(`🎁 Ativando trial PRO 7 dias para ${email} (uid=${uid})`);
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    await db.doc(`users/${uid}`).set({
      subscription: { status: "trial", trialEndsAt: admin.firestore.Timestamp.fromDate(trialEnd) },
    }, { merge: true });
    console.log(`✅ Trial ativado até ${trialEnd.toISOString()}`);
  } else {
    const pending = pendingSnap.data();
    console.log(`🔄 Processando assinatura pendente para ${email} (uid=${uid})`);
    const update = {
      subscription: {
        status: "active",
        hotmartEmail: email,
        hotmartCode: pending.hotmartCode || null,
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelledAt: null,
      },
    };
    if (pending.isAdmin) update.isAdmin = true;
    await db.doc(`users/${uid}`).set(update, { merge: true });
    await pendingRef.delete();
    console.log(`✅ PRO ativado via pendingSubscriptions: uid=${uid} email=${email}`);
    isPro = true;
  }

  // Email de boas-vindas
  try {
    const displayName = user.displayName || email.split("@")[0];
    const planLabel = isPro ? "PRO" : "Trial PRO (7 dias grátis)";
    const trialNote = isPro ? "" : `<p style="margin:0 0 12px">Você tem <strong>7 dias de acesso completo ao plano PRO</strong> para explorar todas as funcionalidades.</p>`;
    await sendEmail({
      to: email,
      subject: "Bem-vindo à Banca Lógica 🎯",
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b132b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b132b;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#14192f;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
        <tr><td style="background:linear-gradient(135deg,#00d48a,#38bdf8);padding:32px 40px;text-align:center">
          <div style="font-size:28px;font-weight:800;color:#000;letter-spacing:-1px">Banca Lógica</div>
          <div style="font-size:13px;color:rgba(0,0,0,0.6);margin-top:4px">Gestão profissional de apostas</div>
        </td></tr>
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#e4e4f0">Olá, ${displayName}! 👋</p>
          <p style="margin:0 0 12px;font-size:14px;color:#9090aa;line-height:1.7">Sua conta foi criada com sucesso. Plano ativo: <strong style="color:#00d48a">${planLabel}</strong>.</p>
          ${trialNote}
          <p style="margin:0 0 20px;font-size:14px;color:#9090aa;line-height:1.7">Com a Banca Lógica você pode:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            ${[
              ["📊", "Acompanhar ROI, yield e taxa de acerto em tempo real"],
              ["🧮", "Calcular stakes com Kelly, Dutching e Arbitragem"],
              ["🤖", "Analisar performance com Inteligência Artificial"],
              ["📈", "Simular cenários de gestão de banca"],
              ["🛡️", "Calcular risco de ruína via Monte Carlo"],
            ].map(([icon, text]) => `
            <tr><td style="padding:6px 0">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:18px;padding-right:12px;vertical-align:top">${icon}</td>
                <td style="font-size:13px;color:#9090aa;line-height:1.6">${text}</td>
              </tr></table>
            </td></tr>`).join("")}
          </table>
          <a href="https://zehvistuba.github.io/bankroll-vault/" style="display:block;text-align:center;background:#00d48a;color:#000;font-weight:800;font-size:14px;text-decoration:none;padding:14px 24px;border-radius:10px;letter-spacing:0.5px">ABRIR A BANCA LÓGICA →</a>
        </td></tr>
        <tr><td style="padding:16px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
          <p style="margin:0;font-size:11px;color:#505068">Você recebeu este email porque criou uma conta na Banca Lógica.<br>Dúvidas? Responda este email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`📧 Email de boas-vindas enviado para ${email}`);
  } catch (err) {
    console.warn(`⚠️ Falha ao enviar email de boas-vindas para ${email}:`, err.message);
  }
});

// ─── Helper: enviar email via Gmail ──────────────────────────────────────────
// Requer GMAIL_EMAIL e GMAIL_APP_PASSWORD em functions/.env
// Se não configurados, retorna sem enviar (não bloqueia o fluxo)
async function sendEmail({ to, subject, html }) {
  const user = process.env.GMAIL_EMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  await transporter.sendMail({ from: `Banca Lógica <${user}>`, to, subject, html });
}

// ─── Admin: alterar premium / admin ──────────────────────────────────────────
exports.adminSetRole = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Unauthenticated");

  const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
  if (!callerSnap.exists() || !callerSnap.data().isAdmin) {
    throw new HttpsError("permission-denied", "Sem permissão de admin");
  }

  const { uid, isPremium, isAdmin: makeAdmin } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "UID obrigatório");

  const update = {};
  if (isPremium !== undefined) {
    update["subscription.status"] = isPremium ? "active" : "free";
    if (isPremium) {
      update["subscription.activatedAt"] = admin.firestore.FieldValue.serverTimestamp();
      update["subscription.cancelledAt"] = null;
    } else {
      update["subscription.cancelledAt"] = admin.firestore.FieldValue.serverTimestamp();
    }
  }
  if (makeAdmin !== undefined) {
    update.isAdmin = makeAdmin;
  }

  await db.doc(`users/${uid}`).set(update, { merge: true });
  return { success: true };
});

// ─── Notificações: lembretes de apostas pendentes (diário às 20h BRT) ────────
exports.sendPendingBetReminders = onSchedule(
  { schedule: "0 23 * * *", timeZone: "UTC", timeoutSeconds: 300 },
  async () => {
    const messaging = admin.messaging();
    const usersSnap = await db.collection("users").where("fcmToken", "!=", null).get();
    let sent = 0, cleared = 0;

    for (const userDoc of usersSnap.docs) {
      const { fcmToken } = userDoc.data();
      const uid = userDoc.id;

      const pendingSnap = await db.collection(`users/${uid}/bets`)
        .where("result", "==", "pending")
        .count()
        .get();
      const count = pendingSnap.data().count;
      if (count === 0) continue;

      try {
        await messaging.send({
          token: fcmToken,
          notification: {
            title: "Banca Lógica 🎯",
            body: `Você tem ${count} aposta${count > 1 ? "s" : ""} pendente${count > 1 ? "s" : ""} de resultado.`,
          },
          webpush: {
            notification: { icon: "/icon-192x192.png", badge: "/favicon-64.png" },
            fcm_options: { link: "https://zehvistuba.github.io/bankroll-vault/" },
          },
        });
        sent++;
      } catch (err) {
        if (err.code === "messaging/registration-token-not-registered") {
          await db.doc(`users/${uid}`).update({ fcmToken: admin.firestore.FieldValue.delete() });
          cleared++;
        }
        console.error(`❌ Push falhou para uid=${uid}:`, err.message);
      }
    }
    console.log(`✅ Push enviado: ${sent} usuários | Tokens limpos: ${cleared}`);
  }
);
