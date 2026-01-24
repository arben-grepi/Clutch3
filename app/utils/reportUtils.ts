import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp, runTransaction } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

export type ReportVideoStatus = "open" | "dismissed" | "deleted" | "shots_adjusted";

export interface VideoReport {
  id?: string;
  groupName: string;
  reportedUserId: string;
  reporterUserId: string;
  reportedVideoIds: string[];
  reason?: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  reviewedAt?: Timestamp | Date;
  reviewedBy?: string;
  adminAction?: "adjusted_shots" | "removed_video" | "banned_user" | "dismissed";
  adminNotes?: string;
  videoAdjustments?: {
    videoId: string;
    oldShots: number;
    newShots: number;
  }[];
  // Scalable per-video moderation state:
  videoStatus?: Record<string, ReportVideoStatus>;
  openVideoCount?: number;
  closedAt?: Timestamp | Date;
}

export interface CreateReportParams {
  groupName: string;
  reportedUserId: string;
  reporterUserId: string;
  reportedVideoIds: string[];
  reason?: string;
}

const computeOpenVideoCountFromStatus = (
  reportedVideoIds: string[],
  videoStatus?: Record<string, ReportVideoStatus>
) => {
  if (!reportedVideoIds?.length) return 0;
  const vs = videoStatus || {};
  return reportedVideoIds.reduce((acc, id) => acc + ((vs[id] || "open") === "open" ? 1 : 0), 0);
};

const filterOutEverReportedVideoIds = async (params: {
  groupName: string;
  reportedUserId: string;
  reporterUserId: string;
  videoIds: string[];
}) => {
  const { groupName, reportedUserId, reporterUserId, videoIds } = params;
  if (!videoIds.length) return [];

  // Firestore can't query "array-contains-any" + multiple equals in all configs reliably,
  // so do one cheap query per videoId (typical selection count is small).
  const reportsRef = collection(db, "group_video_reports");
  const checks = await Promise.all(
    videoIds.map(async (videoId) => {
      const q = query(
        reportsRef,
        where("groupName", "==", groupName),
        where("reportedUserId", "==", reportedUserId),
        where("reporterUserId", "==", reporterUserId),
        where("reportedVideoIds", "array-contains", videoId)
      );
      const snap = await getDocs(q);
      return { videoId, alreadyReported: !snap.empty };
    })
  );

  return videoIds.filter((id) => !checks.find((c) => c.videoId === id)?.alreadyReported);
};

/**
 * Check if a duplicate report exists (same reporter reporting same videos for same user in same group)
 */
export const checkDuplicateReport = async (
  groupName: string,
  reportedUserId: string,
  reporterUserId: string,
  reportedVideoIds: string[]
): Promise<boolean> => {
  try {
    const reportsRef = collection(db, "group_video_reports");
    const q = query(
      reportsRef,
      where("groupName", "==", groupName),
      where("reportedUserId", "==", reportedUserId),
      where("reporterUserId", "==", reporterUserId),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(q);
    
    // Check if any existing pending report has overlapping video IDs
    for (const reportDoc of snapshot.docs) {
      const reportData = reportDoc.data();
      const existingVideoIds = reportData.reportedVideoIds || [];
      
      // Check if there's any overlap
      const hasOverlap = reportedVideoIds.some(videoId => existingVideoIds.includes(videoId));
      if (hasOverlap) {
        return true; // Duplicate found
      }
    }

    return false; // No duplicate
  } catch (error) {
    console.error("Error checking duplicate report:", error);
    return false; // Allow submission if check fails
  }
};

/**
 * Create a new video report
 */
export const createVideoReport = async (params: CreateReportParams): Promise<boolean> => {
  try {
    const sanitizedVideoIds = Array.from(new Set((params.reportedVideoIds || []).filter(Boolean)));
    if (sanitizedVideoIds.length === 0) return false;

    // Permanent de-dupe: the same reporter should never be able to report the same video again,
    // even if a previous report was dismissed/resolved.
    const neverReportedVideoIds = await filterOutEverReportedVideoIds({
      groupName: params.groupName,
      reportedUserId: params.reportedUserId,
      reporterUserId: params.reporterUserId,
      videoIds: sanitizedVideoIds,
    });

    if (neverReportedVideoIds.length === 0) {
      // Idempotent no-op: user picked only videos they've already reported before.
      console.log("Duplicate report detected (videos were already reported previously) - skipping");
      return true;
    }

    // If there is already a pending report from this reporter for this reported user in this group,
    // merge in any new videoIds (so users can report more videos later without creating duplicates).
    const reportsRef = collection(db, "group_video_reports");
    const existingQ = query(
      reportsRef,
      where("groupName", "==", params.groupName),
      where("reportedUserId", "==", params.reportedUserId),
      where("reporterUserId", "==", params.reporterUserId),
      where("status", "==", "pending")
    );
    const existingSnap = await getDocs(existingQ);

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      const existingRef = doc(db, "group_video_reports", existingDoc.id);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(existingRef);
        if (!snap.exists()) throw new Error("Report not found");

        const data = snap.data() as any;
        const existingVideoIds: string[] = Array.isArray(data.reportedVideoIds) ? data.reportedVideoIds : [];
        const existingStatus: Record<string, ReportVideoStatus> = data.videoStatus || {};

        const newVideoIds = neverReportedVideoIds.filter((id) => !existingVideoIds.includes(id));
        if (newVideoIds.length === 0) {
          // Pure duplicate (nothing new) -> idempotent success
          return;
        }

        const nextReportedVideoIds = [...existingVideoIds, ...newVideoIds];
        const nextVideoStatus = { ...existingStatus };
        newVideoIds.forEach((id) => {
          nextVideoStatus[id] = "open";
        });

        const prevOpenCount =
          typeof data.openVideoCount === "number"
            ? data.openVideoCount
            : computeOpenVideoCountFromStatus(existingVideoIds, existingStatus);

        const update: any = {
          reportedVideoIds: nextReportedVideoIds,
          videoStatus: nextVideoStatus,
          openVideoCount: prevOpenCount + newVideoIds.length,
          updatedAt: Timestamp.now(),
        };

        // If the existing report has no reason but the user provides one now, store it.
        if ((!data.reason || data.reason === null) && params.reason && params.reason.trim()) {
          update.reason = params.reason.trim();
        }

        tx.update(existingRef, update);
      });

      console.log("✅ Video report updated (merged new videoIds)");
      return true;
    }

    // Create report document
    const videoStatus: Record<string, ReportVideoStatus> = {};
    neverReportedVideoIds.forEach((id) => {
      if (id) videoStatus[id] = "open";
    });
    await addDoc(reportsRef, {
      groupName: params.groupName,
      reportedUserId: params.reportedUserId,
      reporterUserId: params.reporterUserId,
      reportedVideoIds: neverReportedVideoIds,
      reason: params.reason || null,
      status: "pending",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      videoStatus,
      openVideoCount: neverReportedVideoIds.length,
    });

    console.log("✅ Video report created successfully");
    return true;
  } catch (error) {
    console.error("❌ Error creating video report:", error);
    return false;
  }
};

export const addReportEvent = async (
  reportId: string,
  event: {
    type: "video_dismissed" | "video_deleted" | "shots_adjusted" | "report_closed" | "user_banned";
    adminUserId: string;
    videoId?: string;
    meta?: any;
  }
): Promise<void> => {
  try {
    const eventsRef = collection(db, "group_video_reports", reportId, "events");
    await addDoc(eventsRef, {
      ...event,
      createdAt: Timestamp.now(),
    });
  } catch (e) {
    // Don't fail the main flow if event logging fails
    console.error("❌ Failed to write report event:", e);
  }
};

export const resolveReportVideo = async (params: {
  reportId: string;
  videoId: string;
  adminUserId: string;
  action: ReportVideoStatus; // dismissed | deleted | shots_adjusted
  adminNotes?: string;
  videoAdjustment?: { oldShots: number; newShots: number };
}): Promise<boolean> => {
  try {
    const reportRef = doc(db, "group_video_reports", params.reportId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(reportRef);
      if (!snap.exists()) throw new Error("Report not found");

      const data = snap.data() as any;
      const reportedVideoIds: string[] = data.reportedVideoIds || [];
      const currentVideoStatus: Record<string, ReportVideoStatus> = data.videoStatus || {};
      const prevStatus: ReportVideoStatus = currentVideoStatus[params.videoId] || "open";

      const prevOpenCount: number =
        typeof data.openVideoCount === "number" ? data.openVideoCount : reportedVideoIds.length;

      const nextVideoStatus = { ...currentVideoStatus, [params.videoId]: params.action };
      const decrement = prevStatus === "open" ? 1 : 0;
      const nextOpenCount = Math.max(0, prevOpenCount - decrement);

      const update: any = {
        videoStatus: nextVideoStatus,
        openVideoCount: nextOpenCount,
        updatedAt: Timestamp.now(),
        reviewedAt: Timestamp.now(),
        reviewedBy: params.adminUserId,
      };

      if (params.adminNotes) update.adminNotes = params.adminNotes;
      if (params.action === "shots_adjusted" && params.videoAdjustment) {
        update.adminAction = "adjusted_shots";
        update.videoAdjustments = [
          ...(Array.isArray(data.videoAdjustments) ? data.videoAdjustments : []),
          { videoId: params.videoId, ...params.videoAdjustment },
        ];
      } else if (params.action === "deleted") {
        update.adminAction = "removed_video";
      } else if (params.action === "dismissed") {
        update.adminAction = "dismissed";
      }

      if (nextOpenCount === 0) {
        update.status = "resolved";
        update.closedAt = Timestamp.now();
      }

      tx.update(reportRef, update);
    });

    await addReportEvent(params.reportId, {
      type:
        params.action === "dismissed"
          ? "video_dismissed"
          : params.action === "deleted"
            ? "video_deleted"
            : "shots_adjusted",
      adminUserId: params.adminUserId,
      videoId: params.videoId,
      meta: params.videoAdjustment ? { ...params.videoAdjustment } : undefined,
    });

    return true;
  } catch (error) {
    console.error("❌ Error resolving report video:", error);
    return false;
  }
};

export const closeReportAsResolved = async (params: {
  reportId: string;
  adminUserId: string;
  adminAction?: VideoReport["adminAction"];
  adminNotes?: string;
}): Promise<boolean> => {
  try {
    const reportRef = doc(db, "group_video_reports", params.reportId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(reportRef);
      if (!snap.exists()) throw new Error("Report not found");

      const data = snap.data() as any;
      const reportedVideoIds: string[] = data.reportedVideoIds || [];
      const currentVideoStatus: Record<string, ReportVideoStatus> = data.videoStatus || {};

      const nextVideoStatus: Record<string, ReportVideoStatus> = { ...currentVideoStatus };
      // Mark any still-open videos as dismissed when closing the report manually.
      reportedVideoIds.forEach((vid) => {
        if (!nextVideoStatus[vid] || nextVideoStatus[vid] === "open") {
          nextVideoStatus[vid] = "dismissed";
        }
      });

      const update: any = {
        status: "resolved",
        openVideoCount: 0,
        videoStatus: nextVideoStatus,
        reviewedAt: Timestamp.now(),
        reviewedBy: params.adminUserId,
        closedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (params.adminAction) update.adminAction = params.adminAction;
      if (params.adminNotes) update.adminNotes = params.adminNotes;

      tx.update(reportRef, update);
    });

    await addReportEvent(params.reportId, {
      type: "report_closed",
      adminUserId: params.adminUserId,
      meta: { adminAction: params.adminAction },
    });

    return true;
  } catch (error) {
    console.error("❌ Error closing report:", error);
    return false;
  }
};

/**
 * Get pending reports for a group (admin only)
 */
export const getPendingReportsForGroup = async (groupName: string): Promise<VideoReport[]> => {
  try {
    const reportsRef = collection(db, "group_video_reports");
    const q = query(
      reportsRef,
      where("groupName", "==", groupName),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(q);
    const reports: VideoReport[] = [];

    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data(),
      } as VideoReport);
    });

    // Sort by creation date (newest first)
    reports.sort((a, b) => {
      const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    return reports;
  } catch (error) {
    console.error("❌ Error fetching pending reports:", error);
    return [];
  }
};

/**
 * Get all reports for a group (including resolved/dismissed)
 */
export const getAllReportsForGroup = async (groupName: string): Promise<VideoReport[]> => {
  try {
    const reportsRef = collection(db, "group_video_reports");
    const q = query(
      reportsRef,
      where("groupName", "==", groupName)
    );

    const snapshot = await getDocs(q);
    const reports: VideoReport[] = [];

    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data(),
      } as VideoReport);
    });

    // Sort by creation date (newest first)
    reports.sort((a, b) => {
      const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    return reports;
  } catch (error) {
    console.error("❌ Error fetching all reports:", error);
    return [];
  }
};

/**
 * Update report status
 */
export const updateReportStatus = async (
  reportId: string,
  status: VideoReport["status"],
  adminUserId: string,
  adminAction?: VideoReport["adminAction"],
  adminNotes?: string,
  videoAdjustments?: VideoReport["videoAdjustments"]
): Promise<boolean> => {
  try {
    const reportRef = doc(db, "group_video_reports", reportId);
    const updateData: any = {
      status,
      reviewedAt: Timestamp.now(),
      reviewedBy: adminUserId,
    };

    if (adminAction) {
      updateData.adminAction = adminAction;
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (videoAdjustments) {
      updateData.videoAdjustments = videoAdjustments;
    }

    await updateDoc(reportRef, updateData);
    console.log("✅ Report status updated:", { reportId, status, adminAction });
    return true;
  } catch (error) {
    console.error("❌ Error updating report status:", error);
    return false;
  }
};

/**
 * Get report count for a group (pending reports)
 */
export const getPendingReportCount = async (groupName: string): Promise<number> => {
  try {
    const reports = await getPendingReportsForGroup(groupName);
    return reports.length;
  } catch (error) {
    console.error("❌ Error getting pending report count:", error);
    return 0;
  }
};

