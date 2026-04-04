/**
 * Join competition flow: Payment sheet + add participant on success.
 * @see docs/IMPLEMENTATION_ROADMAP.md (Paid competitions — Batch 2)
 */
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import { httpsCallable } from "firebase/functions";
import { getFunctions } from "firebase/functions";
import { app } from "../../../FirebaseConfig";
import { addCompetitionParticipant } from "../../utils/competitionUtils";
import type { CompetitionDoc } from "../../utils/competitionUtils";

import { useStripe } from "@stripe/stripe-react-native";

interface JoinCompetitionModalProps {
  visible: boolean;
  onClose: () => void;
  competition: CompetitionDoc;
  groupId: string;
  userId: string;
  onJoined?: () => void;
}

export default function JoinCompetitionModal({
  visible,
  onClose,
  competition,
  groupId,
  userId,
  onJoined,
}: JoinCompetitionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isProcessingRef = useRef(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const entryFeeDollars = (competition.config.entryFeeCents / 100).toFixed(2);

  async function handleJoin() {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    console.log("🟣 [JoinCompetition] Phase 1: Start — user tapped Join");
    setIsLoading(true);
    try {
      console.log("🟣 [JoinCompetition] Phase 2: Calling createCompetitionPayment (Firebase callable)");
      const functions = getFunctions(app, "europe-west1");
      const createPayment = httpsCallable<
        { competitionId: string; groupId: string },
        { clientSecret: string; paymentIntentId?: string }
      >(functions, "createCompetitionPayment");

      const { data } = await createPayment({
        competitionId: competition.config.id,
        groupId,
      });

      if (!data?.clientSecret) {
        console.error("❌ [JoinCompetition] Phase 2: No clientSecret from backend");
        Alert.alert("Error", "Could not start payment");
        return;
      }
      console.log("✅ [JoinCompetition] Phase 2: Got clientSecret and paymentIntentId");

      const paymentIntentId = data.paymentIntentId;
      console.log("🟣 [JoinCompetition] Phase 3: Initializing Stripe payment sheet");
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: "Clutch3",
      });

      if (initError) {
        console.error("❌ [JoinCompetition] Phase 3: initPaymentSheet failed", { error: initError.message });
        Alert.alert("Error", initError.message ?? "Payment setup failed");
        return;
      }
      console.log("✅ [JoinCompetition] Phase 3: Payment sheet initialized");

      console.log("🟣 [JoinCompetition] Phase 4: Presenting payment sheet to user");
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== "Canceled") {
          console.error("❌ [JoinCompetition] Phase 4: presentPaymentSheet failed", { error: presentError.message });
          Alert.alert("Error", presentError.message ?? "Payment failed");
        } else {
          console.log("🟣 [JoinCompetition] Phase 4: User canceled payment");
        }
        return;
      }
      console.log("✅ [JoinCompetition] Phase 4: Payment succeeded");

      console.log("🟣 [JoinCompetition] Phase 5: Adding participant to Firestore");
      const participant = {
        userId,
        joinedAt: new Date().toISOString(),
        paymentIntentId,
        sessionsCount: 0,
        madeShots: 0,
        totalShots: 0,
        percentage: 0,
        qualified: false,
      };

      const result = await addCompetitionParticipant(
        groupId,
        competition.config.id,
        participant
      );

      if (result.success) {
        console.log("✅ [JoinCompetition] Phase 5: Complete — user joined competition");
        Alert.alert("You're in!", "You've joined the competition. Good luck!");
        onJoined?.();
        onClose();
      } else {
        console.error("❌ [JoinCompetition] Phase 5: addCompetitionParticipant failed", { error: result.error });
        Alert.alert("Error", result.error ?? "Failed to add you to the competition");
      }
    } catch (e) {
      console.error("❌ [JoinCompetition] Error:", e);
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Something went wrong"
      );
    } finally {
      isProcessingRef.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Join Competition</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isLoading}>
            <Ionicons name="close" size={24} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Ionicons name="trophy" size={48} color={APP_CONSTANTS.COLORS.PRIMARY} />
          <Text style={styles.entryFee}>Entry fee: ${entryFeeDollars}</Text>
          <Text style={styles.hint}>
            Sessions required: {competition.config.sessionsRequired}
          </Text>
          {(competition.config.platformFeePercent ?? 10) > 0 && (
            <Text style={styles.hint}>
              {100 - (competition.config.platformFeePercent ?? 10)}% to prizes,{" "}
              {competition.config.platformFeePercent ?? 10}% platform fee (50% admin, 50% app)
            </Text>
          )}

          <TouchableOpacity
            style={[styles.joinButton, isLoading && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.joinButtonText}>Join for ${entryFeeDollars}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  entryFee: {
    fontSize: 24,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginTop: 16,
  },
  hint: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginTop: 8,
  },
  joinButton: {
    marginTop: 32,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: "center",
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
