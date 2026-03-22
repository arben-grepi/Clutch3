/**
 * Wraps JoinCompetitionModal with StripeProvider.
 * Loaded lazily when the Join modal opens to avoid getConstants crash at app init (New Architecture).
 * urlScheme required for 3D Secure and bank redirects.
 */
import React from "react";
import { StripeProvider } from "@stripe/stripe-react-native";
import JoinCompetitionModal from "./JoinCompetitionModal";
import type { CompetitionDoc } from "../../utils/competitionUtils";

interface JoinCompetitionWithStripeProps {
  visible: boolean;
  onClose: () => void;
  competition: CompetitionDoc;
  groupId: string;
  userId: string;
  onJoined?: () => void;
}

export default function JoinCompetitionWithStripe({
  visible,
  onClose,
  competition,
  groupId,
  userId,
  onJoined,
}: JoinCompetitionWithStripeProps) {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

  return (
    <StripeProvider
      publishableKey={publishableKey}
      urlScheme="clutch3"
    >
      <JoinCompetitionModal
        visible={visible}
        onClose={onClose}
        competition={competition}
        groupId={groupId}
        userId={userId}
        onJoined={onJoined}
      />
    </StripeProvider>
  );
}
