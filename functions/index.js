const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Stripe } = require("stripe");

admin.initializeApp();
const db = admin.firestore();

const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Creates a Stripe Checkout Session and returns the URL
exports.createCheckoutSession = onRequest(
  { secrets: [stripeSecret], cors: ["https://bankroll-vault.pages.dev"] },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const { uid, email } = req.body;
    if (!uid || !email) return res.status(400).json({ error: "uid e email são obrigatórios" });

    const stripe = new Stripe(stripeSecret.value());
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        customer_email: email,
        metadata: { firebaseUID: uid },
        success_url: `https://bankroll-vault.pages.dev/?payment=success`,
        cancel_url: `https://bankroll-vault.pages.dev/?payment=cancelled`,
      });
      res.json({ url: session.url });
    } catch (err) {
      console.error("Checkout session error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Receives Stripe webhook events and updates Firestore
exports.stripeWebhook = onRequest(
  { secrets: [stripeSecret, stripeWebhookSecret], rawBody: true },
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const stripe = new Stripe(stripeSecret.value());

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
    } catch (err) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const obj = event.data.object;

    try {
      if (event.type === "checkout.session.completed") {
        const uid = obj.metadata?.firebaseUID;
        if (!uid) return res.json({ received: true });

        await db.doc(`users/${uid}`).set({
          subscription: {
            status: "active",
            stripeCustomerId: obj.customer,
            stripeSubscriptionId: obj.subscription,
            currentPeriodEnd: null,
          }
        }, { merge: true });
        console.log(`✅ Usuário ${uid} ativado como Pro`);
      }

      if (event.type === "customer.subscription.updated") {
        const snap = await db.collection("users")
          .where("subscription.stripeCustomerId", "==", obj.customer)
          .limit(1).get();
        if (!snap.empty) {
          await snap.docs[0].ref.update({
            "subscription.status": obj.status === "active" ? "active" : "free",
            "subscription.currentPeriodEnd": obj.current_period_end,
          });
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const snap = await db.collection("users")
          .where("subscription.stripeCustomerId", "==", obj.customer)
          .limit(1).get();
        if (!snap.empty) {
          await snap.docs[0].ref.update({ "subscription.status": "free" });
          console.log(`⚠️ Assinatura cancelada: ${obj.customer}`);
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
