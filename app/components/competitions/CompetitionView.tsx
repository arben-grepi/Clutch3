/**
 * Competition view: shown when the user taps the floating trophy button.
 * - Not-joined (and not admin): competition details + join CTA
 * - Joined or admin: leaderboard (qualified / did not qualify)
 * @see docs/PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md Batch 4
 */
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import type { CompetitionDoc } from "../../utils/competitionUtils";
import { getCompetitionLeaderboard } from "../../utils/competitionUtils";
import type { CompetitionParticipant } from "../../types/competition";

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

// ---------------------------------------------------------------------------
// Not-joined view: competition info card + join CTA
// ---------------------------------------------------------------------------

function CompetitionInfoView({
  competition,
  onJoin,
}: {
  competition: CompetitionDoc;
  onJoin: () => void;
}) {
  const { config } = competition;
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
      {/* Status banner */}
      <View style={styles.statusBanner}>
        <Ionicons
          name={competition.status === "active" ? "flash" : "time-outline"}
          size={16}
          color={competition.status === "active" ? "#34C759" : APP_CONSTANTS.COLORS.PRIMARY}
        />
        <Text style={styles.statusText}>
          {competition.status === "active" ? "Competition Active" : "Registration Open"}
        </Text>
      </View>

      {/* Entry fee hero */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Entry Fee</Text>
        <Text style={styles.heroAmount}>{formatCents(config.entryFeeCents)}</Text>
        <Text style={styles.heroSub}>
          {competition.participants.length} / {config.minParticipants} min players joined
        </Text>
      </View>

      {/* Details grid */}
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
          label="Sessions required"
          value={`${config.sessionsRequired} sessions`}
        />
        <DetailRow
          icon="people-outline"
          label="Min. players"
          value={`${config.minParticipants} players`}
        />
        {config.registrationDeadline && competition.status === "registration" && (
          <DetailRow
            icon="hourglass-outline"
            label="Registration deadline"
            value={formatDate(config.registrationDeadline)}
          />
        )}
      </View>

      {/* Prize breakdown */}
      {prizeRows.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prize Pool</Text>
          {prizeRows.map((row) => (
            <View key={row.place} style={styles.prizeRow}>
              <Text style={styles.prizePlace}>#{row.place}</Text>
              <Text style={styles.prizePct}>{row.pct}%</Text>
              <Text style={styles.prizeAmount}>{row.amount}</Text>
            </View>
          ))}
          <Text style={styles.prizeFeeNote}>
            {config.platformFeePercent ?? 10}% platform fee applied to prize pool
          </Text>
        </View>
      )}

      {/* Join CTA */}
      <TouchableOpacity style={styles.joinCTA} onPress={onJoin} activeOpacity={0.85}>
        <Ionicons name="trophy" size={22} color="white" style={{ marginRight: 10 }} />
        <Text style={styles.joinCTAText}>
          Join for {formatCents(config.entryFeeCents)}
        </Text>
      </TouchableOpacity>

      <Text style={styles.refundNote}>
        If minimum players not reached, your entry fee is fully refunded.
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
// Leaderboard view: shown to participants and admin
// ---------------------------------------------------------------------------

function CompetitionLeaderboardView({
  competition,
  currentUserId,
  memberStats,
  isAdmin,
}: {
  competition: CompetitionDoc;
  currentUserId: string;
  memberStats: Record<string, MemberStat>;
  isAdmin: boolean;
}) {
  const { config } = competition;
  const { qualified, unqualified, topN } = getCompetitionLeaderboard(competition);

  // Find current user's rank in the full qualified list
  const myQualifiedRank = qualified.findIndex((p) => p.userId === currentUserId);
  const myParticipant = competition.participants.find((p) => p.userId === currentUserId);

  const myRankLabel =
    myQualifiedRank >= 0
      ? `#${myQualifiedRank + 1} of ${qualified.length} qualified`
      : myParticipant
      ? `Not qualified yet — ${myParticipant.sessionsCount}/${config.sessionsRequired} sessions`
      : isAdmin
      ? "Admin"
      : null;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.leaderboardContent}
      showsVerticalScrollIndicator={false}
    >
      {/* My ranking banner */}
      {myRankLabel && (
        <View style={styles.myRankingBanner}>
          <Ionicons name="person-circle-outline" size={20} color={APP_CONSTANTS.COLORS.PRIMARY} />
          <Text style={styles.myRankingText}>{myRankLabel}</Text>
        </View>
      )}

      {/* Competition summary */}
      <View style={styles.summaryRow}>
        <SummaryChip icon="people" label={`${competition.participants.length} players`} />
        <SummaryChip icon="videocam" label={`${config.sessionsRequired} sessions`} />
        <SummaryChip icon="calendar" label={formatDate(config.endDate)} />
      </View>

      {/* Qualified section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Qualified ({qualified.length})
        </Text>
        {qualified.length === 0 ? (
          <Text style={styles.emptySection}>No one qualified yet.</Text>
        ) : (
          qualified.map((p, i) => (
            <ParticipantRow
              key={p.userId}
              rank={i + 1}
              participant={p}
              memberStat={memberStats[p.userId]}
              sessionsRequired={config.sessionsRequired}
              isCurrentUser={p.userId === currentUserId}
              isTopN={i < config.prizeSlots}
            />
          ))
        )}
      </View>

      {/* Did not qualify section */}
      {unqualified.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: APP_CONSTANTS.COLORS.TEXT.SECONDARY }]}>
            Did not qualify yet ({unqualified.length})
          </Text>
          {unqualified.map((p, i) => (
            <ParticipantRow
              key={p.userId}
              rank={qualified.length + i + 1}
              participant={p}
              memberStat={memberStats[p.userId]}
              sessionsRequired={config.sessionsRequired}
              isCurrentUser={p.userId === currentUserId}
              isTopN={false}
              dimmed
            />
          ))}
        </View>
      )}

      {/* topN winners callout */}
      {topN.length > 0 && (
        <View style={styles.topNBanner}>
          <Ionicons name="trophy" size={16} color="#FFD700" />
          <Text style={styles.topNText}>
            Top {config.prizeSlots} will share the prize pool
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

function ParticipantRow({
  rank,
  participant,
  memberStat,
  sessionsRequired,
  isCurrentUser,
  isTopN,
  dimmed = false,
}: {
  rank: number;
  participant: CompetitionParticipant;
  memberStat?: MemberStat;
  sessionsRequired: number;
  isCurrentUser: boolean;
  isTopN: boolean;
  dimmed?: boolean;
}) {
  const name = memberStat?.name || participant.userId;
  const initials = memberStat?.initials || name.slice(0, 2).toUpperCase();
  const profilePicture = memberStat?.profilePicture;

  return (
    <View
      style={[
        styles.participantRow,
        isCurrentUser && styles.participantRowCurrentUser,
        dimmed && styles.participantRowDimmed,
      ]}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {isTopN ? (
          <Ionicons
            name="trophy"
            size={16}
            color={rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : "#CD7F32"}
          />
        ) : (
          <Text style={styles.rankText}>#{rank}</Text>
        )}
      </View>

      {/* Avatar */}
      {profilePicture ? (
        <Image source={{ uri: profilePicture }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarInitials, { backgroundColor: dimmed ? "#555" : APP_CONSTANTS.COLORS.PRIMARY }]}>
          <Text style={styles.avatarInitialsText}>{initials}</Text>
        </View>
      )}

      {/* Name + sessions */}
      <View style={styles.participantInfo}>
        <Text
          style={[styles.participantName, isCurrentUser && styles.participantNameCurrent]}
          numberOfLines={1}
        >
          {name}
          {isCurrentUser ? " (you)" : ""}
        </Text>
        <Text style={styles.sessionsLabel}>
          {participant.sessionsCount}/{sessionsRequired} sessions
        </Text>
      </View>

      {/* Percentage */}
      <Text style={[styles.participantPct, dimmed && { color: APP_CONSTANTS.COLORS.TEXT.SECONDARY }]}>
        {participant.percentage}%
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function CompetitionView({
  competition,
  currentUserId,
  memberStats,
  isAdmin,
  onJoin,
}: CompetitionViewProps) {
  const isParticipant = competition.participants.some((p) => p.userId === currentUserId);
  const showLeaderboard = isParticipant || isAdmin;

  return (
    <View style={styles.container}>
      {/* Header */}
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
  // Status banner
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  statusText: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 13,
  },
  // Hero card
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
  },
  // Details grid
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
  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  emptySection: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 13,
    fontStyle: "italic",
  },
  // Prize breakdown
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
  // Join CTA
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
  // My ranking
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
  },
  // Summary chips
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
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
  // Top N banner
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
  // Participant row
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    gap: 10,
  },
  participantRowCurrentUser: {
    backgroundColor: `${APP_CONSTANTS.COLORS.PRIMARY}15`,
    borderRadius: 8,
    paddingHorizontal: 6,
    marginHorizontal: -6,
  },
  participantRowDimmed: {
    opacity: 0.6,
  },
  rankContainer: {
    width: 26,
    alignItems: "center",
  },
  rankText: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 12,
    fontWeight: "600",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarInitials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialsText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  participantNameCurrent: {
    color: APP_CONSTANTS.COLORS.PRIMARY,
  },
  sessionsLabel: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontSize: 11,
    marginTop: 1,
  },
  participantPct: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "800",
    minWidth: 50,
    textAlign: "right",
  },
});
