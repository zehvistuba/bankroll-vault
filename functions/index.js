const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { auth: authV1 } = require("firebase-functions/v1");
const { defineSecret, defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const hotmartToken = defineSecret("HOTMART_WEBHOOK_TOKEN");

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

  if (!pendingSnap.exists) {
    console.log(`ℹ️ Sem assinatura pendente para ${email}`);
    return;
  }

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

  if (pending.isAdmin) {
    update.isAdmin = true;
  }

  await db.doc(`users/${uid}`).set(update, { merge: true });
  await pendingRef.delete();
  console.log(`✅ PRO ativado via pendingSubscriptions: uid=${uid} email=${email}`);
});

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
