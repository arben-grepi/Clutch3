/**
 * Cloud Functions for Clutch3 paid competitions.
 * @see docs/PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md Batch 2
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import Stripe from "stripe";

initializeApp();
const db = getFirestore();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new HttpsError("failed-precondition", "STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(key);
}

interface CreateCompetitionPaymentParams {
  competitionId: string;
  groupId: string;
}

/**
 * Creates a Stripe PaymentIntent for competition entry fee.
 * Returns clientSecret for client-side payment sheet.
 */
export const createCompetitionPayment = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const userId = request.auth.uid;

    const { competitionId, groupId } = request.data as CreateCompetitionPaymentParams;
    if (!competitionId || !groupId) {
      throw new HttpsError("invalid-argument", "competitionId and groupId required");
    }

    const compRef = db.doc(`groups/${groupId}/competitions/${competitionId}`);
    const compSnap = await compRef.get();
    if (!compSnap.exists) {
      throw new HttpsError("not-found", "Competition not found");
    }

    const comp = compSnap.data()!;
    const config = comp.config as { entryFeeCents: number; createdBy: string };
    const participants = (comp.participants || []) as Array<{ userId: string }>;

    if (config.createdBy === userId) {
      throw new HttpsError("failed-precondition", "Admin cannot participate in own competition");
    }
    if (participants.some((p) => p.userId === userId)) {
      throw new HttpsError("failed-precondition", "Already joined");
    }

    const amountCents = config.entryFeeCents || 2000; // fallback $20
    if (amountCents < 50 || amountCents > 10000) {
      throw new HttpsError("invalid-argument", "Invalid entry fee");
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        competitionId,
        groupId,
        userId,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }
);
