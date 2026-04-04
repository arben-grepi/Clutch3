/**
 * Competition view: shown when the user taps the floating trophy button.
 * - Not-joined (and not admin): clear scoring rules + join CTA
 * - Joined or admin: leaderboard using ExpandableUserBlock (same as group leaderboard)
 * @see docs/IMPLEMENTATION_ROADMAP.md (Paid competitions — Batch 4 / §4.7)
 */
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import type { CompetitionDoc } from "../../utils/competitionUtils";
import { getCompetitionLeaderboard } from "../../utils/competitionUtils";
import type { CompetitionParticipant } from "../../types/competition";
import ExpandableUserBlock from "../ExpandableUserBlock";
import Separator from "../Separator";
import type { UserScore } from "../../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemberStat {
  name?: string;
  initials?: string;
  profilePicture?: string | null;
}

export interface CompetitionViewProps {
  competition: CompetitionDoc;
  currentUserId: string;
  groupId: string;
  /** Raw memberStats from the group Firestore doc: { [userId]: { name, initials, profilePicture } } */
  memberStats: Record<string, MemberStat>;
  isAdmin: boolean;
  /** Called when the user taps "Join for $X" */
  onJoin: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function participantToUserScore(
  p: CompetitionParticipant,
  memberStats: Record<string, MemberStat>
): UserScore {
  const ms = memberStats[p.userId];
  const rawName = ms?.name?.trim() || "Player";
  return {
    id: p.userId,
    fullName: rawName,
    initials: ms?.initials || rawName.slice(0, 2).toUpperCase(),
    profilePicture: ms?.profilePicture ?? null,
    percentage: p.percentage,
    last100ShotsPercentage: null,
    madeShots: p.madeShots,
    totalShots: p.totalShots,
    sessionCount: p.sessionsCount,
  };
}

function getScoringClarityLines(competition: CompetitionDoc): {
  headline: string;
  detail: string;
} {
  const { config, status } = competition;
  const req = config.sessionsRequired;
  const end = formatDate(config.endDate);

  let headline: string;
  if (config.startDate && config.endDate) {
    headline = `Scoring window: ${formatDate(config.startDate)} → ${end}. Only completed sessions in this window count (after you join).`;
  } else if (config.endDate) {
    headline = `Competition ends ${end}. Scoring dates are set when the competition becomes active.`;
  } else {
    headline = "Dates are shown here once the competition is fully scheduled.";
  }

  if (status === "registration") {
    headline += " The competition must be active before sessions count toward prizes.";
  }

  const detail = `To qualify for prize placement, complete ${req} recorded video sessions in the competition (each session is 10 shots).`;

  return { headline, detail };
}

// ---------------------------------------------------------------------------
// Not-joined view: clarity + competition info + join CTA
// ---------------------------------------------------------------------------

function CompetitionInfoView({
  competition,
  onJoin,
}: {
  competition: CompetitionDoc;
  onJoin: () => void;
}) {
  const { config } = competition;
  const { headline, detail } = useMemo(
    () => getScoringClarityLines(competition),
    [competition]
  );

  const prizePool =
    Math.round(
      config.entryFeeCents *
        competition.participants.length *
        (1 - (config.platformFeePercent ?? 10) / 100)
    ) / 100;

  const prizeRows = (config.prizeSharePercent || []).map((pct, i) => ({
    place: i + 1,
    pct,
    amount:
      competition.participants.length >= config.minParticipants
        ? `$${((prizePool * pct) / 100).toFixed(2)}`
        : "TBD",
  }));

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.infoContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statusBanner}>
        <Ionicons
          name={competition.status === "active" ? "flash" : "time-outline"}
          size={16}
          color={competition.status === "active" ? "#34C759" : APP_CONSTANTS.COLORS.PRIMARY}
        />
        <Text style={styles.statusText}>
          {competition.status === "active" ? "Competition active" : "Registration open"}
        </Text>
      </View>

      {/* Clarity: when scoring + how many sessions to qualify */}
      <View style={styles.clarityCard}>
        <Text style={styles.clarityCardTitle}>Prize ranking</Text>
        <Text style={styles.clarityCardBody}>{headline}</Text>
        <Text style={[styles.clarityCardBody, styles.clarityEmphasis]}>{detail}</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Entry fee</Text>
        <Text style={styles.heroAmount}>{formatCents(config.entryFeeCents)}</Text>
        <Text style={styles.heroSub}>
          {competition.participants.length} / {config.minParticipants} players joined (minimum)
        </Text>
      </View>

      <View style={styles.detailsGrid}>
        <DetailRow
          icon="calendar-outline"
          label="Start"
          value={formatDate(config.startDate)}
        />
        <DetailRow
          icon="calendar"
          label="End"
          value={formatDate(config.endDate)}
        />
        <DetailRow
          icon="videocam-outline"
          label="Sessions to qualify"
          value={`${config.sessionsRequired} videos`}
        />
        <DetailRow
          icon="people-outline"
          label="Min. players"
          value={`${config.minParticipants}`}
        />
        {config.registrationDeadline && competition.status === "registration" && (
          <DetailRow
            icon="hourglass-outline"
            label="Registration deadline"
            value={formatDate(config.registrationDeadline)}
          />
        )}
      </View>

      {prizeRows.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prize pool (after fees)</Text>
          {prizeRows.map((row) => (
            <View key={row.place} style={styles.prizeRow}>
              <Text style={styles.prizePlace}>#{row.place}</Text>
              <Text style={styles.prizePct}>{row.pct}%</Text>
              <Text style={styles.prizeAmount}>{row.amount}</Text>
            </View>
          ))}
          <Text style={styles.prizeFeeNote}>
            {config.platformFeePercent ?? 10}% platform fee applied to the pool
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.joinCTA} onPress={onJoin} activeOpacity={0.85}>
        <Ionicons name="trophy" size={22} color="white" style={{ marginRight: 10 }} />
        <Text style={styles.joinCTAText}>Join for {formatCents(config.entryFeeCents)}</Text>
      </TouchableOpacity>

      <Text style={styles.refundNote}>
        If the minimum number of players is not reached, your entry fee is fully refunded.
      </Text>
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={APP_CONSTANTS.COLORS.PRIMARY} style={{ width: 24 }} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Leaderboard: ExpandableUserBlock + sections
// ---------------------------------------------------------------------------

function CompetitionLeaderboardView({
  competition,
  currentUserId,
  memberStats,
  isAdmin,
  groupId,
}: {
  competition: CompetitionDoc;
  currentUserId: string;
  memberStats: Record<string, MemberStat>;
  isAdmin: boolean;
  groupId: string;
}) {
  const { config } = competition;
  const { qualified, unqualified, topN } = getCompetitionLeaderboard(competition);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const myQualifiedRank = qualified.findIndex((p) => p.userId === currentUserId);
  const myParticipant = competition.participants.find((p) => p.userId === currentUserId);

  const myStatusBanner = useMemo(() => {
    if (isAdmin && !myParticipant) {
      return { text: "Viewing as group admin", icon: "shield-outline" as const };
    }
    if (myQualifiedRank >= 0) {
      return {
        text: `Your rank among prize qualifiers: #${myQualifiedRank + 1} of ${qualified.length}`,
        icon: "ribbon-outline" as const,
      };
    }
    if (myParticipant) {
      const need = Math.max(0, config.sessionsRequired - myParticipant.sessionsCount);
      return {
        text:
          need === 0
            ? `Sessions complete (${myParticipant.sessionsCount}/${config.sessionsRequired}).`
            : `${need} more session${need === 1 ? "" : "s"} to enter the prize leaderboard (${myParticipant.sessionsCount}/${config.sessionsRequired} done).`,
        icon: "fitness-outline" as const,
      };
    }
    return null;
  }, [
    isAdmin,
    myParticipant,
    myQualifiedRank,
    qualified.length,
    config.sessionsRequired,
  ]);

  const sessionsSubtitle = (p: CompetitionParticipant) =>
    `${p.sessionsCount} / ${config.sessionsRequired} sessions`;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.leaderboardContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {myStatusBanner && (
        <View style={styles.myRankingBanner}>
          <Ionicons
            name={myStatusBanner.icon}
            size={20}
            color={APP_CONSTANTS.COLORS.PRIMARY}
          />
          <Text style={styles.myRankingText}>{myStatusBanner.text}</Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <SummaryChip icon="people" label={`${competition.participants.length} in competition`} />
        <SummaryChip icon="videocam" label={`${config.sessionsRequired} to qualify`} />
        <SummaryChip icon="calendar" label={`Ends ${formatDate(config.endDate)}`} />
      </View>

      {/* Eligible for prizes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Eligible for prizes ({qualified.length})
        </Text>
        <Text style={styles.sectionHint}>
          Reached {config.sessionsRequired} sessions — ranked by competition %, then tie-breaker.
        </Text>
        {qualified.length === 0 ? (
          <Text style={styles.emptySection}>No one in the prize ranking yet.</Text>
        ) : (
          qualified.map((p, i) => {
            const rank = i + 1;
            const inTopPrizeSlots = i < config.prizeSlots;
            const userScore = participantToUserScore(p, memberStats);
            const expanded = expandedUserId === p.userId;
            return (
              <View key={p.userId} style={styles.leaderRow}>
                <View style={styles.rankColumn}>
                  {inTopPrizeSlots ? (
                    <Ionicons
                      name="trophy"
                      size={18}
                      color={
                        rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : "#CD7F32"
                      }
                    />
                  ) : (
                    <Text style={styles.rankText}>#{rank}</Text>
                  )}
                </View>
                <View style={styles.leaderBlockWrap}>
                  <ExpandableUserBlock
                    user={userScore}
                    isCurrentUser={p.userId === currentUserId}
                    isExpanded={expanded}
                    onToggle={() =>
                      setExpandedUserId(expanded ? null : p.userId)
                    }
                    groupName={groupId}
                    isAdmin={isAdmin}
                    isCompetitionParticipant={false}
                    subtitle={sessionsSubtitle(p)}
                    eligibilitySessionThreshold={config.sessionsRequired}
                    suppressTrend
                    competitionContext={{
                      competition,
                      participantUserId: p.userId,
                    }}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>

      {unqualified.length > 0 && (
        <>
          <Separator text="still qualifying" />
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleMuted]}>
              Still qualifying ({unqualified.length})
            </Text>
            <Text style={styles.sectionHint}>
              Complete {config.sessionsRequired} sessions to enter the prize leaderboard.
            </Text>
            {unqualified.map((p) => {
              const userScore = participantToUserScore(p, memberStats);
              const expanded = expandedUserId === p.userId;
              return (
                <View key={p.userId} style={styles.leaderRowFull}>
                  <ExpandableUserBlock
                    user={userScore}
                    isCurrentUser={p.userId === currentUserId}
                    isExpanded={expanded}
                    onToggle={() =>
                      setExpandedUserId(expanded ? null : p.userId)
                    }
                    groupName={groupId}
                    isAdmin={isAdmin}
                    isCompetitionParticipant={false}
                    subtitle={sessionsSubtitle(p)}
                    eligibilitySessionThreshold={config.sessionsRequired}
                    suppressTrend
                    competitionContext={{
                      competition,
                      participantUserId: p.userId,
                    }}
                  />
                </View>
              );
            })}
          </View>
        </>
      )}

      {topN.length > 0 && (
        <View style={styles.topNBanner}>
          <Ionicons name="trophy" size={16} color="#FFD700" />
          <Text style={styles.topNText}>
            Top {config.prizeSlots} places split the prize pool
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function SummaryChip({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}) {
  return (
    <View style={styles.summaryChip}>
      <Ionicons name={icon} size={14} color={APP_CONSTANTS.COLORS.PRIMARY} />
      <Text style={styles.summaryChipText}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function CompetitionView({
  competition,
  currentUserId,
  groupId,
  memberStats,
  isAdmin,
  onJoin,
}: CompetitionViewProps) {
  const isParticipant = competition.participants.some((p) => p.userId === currentUserId);
  const showLeaderboard = isParticipant || isAdmin;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Competition</Text>
        <View style={styles.headerStatusPill}>
          <Text style={styles.headerStatusText}>
            {competition.status === "active"
              ? "Active"
              : competition.status === "registration"
              ? "Registration"
              : competition.status}
          </Text>
        </View>
      </View>

      {showLeaderboard ? (
        <CompetitionLeaderboardView
          competition={competition}
          currentUserId={currentUserId}
          memberStats={memberStats}
          isAdmin={isAdmin}
          groupId={groupId}
        />
      ) : (
        <CompetitionInfoView competition={competition} onJoin={onJoin} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  headerTitle: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 18,
  },
  headerStatusPill: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerStatusText: {
    color: APP_CONSTANTS.COLORS.PRIMARY,
    fontSize: 12,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  infoContent: {
    paddingBottom: 100,
  },
  leaderboardContent: {
    paddingBottom: 100,
  },
  clarityCard: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY + "40",
  },
  clarityCardTitle: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  clarityCardBody: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  clarityEmphasis: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontWeight: "600",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  statusText: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 13,
  },
  heroCard: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginBottom: 4,
  },
  heroAmount: {
    color: "white",
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
  },
  heroSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  detailsGrid: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 13,
    flex: 1,
  },
  detailValue: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionTitleMuted: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  sectionHint: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 17,
  },
  emptySection: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 13,
    fontStyle: "italic",
  },
  prizeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
  },
  prizePlace: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 13,
    width: 30,
  },
  prizePct: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 13,
    flex: 1,
  },
  prizeAmount: {
    color: APP_CONSTANTS.COLORS.PRIMARY,
    fontSize: 15,
    fontWeight: "700",
  },
  prizeFeeNote: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 11,
    marginTop: 8,
  },
  joinCTA: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    marginBottom: 12,
  },
  joinCTAText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  refundNote: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 11,
    textAlign: "center",
  },
  myRankingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  myRankingText: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  summaryChipText: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 12,
  },
  topNBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 12,
  },
  topNText: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 12,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 2,
  },
  rankColumn: {
    width: 28,
    paddingTop: 14,
    alignItems: "center",
  },
  rankText: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 12,
    fontWeight: "700",
  },
  leaderBlockWrap: {
    flex: 1,
    minWidth: 0,
  },
  leaderRowFull: {
    marginBottom: 2,
  },
});
