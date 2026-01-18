import { collection, addDoc, query, where, getDocs, updateDoc, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

export interface VideoReport {
  id?: string;
  groupName: string;
  reportedUserId: string;
  reporterUserId: string;
  reportedVideoIds: string[];
  reason?: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  createdAt: Timestamp | Date;
  reviewedAt?: Timestamp | Date;
  reviewedBy?: string;
  adminAction?: "adjusted_shots" | "removed_video" | "banned_user" | "dismissed";
  adminNotes?: string;
  videoAdjustments?: {
    videoId: string;
    oldShots: number;
    newShots: number;
  }[];
}

export interface CreateReportParams {
  groupName: string;
  reportedUserId: string;
  reporterUserId: string;
  reportedVideoIds: string[];
  reason?: string;
}

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
    // Prevent self-reporting
    if (params.reportedUserId === params.reporterUserId) {
      console.error("Cannot report yourself");
      return false;
    }

    // Check for duplicate reports
    const isDuplicate = await checkDuplicateReport(
      params.groupName,
      params.reportedUserId,
      params.reporterUserId,
      params.reportedVideoIds
    );

    if (isDuplicate) {
      console.log("Duplicate report detected - already exists");
      return false;
    }

    // Create report document
    const reportsRef = collection(db, "group_video_reports");
    await addDoc(reportsRef, {
      groupName: params.groupName,
      reportedUserId: params.reportedUserId,
      reporterUserId: params.reporterUserId,
      reportedVideoIds: params.reportedVideoIds,
      reason: params.reason || null,
      status: "pending",
      createdAt: Timestamp.now(),
    });

    console.log("✅ Video report created successfully");
    return true;
  } catch (error) {
    console.error("❌ Error creating video report:", error);
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

