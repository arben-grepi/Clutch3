import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import {
  type CompetitionConfig,
  getMinParticipants,
} from "../../types/competition";
import { createCompetition as persistCompetition } from "../../utils/competitionUtils";

const TERMS_TEXT =
  "By creating a competition, you agree to review all reported videos within 2 weeks of the competition end. If you don't, participants will be refunded. You cannot participate in your own competition.";

/** Fixed prize share % per slot count (1–10). Not editable. */
const DEFAULT_PRIZE_SHARES: Record<number, number[]> = {
  1: [100],
  2: [60, 40],
  3: [50, 30, 20],
  4: [45, 25, 20, 10],
  5: [40, 25, 18, 10, 7],
  6: [38, 24, 16, 10, 7, 5],
  7: [36, 22, 15, 10, 7, 6, 4],
  8: [34, 21, 14, 10, 7, 6, 5, 3],
  9: [33, 20, 14, 10, 7, 6, 4, 3, 3],
  10: [32, 19, 13, 10, 8, 6, 5, 3, 2, 2],
};

interface CreateCompetitionModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  adminId: string;
  onCreated?: () => void;
}

export default function CreateCompetitionModal({
  visible,
  onClose,
  groupId,
  adminId,
  onCreated,
}: CreateCompetitionModalProps) {
  // Entry & prizes
  const [entryFee, setEntryFee] = useState("20");
  const [prizeSlots, setPrizeSlots] = useState(3);
  const [platformFeePercent, setPlatformFeePercent] = useState(10);

  // Sessions (duration removed; derived from start/end dates)
  const [sessionsRequired, setSessionsRequired] = useState("20");

  // Start
  const [startRule, setStartRule] = useState<"fixed_date" | "when_min_reached">(
    "when_min_reached"
  );
  const [startDate, setStartDate] = useState(() => new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [tempStartDateStr, setTempStartDateStr] = useState("");
  const [tempStartTimeStr, setTempStartTimeStr] = useState("");
  const [registrationDays, setRegistrationDays] = useState("14"); // 1-30

  // End (only end date)
  const [endDate, setEndDate] = useState(() => new Date());
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempEndDateStr, setTempEndDateStr] = useState("");
  const [tempEndTimeStr, setTempEndTimeStr] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slots = prizeSlots;
  const minParticipants = getMinParticipants(slots);
  const prizeSharePercent = DEFAULT_PRIZE_SHARES[slots];

  function formatDateTime(d: Date): string {
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function dateToInputs(d: Date): { date: string; time: string } {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return { date: `${y}-${m}-${day}`, time: `${h}:${min}` };
  }

  function inputsToDate(dateStr: string, timeStr: string): Date | null {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [h, min] = timeStr.split(":").map(Number);
    if ([y, m, d, h, min].some((n) => isNaN(n))) return null;
    const date = new Date(y, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0);
    return isNaN(date.getTime()) ? null : date;
  }

  function parseEntryFee(): number | null {
    const normalized = entryFee.trim().replace(",", ".");
    const n = parseFloat(normalized);
    if (isNaN(n) || n < 0.5 || n > 100) return null;
    return n;
  }

  function validate(): string | null {
    const fee = parseEntryFee();
    if (fee === null) {
      return "Entry fee must be between $0.50 and $100. Use . or , for decimals.";
    }

    if (slots < 1 || slots > 10) {
      return "Prize slots must be between 1 and 10.";
    }

    if (platformFeePercent < 5 || platformFeePercent > 25) {
      return "Platform fee must be between 5% and 25%.";
    }

    const sessions = parseInt(sessionsRequired, 10);
    if (isNaN(sessions) || sessions < 5 || sessions > 100) {
      return "Sessions required must be between 5 and 100.";
    }

    if (startRule === "fixed_date") {
      const now = new Date();
      now.setSeconds(0, 0);
      if (startDate.getTime() < now.getTime()) {
        return "Start date and time must be in the future.";
      }
    } else {
      const regDays = parseInt(registrationDays, 10);
      if (isNaN(regDays) || regDays < 1 || regDays > 30) {
        return "Registration open days must be between 1 and 30.";
      }
    }

    if (endDate.getTime() < startDate.getTime()) {
      return "End date must be after start date.";
    }
    const now = new Date();
    if (endDate.getTime() < now.getTime()) {
      return "End date must be in the future.";
    }

    if (!termsAccepted) {
      return "You must accept the competition terms.";
    }

    return null;
  }

  function buildConfig(): CompetitionConfig {
    const now = new Date().toISOString();
    const slotsNum = slots;
    const shares = DEFAULT_PRIZE_SHARES[slotsNum];
    const fee = parseEntryFee() ?? 0;
    const entryFeeCents = Math.round(fee * 100);

    let startDateISO: string | undefined;
    let registrationDeadlineISO: string | undefined;
    if (startRule === "fixed_date") {
      startDateISO = startDate.toISOString();
    } else if (startRule === "when_min_reached") {
      const days = parseInt(registrationDays, 10) || 14;
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + days);
      registrationDeadlineISO = deadline.toISOString();
    }

    const endDateISO = endDate.toISOString();
    const startD = startDateISO ? new Date(startDateISO).getTime() : null;
    const endD = new Date(endDateISO).getTime();
    const durationDays =
      startD != null && endD != null && endD >= startD
        ? Math.max(1, Math.ceil((endD - startD) / (24 * 60 * 60 * 1000)))
        : 0;

    return {
      id: `comp_${Date.now()}`,
      groupId,
      entryFeeCents,
      prizeSlots: slotsNum,
      prizeSharePercent: shares,
      sessionsRequired: parseInt(sessionsRequired, 10),
      durationDays,
      minParticipants: getMinParticipants(slotsNum),
      platformFeePercent,
      startRule,
      startDate: startDateISO,
      registrationDeadline: registrationDeadlineISO,
      endRule: "fixed_date",
      endDate: endDateISO,
      endDaysFromStart: undefined,
      createdAt: now,
      createdBy: adminId,
    };
  }

  async function handleCreate() {
    console.log("🟠 [CreateCompetition] Phase 1: Start — user tapped Create Competition");
    const err = validate();
    if (err) {
      console.warn("⚠️ [CreateCompetition] Phase 1: Validation failed", { err });
      Alert.alert("Invalid settings", err);
      return;
    }
    console.log("✅ [CreateCompetition] Phase 1: Validation passed");
    const config = buildConfig();
    console.log("🟠 [CreateCompetition] Phase 2: Config built", { competitionId: config.id, groupId: config.groupId, entryFeeCents: config.entryFeeCents });
    setIsSubmitting(true);
    try {
      console.log("🟠 [CreateCompetition] Phase 3: Calling competitionUtils.createCompetition");
      const result = await persistCompetition(config);
      if (result.success) {
        console.log("✅ [CreateCompetition] Phase 3: Competition persisted to Firestore");
        onCreated?.();
        onClose();
      } else {
        console.error("❌ [CreateCompetition] Phase 3: Persist failed", { error: result.error });
        Alert.alert("Error", result.error ?? "Failed to create competition");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setTermsAccepted(false);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Competition</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Entry & prizes */}
          <Text style={styles.sectionTitle}>Entry & Prizes</Text>
          <Text style={styles.hintAbove}>Entry fee can be $0.50 – $100. Use . or , for decimals (e.g. 1.50 or 1,50).</Text>
          <Text style={styles.label}>Entry fee ($)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 20 or 1,50"
              placeholderTextColor={APP_CONSTANTS.COLORS.TEXT.MUTED}
              value={entryFee}
              onChangeText={setEntryFee}
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={styles.label}>Prize slots (winners)</Text>
          <View style={styles.slotChipsRow}>
            <View style={styles.slotChipsSubRow}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.slotChip, prizeSlots === n && styles.slotChipSelected]}
                  onPress={() => setPrizeSlots(n)}
                >
                  <Text style={[styles.slotChipText, prizeSlots === n && styles.slotChipTextSelected]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.slotChipsSubRow}>
              {[8, 9, 10].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.slotChip, prizeSlots === n && styles.slotChipSelected]}
                  onPress={() => setPrizeSlots(n)}
                >
                  <Text style={[styles.slotChipText, prizeSlots === n && styles.slotChipTextSelected]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.label}>Prize share % (fixed)</Text>
          <View style={styles.prizeShareWrap}>
            {prizeSharePercent.map((pct, i) => (
              <View key={i} style={styles.prizeShareChip}>
                <Text style={styles.prizeShareChipText}>{i + 1}: {pct}%</Text>
              </View>
            ))}
          </View>
          <Text style={styles.hint}>Min participants: {minParticipants}</Text>

          {/* Revenue split: platform fee (admin + app) */}
          <Text style={styles.sectionTitle}>Revenue Split</Text>
          <Text style={styles.hintAbove}>
            {platformFeePercent}% of entry fees goes to platform (split 50% admin, 50% app). The remaining {100 - platformFeePercent}% goes to the prize pool.
          </Text>
          <Text style={styles.label}>Platform fee (%)</Text>
          <View style={styles.slotChipsRow}>
            <View style={styles.slotChipsSubRow}>
              {[5, 10, 15, 20, 25].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[styles.slotChip, platformFeePercent === pct && styles.slotChipSelected]}
                  onPress={() => setPlatformFeePercent(pct)}
                >
                  <Text style={[styles.slotChipText, platformFeePercent === pct && styles.slotChipTextSelected]}>
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sessions */}
          <Text style={styles.sectionTitle}>Sessions</Text>
          <Text style={styles.hintAbove}>1 shooting session = 1 recorded video = 10 shot attempts. Use this to set how many videos each player must submit.</Text>
          <Text style={styles.label}>Shooting sessions / recorded videos per player</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="5–100"
              placeholderTextColor={APP_CONSTANTS.COLORS.TEXT.MUTED}
              value={sessionsRequired}
              onChangeText={setSessionsRequired}
              keyboardType="number-pad"
            />
          </View>
          {(() => {
            const s = parseInt(sessionsRequired, 10);
            if (!isNaN(s) && s >= 1 && s <= 100) {
              return (
                <Text style={styles.hint}>{s} session{s !== 1 ? "s" : ""} = {s * 10} shot attempts</Text>
              );
            }
            return null;
          })()}

          {/* Start */}
          <Text style={styles.sectionTitle}>Start</Text>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setStartRule("fixed_date")}
          >
            <View style={styles.radio}>{startRule === "fixed_date" && <View style={styles.radioInner} />}</View>
            <Text style={styles.optionTitle}>Fixed start date</Text>
          </TouchableOpacity>
          {startRule === "fixed_date" && (
            <>
              <Text style={styles.label}>Start date & time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  const { date, time } = dateToInputs(startDate);
                  setTempStartDateStr(date);
                  setTempStartTimeStr(time);
                  setShowStartPicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>{formatDateTime(startDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={APP_CONSTANTS.COLORS.TEXT.MUTED} />
              </TouchableOpacity>
              <Modal visible={showStartPicker} transparent animationType="fade">
                <TouchableOpacity
                  style={styles.datePickerOverlay}
                  activeOpacity={1}
                  onPress={() => setShowStartPicker(false)}
                >
                  <TouchableOpacity activeOpacity={1} style={styles.datePickerBox} onPress={() => {}}>
                    <Text style={styles.datePickerTitle}>Start date & time</Text>
                    <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.input}
                      value={tempStartDateStr}
                      onChangeText={setTempStartDateStr}
                      placeholder="2025-03-15"
                      placeholderTextColor={APP_CONSTANTS.COLORS.TEXT.MUTED}
                    />
                    <Text style={styles.label}>Time (HH:mm, 24h)</Text>
                    <TextInput
                      style={styles.input}
                      value={tempStartTimeStr}
                      onChangeText={setTempStartTimeStr}
                      placeholder="14:00"
                      placeholderTextColor={APP_CONSTANTS.COLORS.TEXT.MUTED}
                    />
                    <View style={styles.datePickerActions}>
                      <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowStartPicker(false)}>
                        <Text style={styles.datePickerCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.datePickerDone}
                        onPress={() => {
                          const d = inputsToDate(tempStartDateStr, tempStartTimeStr);
                          if (d) setStartDate(d);
                          setShowStartPicker(false);
                        }}
                      >
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            </>
          )}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setStartRule("when_min_reached")}
          >
            <View style={styles.radio}>{startRule === "when_min_reached" && <View style={styles.radioInner} />}</View>
            <Text style={styles.optionTitle}>When min participants reached</Text>
          </TouchableOpacity>
          {startRule === "when_min_reached" && (
            <>
              <Text style={styles.hint}>
                Competition starts when {minParticipants} participants have joined. (Minimum depends on prize slots: at least 3, or 2× the number of winners.)
              </Text>
              <Text style={styles.label}>Registration open (days, max 30)</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="1–30"
                  placeholderTextColor={APP_CONSTANTS.COLORS.TEXT.MUTED}
                  value={registrationDays}
                  onChangeText={setRegistrationDays}
                  keyboardType="number-pad"
                />
              </View>
            </>
          )}

          {/* End */}
          <Text style={styles.sectionTitle}>End</Text>
          <Text style={styles.label}>End date & time</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              const { date, time } = dateToInputs(endDate);
              setTempEndDateStr(date);
              setTempEndTimeStr(time);
              setShowEndPicker(true);
            }}
          >
            <Text style={styles.dateButtonText}>{formatDateTime(endDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color={APP_CONSTANTS.COLORS.TEXT.MUTED} />
          </TouchableOpacity>
          <Modal visible={showEndPicker} transparent animationType="fade">
            <TouchableOpacity
              style={styles.datePickerOverlay}
              activeOpacity={1}
              onPress={() => setShowEndPicker(false)}
            >
              <TouchableOpacity activeOpacity={1} style={styles.datePickerBox} onPress={() => {}}>
                <Text style={styles.datePickerTitle}>End date & time</Text>
                <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={tempEndDateStr}
                  onChangeText={setTempEndDateStr}
                  placeholder="2025-04-15"
                  placeholderTextColor={APP_CONSTANTS.COLORS.TEXT.MUTED}
                />
                <Text style={styles.label}>Time (HH:mm, 24h)</Text>
                <TextInput
                  style={styles.input}
                  value={tempEndTimeStr}
                  onChangeText={setTempEndTimeStr}
                  placeholder="23:59"
                  placeholderTextColor={APP_CONSTANTS.COLORS.TEXT.MUTED}
                />
                <View style={styles.datePickerActions}>
                  <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowEndPicker(false)}>
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePickerDone}
                    onPress={() => {
                      const d = inputsToDate(tempEndDateStr, tempEndTimeStr);
                      if (d) setEndDate(d);
                      setShowEndPicker(false);
                    }}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          {/* Terms */}
          <Text style={styles.sectionTitle}>Terms</Text>
          <Text style={styles.termsText}>{TERMS_TEXT}</Text>
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkLabel}>I agree to the competition terms</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              (!termsAccepted || isSubmitting) && styles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!termsAccepted || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Create Competition</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  closeButton: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginTop: 20,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 6,
  },
  hintAbove: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.TEXT.MUTED,
    marginBottom: 6,
  },
  inputWrap: {
    maxWidth: 280,
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    maxWidth: 280,
  },
  dateButtonText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  datePickerBox: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 340,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 16,
  },
  datePickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  datePickerCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  datePickerCancelText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  datePickerDone: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRadius: 8,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.LIGHT,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  hint: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.TEXT.MUTED,
    marginBottom: 8,
  },
  slotChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  slotChipsSubRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  slotChipSelected: {
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY + "18",
  },
  slotChipText: {
    fontSize: 15,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  slotChipTextSelected: {
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.PRIMARY,
  },
  prizeShareWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  prizeShareChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  prizeShareChipText: {
    fontSize: 13,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  optionTitle: { fontSize: 16, color: APP_CONSTANTS.COLORS.TEXT.PRIMARY },
  termsText: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    lineHeight: 20,
    marginBottom: 12,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  checkLabel: { fontSize: 16, color: APP_CONSTANTS.COLORS.TEXT.PRIMARY },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  createButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.LIGHT,
  },
});
