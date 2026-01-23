import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import {
  VideoReport,
  getPendingReportsForGroup,
  resolveReportVideo,
  closeReportAsResolved,
} from "../../utils/reportUtils";
import {
  adjustVideoShots,
  removeVideo,
  banUserFromGroup,
} from "../../utils/adminActionsUtils";
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import VideoCard from "../statistics/VideoCard";
import VideoPlayerModal from "../VideoPlayerModal";

interface GroupReportManagementModalProps {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  onReportsUpdated: () => void;
}

export default function GroupReportManagementModal({
  visible,
  onClose,
  groupName,
  onReportsUpdated,
}: GroupReportManagementModalProps) {
  const { appUser } = useAuth();
  const [reports, setReports] = useState<VideoReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<VideoReport | null>(null);
  const [userVideos, setUserVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adjustShotsValue, setAdjustShotsValue] = useState<{ [key: string]: string }>({});
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const [userNames, setUserNames] = useState<{ [userId: string]: string }>({});

  useEffect(() => {
    if (visible) {
      fetchReports();
    }
  }, [visible, groupName]);

  const showInfo = () => {
    Alert.alert(
      "How to handle video reports",
      [
        "Dismiss Report: Use this when the video is fine. Nothing changes for either person. This just marks that specific reported video as “handled” so it won’t show up as a pending issue anymore.",
        "Adjust Shots: Use this when the video is real but the made-shot count is wrong. The reported user’s score/stats will update to match the corrected number. The report for that video will be marked as handled.",
        "Delete Video: Use this when the video should not count (wrong drill, cheating, duplicate, etc.). The video is removed from the reported user’s history and their score/stats will update. The report for that video will be marked as handled.",
        "Ban Reported User: Use this when the reported user is abusing the rules. They will be removed/banned from this group. You can still choose to adjust or delete the videos too, but banning is about removing them from the group.",
        "Ban Reporter: Use this when someone is false-reporting or spamming. The reporter will be removed/banned from this group and their pending reports will be cleared.",
        "",
        "When does a report disappear? When every reported video has been handled (dismissed/adjusted/deleted), the report closes automatically.",
        "If multiple people reported the same video, handling it once clears it for everyone.",
      ].join("\n\n")
    );
  };

  const showActionInfo = (
    action: "dismiss_single" | "delete_video" | "dismiss_all" | "ban_reported" | "ban_reporter" | "adjust_shots"
  ) => {
    if (action === "dismiss_single") {
      Alert.alert(
        "Dismiss Report",
        "Use this when the video is OK. The video stays, nobody gets banned, and no scores change. This simply clears this specific reported video from the pending list. If it was the last open item, the report closes."
      );
      return;
    }
    if (action === "delete_video") {
      Alert.alert(
        "Delete Video",
        "This permanently removes the video from the reported user's history and updates their score/stats. Use this when the video should not count. This also clears this video from the report."
      );
      return;
    }
    if (action === "adjust_shots") {
      Alert.alert(
        "Adjust Shots",
        "Use this to correct the made-shot count for this video. Enter the correct number (0-10) and tap Adjust. This will update the reported user's score/stats and clear this video from the report."
      );
      return;
    }
    if (action === "dismiss_all") {
      Alert.alert(
        "Dismiss (close the report)",
        "This closes the report without changing any videos or scores. Use this if the report is not valid or doesn't require action."
      );
      return;
    }
    if (action === "ban_reporter") {
      Alert.alert(
        "Ban Reporter",
        "Use this when someone is false-reporting or spamming. The reporter will be removed/banned from this group and their pending reports will be cleared."
      );
      return;
    }
    Alert.alert(
      "Ban Reported",
      "This removes/bans the reported user from this group. Their videos are not automatically deleted. Use this when the reported user is abusing the rules."
    );
  };

  const getAllVideoIdsForReportedUser = (reportedUserId: string) => {
    return Array.from(
      new Set(
        reports
          .filter((r) => r.reportedUserId === reportedUserId)
          .flatMap((r) => r.reportedVideoIds || [])
      )
    );
  };

  const getOpenVideoIdsForReportedUser = (reportedUserId: string) => {
    const open = new Set<string>();
    reports
      .filter((r) => r.reportedUserId === reportedUserId)
      .forEach((r) => {
        const ids: string[] = r.reportedVideoIds || [];
        const statusMap: Record<string, any> = (r as any).videoStatus || {};
        ids.forEach((id) => {
          const s = statusMap[id];
          // Backwards compat: if no status exists, assume it's still open.
          if (!s || s === "open") open.add(id);
        });
      });
    return Array.from(open);
  };

  const getReportDocsForVideo = (reportedUserId: string, videoId: string) => {
    return reports.filter(
      (r) =>
        r.reportedUserId === reportedUserId &&
        !!r.id &&
        (r.reportedVideoIds || []).includes(videoId)
    );
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const pendingReports = await getPendingReportsForGroup(groupName);
      setReports(pendingReports);

      // Fetch user names for both reported users and reporters
      const reportedUserIds = [...new Set(pendingReports.map(r => r.reportedUserId))];
      const reporterUserIds = [...new Set(pendingReports.map(r => r.reporterUserId))];
      const allUserIds = [...new Set([...reportedUserIds, ...reporterUserIds])];
      const names: { [userId: string]: string } = {};
      
      for (const userId of allUserIds) {
        try {
          const userRef = doc(db, "users", userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            names[userId] = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userId;
          } else {
            names[userId] = userId;
          }
        } catch (error) {
          console.error("Error fetching user name:", error);
          names[userId] = userId;
        }
      }
      
      setUserNames(names);
    } catch (error) {
      console.error("Error fetching reports:", error);
      Alert.alert("Error", "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVideos = async (userId: string, videoIds: string[]) => {
    setLoadingVideos(true);
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const allVideos = userData.videos || [];
        const reportedVideos = allVideos.filter((v: any) =>
          videoIds.includes(v.id)
        );
        setUserVideos(reportedVideos);
      }
    } catch (error) {
      console.error("Error fetching user videos:", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleReportSelect = (report: VideoReport) => {
    // Toggle selection by reported user, not by individual report document
    if (selectedReport?.reportedUserId === report.reportedUserId) {
      setSelectedReport(null);
      setUserVideos([]);
    } else {
      // Only show videos that are still "open" in pending reports for this user.
      const allVideoIdsForUser = getOpenVideoIdsForReportedUser(report.reportedUserId);

      setSelectedReport(report);
      fetchUserVideos(report.reportedUserId, allVideoIdsForUser);
    }
  };

  const handleVideoPress = (video: any) => {
    if (video?.url && video?.status === "completed") {
      setSelectedVideo(video);
      setShowVideoPlayer(true);
    }
  };

  const handleAdjustShots = async (report: VideoReport, videoId: string) => {
    const inputValue = adjustShotsValue[`${report.id}-${videoId}`];
    
    if (!inputValue || inputValue.trim() === "") {
      Alert.alert("Error", "Please enter a number of shots");
      return;
    }

    const newShots = parseInt(inputValue.trim(), 10);

    if (isNaN(newShots) || newShots < 0 || newShots > 10) {
      Alert.alert("Error", "Shots must be a number between 0 and 10");
      return;
    }

    // Find the current video to get old shots value
    const currentVideo = userVideos.find((v: any) => v.id === videoId);
    const oldShots = currentVideo?.shots || 0;

    if (newShots === oldShots) {
      Alert.alert("Error", "New shots value must be different from current value");
      return;
    }

    Alert.alert(
      "Confirm Adjustment",
      `Are you sure you want to adjust shots from ${oldShots} to ${newShots}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Adjust",
          onPress: async () => {
            setActionLoading(`${report.id}-adjust-${videoId}`);
            try {
              const result = await adjustVideoShots(
                report.reportedUserId,
                videoId,
                newShots,
                groupName
              );

              if (result.success) {
                if (appUser?.id) {
                  const affectedReports = getReportDocsForVideo(
                    report.reportedUserId,
                    videoId
                  );
                  await Promise.all(
                    affectedReports
                      .filter((r) => !!r.id)
                      .map((r) =>
                        resolveReportVideo({
                          reportId: r.id as string,
                          videoId,
                          adminUserId: appUser.id,
                          action: "shots_adjusted",
                          adminNotes: (r.id && adminNotes[r.id]) || undefined,
                          videoAdjustment: {
                            oldShots: result.oldShots ?? oldShots,
                            newShots,
                          },
                        })
                      )
                  );
                }

                Alert.alert(
                  "Success",
                  `Shots adjusted from ${result.oldShots} to ${newShots}`
                );
                // Refresh videos to show updated values
                fetchUserVideos(
                  report.reportedUserId,
                  getAllVideoIdsForReportedUser(report.reportedUserId)
                );
                fetchReports();
                // Clear the input
                setAdjustShotsValue({
                  ...adjustShotsValue,
                  [`${report.id}-${videoId}`]: "",
                });
              } else {
                Alert.alert("Error", result.error || "Failed to adjust shots");
              }
            } catch (error) {
              Alert.alert("Error", "An error occurred while adjusting shots");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRemoveVideo = async (report: VideoReport, videoId: string) => {
    Alert.alert(
      "Delete Video",
      "Are you sure you want to delete this video? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading(`${report.id}-remove-${videoId}`);
            try {
              const result = await removeVideo(
                report.reportedUserId,
                videoId,
                groupName
              );

              if (result.success) {
                if (appUser?.id) {
                  const affectedReports = getReportDocsForVideo(
                    report.reportedUserId,
                    videoId
                  );
                  await Promise.all(
                    affectedReports
                      .filter((r) => !!r.id)
                      .map((r) =>
                        resolveReportVideo({
                          reportId: r.id as string,
                          videoId,
                          adminUserId: appUser.id,
                          action: "deleted",
                          adminNotes: (r.id && adminNotes[r.id]) || undefined,
                        })
                      )
                  );
                }

                Alert.alert("Success", "Video deleted successfully");
                // Refresh videos to remove the deleted one from the list
                fetchUserVideos(
                  report.reportedUserId,
                  getAllVideoIdsForReportedUser(report.reportedUserId)
                );
                fetchReports();
              } else {
                Alert.alert("Error", result.error || "Failed to remove video");
              }
            } catch (error) {
              Alert.alert("Error", "An error occurred while removing video");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleDismissVideo = async (report: VideoReport, videoId: string) => {
    if (!appUser?.id) return;

    setActionLoading(`${report.id}-dismiss-video-${videoId}`);
    try {
      const affectedReports = getReportDocsForVideo(report.reportedUserId, videoId);
      const okList = await Promise.all(
        affectedReports
          .filter((r) => !!r.id)
          .map((r) =>
            resolveReportVideo({
              reportId: r.id as string,
              videoId,
              adminUserId: appUser.id as string,
              action: "dismissed",
              adminNotes: (r.id && adminNotes[r.id]) || undefined,
            })
          )
      );

      if (okList.every(Boolean)) {
        // Remove from the UI list immediately. If it was the last/only video, behave like the bottom "Dismiss"
        // (close the card + reset state).
        setUserVideos((prev) => {
          const next = prev.filter((v: any) => v?.id !== videoId);
          if (next.length === 0) {
            setSelectedReport(null);
            setAdminNotes({});
            setAdjustShotsValue({});
            onReportsUpdated();
          }
          return next;
        });

        fetchReports();
      } else {
        Alert.alert("Error", "Failed to dismiss video in one or more reports");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanReportedUser = async (report: VideoReport) => {
    Alert.alert(
      "Ban Reported User",
      `Are you sure you want to ban ${userNames[report.reportedUserId] || report.reportedUserId} from the group? This will automatically close this report.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban",
          style: "destructive",
          onPress: async () => {
            setActionLoading(`${report.id}-ban-reported`);
            try {
              const reportsForUser = reports.filter(
                (r) => r.reportedUserId === report.reportedUserId
              );
              const uniqueReporterCount = new Set(
                reportsForUser.map((r) => r.reporterUserId)
              ).size;

              const result = await banUserFromGroup(
                report.reportedUserId,
                groupName
              );

              if (result.success) {
                // Dismiss report(s) so this reported user disappears from the pending list
                if (appUser?.id) {
                  if (uniqueReporterCount <= 1) {
                    // Single reporter: dismiss the one report we have open
                    if (report.id) {
                      const notes = adminNotes[report.id] || "";
                      await closeReportAsResolved({
                        reportId: report.id,
                        adminUserId: appUser.id,
                        adminAction: "banned_user",
                        adminNotes: notes || undefined,
                      });
                    }
                  } else {
                    // Multiple reporters: dismiss all pending report docs for this reported user
                    await Promise.all(
                      reportsForUser
                        .filter((r) => !!r.id)
                        .map((r) => {
                          const notes = (r.id && adminNotes[r.id]) || "";
                          return closeReportAsResolved({
                            reportId: r.id as string,
                            adminUserId: appUser.id,
                            adminAction: "banned_user",
                            adminNotes: notes || undefined,
                          });
                        })
                    );
                  }
                }
                
                Alert.alert("Success", "User banned from group and report closed");
                
                // Close the report details and refresh
                setSelectedReport(null);
                setUserVideos([]);
                setAdminNotes({});
                setAdjustShotsValue({});
                fetchReports();
                onReportsUpdated();
              } else {
                Alert.alert("Error", result.error || "Failed to ban user");
              }
            } catch (error) {
              Alert.alert("Error", "An error occurred while banning user");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleBanReporter = async (reporterUserId: string, reporterName: string) => {
    Alert.alert(
      "Ban Reporter",
      `Are you sure you want to ban ${reporterName} (the person who made this report) from the group?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban Reporter",
          style: "destructive",
          onPress: async () => {
            setActionLoading(`ban-reporter-${reporterUserId}`);
            try {
              const result = await banUserFromGroup(
                reporterUserId,
                groupName
              );

              if (result.success) {
                // Dismiss all pending reports created by this reporter so their info disappears
                if (appUser?.id) {
                  const reportsFromReporter = reports.filter(
                    (r) => r.reporterUserId === reporterUserId
                  );

                  await Promise.all(
                    reportsFromReporter
                      .filter((r) => !!r.id)
                      .map((r) => {
                        const notes = (r.id && adminNotes[r.id]) || "";
                        return closeReportAsResolved({
                          reportId: r.id as string,
                          adminUserId: appUser.id,
                          adminAction: "banned_user",
                          adminNotes: notes || undefined,
                        });
                      })
                  );
                }

                Alert.alert("Success", "Reporter banned from group");
                // Refresh reports to remove banned reporter's reports from UI
                fetchReports();
                onReportsUpdated();
              } else {
                Alert.alert("Error", result.error || "Failed to ban reporter");
              }
            } catch (error) {
              Alert.alert("Error", "An error occurred while banning reporter");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleDismissReport = async (
    reportId: string,
    action?: VideoReport["adminAction"]
  ) => {
    const notes = adminNotes[reportId] || "";
    setActionLoading(`${reportId}-dismiss`);
    try {
      const success = await closeReportAsResolved({
        reportId,
        adminUserId: appUser?.id || "",
        adminAction: action || "dismissed",
        adminNotes: notes || undefined,
      });

      if (success) {
        Alert.alert("Success", "Report dismissed");
        fetchReports();
        setSelectedReport(null);
        setUserVideos([]);
        setAdminNotes({});
        setAdjustShotsValue({});
        onReportsUpdated();
      } else {
        Alert.alert("Error", "Failed to dismiss report");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date: Date | any) => {
    if (!date) return "Unknown";
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  };

  // Only show one card per reported user (even if there are multiple report documents)
  const displayedReports = React.useMemo(() => {
    const seenUsers = new Set<string>();
    return reports.filter((report) => {
      if (seenUsers.has(report.reportedUserId)) return false;
      seenUsers.add(report.reportedUserId);
      return true;
    });
  }, [reports]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Video Reports</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={showInfo} style={styles.headerIconButton}>
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.headerIconButton}>
              <Ionicons name="close" size={24} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#34C759" />
            <Text style={styles.emptyText}>No pending reports</Text>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {displayedReports.map((report) => {
              // Get all unique reporters for this reported user
              const allReportersForUser = reports
                .filter((r) => r.reportedUserId === report.reportedUserId)
                .map((r) => ({
                  id: r.reporterUserId,
                  name: userNames[r.reporterUserId] || r.reporterUserId,
                }));
              
              const uniqueReporters = Array.from(
                new Map(allReportersForUser.map((r) => [r.id, r])).values()
              );

              const isExpanded = selectedReport?.reportedUserId === report.reportedUserId;

              return (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportUser}>
                      Reported: {userNames[report.reportedUserId] || report.reportedUserId}
                    </Text>
                    <Text style={styles.reportDate}>
                      {formatDate(report.createdAt)}
                    </Text>
                    {isExpanded && (
                      <>
                        <View style={styles.reportersSection}>
                          <Text style={styles.reportReporterLabel}>
                            Reported by:
                          </Text>
                          <View style={styles.reportersList}>
                            {uniqueReporters.map((reporter) => (
                              <View key={reporter.id} style={styles.reporterItem}>
                                <Text style={styles.reportReporter}>
                                  {reporter.name}
                                </Text>
                                <TouchableOpacity
                                  style={[
                                    styles.banReporterButtonSmall,
                                    actionLoading === `ban-reporter-${reporter.id}` &&
                                      styles.actionButtonDisabled,
                                  ]}
                                  onPress={() => handleBanReporter(reporter.id, reporter.name)}
                                  disabled={actionLoading === `ban-reporter-${reporter.id}`}
                                >
                                  <TouchableOpacity
                                    onPress={() => showActionInfo("ban_reporter")}
                                    style={styles.actionInfoIconSmall}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                  >
                                    <Ionicons
                                      name="information"
                                      size={12}
                                      color={APP_CONSTANTS.COLORS.PRIMARY}
                                    />
                                  </TouchableOpacity>
                                  <Ionicons name="ban" size={14} color="#fff" />
                                  <Text style={styles.banReporterButtonTextSmall}>
                                    Ban
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        </View>
                        {report.reason && (
                          <Text style={styles.reportReason}>{report.reason}</Text>
                        )}
                      </>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => handleReportSelect(report)}
                  >
                    <Ionicons
                      name={
                        selectedReport?.reportedUserId === report.reportedUserId
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={20}
                      color={APP_CONSTANTS.COLORS.PRIMARY}
                    />
                  </TouchableOpacity>
                </View>

                {selectedReport?.id === report.id && (
                  <View style={styles.reportDetails}>
                    {loadingVideos ? (
                      <ActivityIndicator
                        size="small"
                        color={APP_CONSTANTS.COLORS.PRIMARY}
                      />
                    ) : (
                      <>
                        <Text style={styles.videosTitle}>Reported Videos:</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={true}
                          contentContainerStyle={styles.videosScrollContent}
                          style={{ maxHeight: 400 }}
                        >
                          {userVideos
                            .filter((video) => {
                              const openIds = new Set(
                                getOpenVideoIdsForReportedUser(report.reportedUserId)
                              );
                              return openIds.has(video.id);
                            })
                            .map((video, index) => {
                            // Find all reporters who reported this specific video
                            const reportersForVideo = reports
                              .filter(
                                (r) =>
                                  r.reportedUserId === report.reportedUserId &&
                                  (r.reportedVideoIds || []).includes(video.id)
                              )
                              .map((r) => userNames[r.reporterUserId] || r.reporterUserId);

                            const uniqueReporterNames = Array.from(new Set(reportersForVideo));

                            return (
                            <View key={video.id || index} style={styles.videoContainer}>
                              <View style={styles.videoRow}>
                                <VideoCard
                                  video={video}
                                  onPress={() => handleVideoPress(video)}
                                />
                                <View style={styles.adjustShotsContainer}>
                                  <View style={styles.shotsInputWrapper}>
                                    <Text style={styles.shotsLabel}>Adjust shots</Text>
                                    <TextInput
                                      style={styles.shotsInput}
                                      placeholder=""
                                      keyboardType="numeric"
                                      maxLength={2}
                                      value={adjustShotsValue[`${report.id}-${video.id}`] || ""}
                                      onChangeText={(text) =>
                                        setAdjustShotsValue({
                                          ...adjustShotsValue,
                                          [`${report.id}-${video.id}`]: text,
                                        })
                                      }
                                    />
                                  </View>
                                  <TouchableOpacity
                                    style={[
                                      styles.adjustButton,
                                      (actionLoading === `${report.id}-adjust-${video.id}` ||
                                        !adjustShotsValue[`${report.id}-${video.id}`] ||
                                        adjustShotsValue[`${report.id}-${video.id}`].trim() === "" ||
                                        parseInt(adjustShotsValue[`${report.id}-${video.id}`] || "0", 10) === (video.shots || 0)) &&
                                        styles.actionButtonDisabled,
                                    ]}
                                    onPress={() => handleAdjustShots(report, video.id)}
                                    disabled={
                                      actionLoading === `${report.id}-adjust-${video.id}` ||
                                      !adjustShotsValue[`${report.id}-${video.id}`] ||
                                      adjustShotsValue[`${report.id}-${video.id}`].trim() === "" ||
                                      parseInt(adjustShotsValue[`${report.id}-${video.id}`] || "0", 10) === (video.shots || 0)
                                    }
                                  >
                                    <TouchableOpacity
                                      onPress={() => showActionInfo("adjust_shots")}
                                      style={styles.actionInfoIcon}
                                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                      <Ionicons
                                        name="information"
                                        size={16}
                                        color={APP_CONSTANTS.COLORS.PRIMARY}
                                      />
                                    </TouchableOpacity>
                                    <Text style={styles.adjustButtonText}>
                                      Adjust
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                              <TouchableOpacity
                                style={[
                                  styles.dismissVideoButton,
                                  actionLoading === `${report.id}-dismiss-video-${video.id}` &&
                                    styles.actionButtonDisabled,
                                ]}
                                onPress={() => handleDismissVideo(report, video.id)}
                                disabled={
                                  actionLoading === `${report.id}-dismiss-video-${video.id}`
                                }
                              >
                                <TouchableOpacity
                                  onPress={() => showActionInfo("dismiss_single")}
                                  style={styles.actionInfoIcon}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <Ionicons
                                    name="information"
                                    size={16}
                                    color={APP_CONSTANTS.COLORS.PRIMARY}
                                  />
                                </TouchableOpacity>
                                <Ionicons name="close-circle" size={8} color="#fff" />
                                <Text style={styles.dismissVideoButtonText}>Dismiss Report</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.removeButton,
                                  actionLoading === `${report.id}-remove-${video.id}` &&
                                    styles.actionButtonDisabled,
                                ]}
                                onPress={() => handleRemoveVideo(report, video.id)}
                                disabled={actionLoading === `${report.id}-remove-${video.id}`}
                              >
                                <TouchableOpacity
                                  onPress={() => showActionInfo("delete_video")}
                                  style={styles.actionInfoIcon}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <Ionicons
                                    name="information"
                                    size={16}
                                    color={APP_CONSTANTS.COLORS.PRIMARY}
                                  />
                                </TouchableOpacity>
                                <Ionicons name="trash" size={16} color="#fff" />
                                <Text style={styles.removeButtonText}>
                                  Delete Video
                                </Text>
                              </TouchableOpacity>

                              {uniqueReporterNames.length >= 2 && (
                                <Text style={styles.videoReportersText}>
                                  Reported by: {uniqueReporterNames.join(", ")}
                                </Text>
                              )}
                            </View>
                            );
                          })}
                        </ScrollView>

                        <View style={styles.notesSection}>
                          <Text style={styles.notesLabel}>Admin Notes (internal only, not shown to user):</Text>
                          <TextInput
                            style={styles.notesInput}
                            placeholder="Add notes for your reference..."
                            value={adminNotes[report.id || ""] || ""}
                            onChangeText={(text) =>
                              setAdminNotes({
                                ...adminNotes,
                                [report.id || ""]: text,
                              })
                            }
                            multiline
                            numberOfLines={3}
                          />
                        </View>

                        <View style={styles.reportActions}>
                          <TouchableOpacity
                            style={[
                              styles.dismissButton,
                              actionLoading === `${report.id}-dismiss` &&
                                styles.actionButtonDisabled,
                            ]}
                            onPress={() => report.id && handleDismissReport(report.id)}
                            disabled={actionLoading === `${report.id}-dismiss` || !report.id}
                          >
                            <TouchableOpacity
                              onPress={() => showActionInfo("dismiss_all")}
                              style={styles.actionInfoIconLight}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Ionicons
                                name="information"
                                size={16}
                                color={APP_CONSTANTS.COLORS.PRIMARY}
                              />
                            </TouchableOpacity>
                            <Text style={styles.dismissButtonText}>Dismiss</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.banButton,
                              actionLoading === `${report.id}-ban-reported` &&
                                styles.actionButtonDisabled,
                            ]}
                            onPress={() => handleBanReportedUser(report)}
                            disabled={actionLoading === `${report.id}-ban-reported`}
                          >
                            <TouchableOpacity
                              onPress={() => showActionInfo("ban_reported")}
                              style={styles.actionInfoIcon}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Ionicons
                                name="information"
                                size={16}
                                color={APP_CONSTANTS.COLORS.PRIMARY}
                              />
                            </TouchableOpacity>
                            <Ionicons name="ban" size={16} color="#fff" />
                            <Text style={styles.banButtonText}>Ban Reported</Text>
                          </TouchableOpacity>

                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>
              );
            })}
          </ScrollView>
        )}

        {selectedVideo && selectedVideo.url && (
          <VideoPlayerModal
            visible={showVideoPlayer}
            onClose={() => {
              setShowVideoPlayer(false);
              setSelectedVideo(null);
            }}
            videoUrl={selectedVideo.url}
          />
        )}
      </SafeAreaView>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reportInfo: {
    flex: 1,
  },
  reportUser: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  reporterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  reportersSection: {
    marginBottom: 4,
  },
  reportReporterLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 6,
  },
  reportersList: {
    gap: 6,
  },
  reporterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  reportReporter: {
    fontSize: 14,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  banReporterButtonSmall: {
    backgroundColor: "#FF9500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  banReporterButtonTextSmall: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  reportDate: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 4,
  },
  reportReason: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontStyle: "italic",
    marginTop: 4,
  },
  expandButton: {
    padding: 4,
  },
  reportDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  videosTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 12,
  },
  videosScrollContent: {
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  videoContainer: {
    width: 200,
    marginRight: 16,
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  videoRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
    width: "100%",
  },
  adjustShotsContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    width: "100%",
  },
  shotsInputWrapper: {
    flexDirection: "column",
    gap: 4,
    alignItems: "flex-start",
  },
  shotsLabel: {
    fontSize: 10,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontWeight: "500",
  },
  shotsInput: {
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 8,
    padding: 6,
    width: 45,
    fontSize: 14,
    textAlign: "center",
    backgroundColor: "#fff",
  },
  adjustButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  adjustButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  removeButton: {
    backgroundColor: "#FF3B30",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    alignSelf: "flex-start",
    minWidth: 120,
    marginTop: 22,
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  dismissVideoButton: {
    backgroundColor: "#8E8E93",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    alignSelf: "flex-start",
    minWidth: 120,
    marginTop: 22,
  },
  dismissVideoButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  actionInfoIcon: {
    position: "absolute",
    top: -10,
    right: -10,
    zIndex: 2,
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  actionInfoIconLight: {
    position: "absolute",
    top: -10,
    right: -10,
    zIndex: 2,
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  actionInfoIconSmall: {
    position: "absolute",
    top: -6,
    right: -6,
    zIndex: 2,
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  notesSection: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 6,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    minHeight: 60,
    textAlignVertical: "top",
  },
  reportActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  dismissButton: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  dismissButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  banButton: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  banReporterButton: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#FF9500",
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  banButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  videoReportersText: {
    marginTop: 6,
    fontSize: 11,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontStyle: "italic",
  },
});

