const { onRequest } = require("firebase-functions/v2/https");
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

exports.hotmartWebhook = onRequest(
  {
    secrets: [hotmartToken],
    cors: false,
  },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    // Hotmart envia o token como query param ?hottok=TOKEN
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
      // Busca o usuário Firebase pelo email do comprador Hotmart
      let uid;
      try {
        const userRecord = await auth.getUserByEmail(email);
        uid = userRecord.uid;
      } catch {
        // Usuário ainda não tem conta — salva numa coleção pendente
        // para ativar quando ele se cadastrar
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
