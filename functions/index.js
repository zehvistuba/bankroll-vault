const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
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

const BOOTSTRAP_PREMIUM = ["zehvistuba@gmail.com", "jvistuba@gmail.com", "bancalogica@gmail.com"];
const BOOTSTRAP_ADMIN   = ["jvistuba@gmail.com", "bancalogica@gmail.com"];

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
