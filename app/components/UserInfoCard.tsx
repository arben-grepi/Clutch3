import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UserInfoCardProps } from "../types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import BasketballIndicator from "./statistics/BasketballIndicator";
import VideoPlayerModal from "./VideoPlayerModal";
import { APP_CONSTANTS } from "../config/constants";
import { calculateShootingPercentage } from "../utils/ShootingStats";

const UserInfoCard: React.FC<UserInfoCardProps> = ({
  fullName,
  profilePicture,
  initials,
  percentage,
  onClose,
  sessionCount,
  userId,
}) => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bestVideo, setBestVideo] = useState<any>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          
          // Find best video from last 10 sessions
          const videos = data.videos || [];
          const completedVideos = videos.filter((v: any) => v.status === "completed");
          
          // Sort by date (most recent first)
          const sortedVideos = [...completedVideos].sort((a: any, b: any) => {
            const dateA = new Date(a.completedAt || a.createdAt || 0);
            const dateB = new Date(b.completedAt || b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
          });
          
          // Get last 10 videos
          const last10Videos = sortedVideos.slice(0, 10);
          
          // Find video with most made shots (if tie, use latest)
          if (last10Videos.length > 0) {
            const best = last10Videos.reduce((prev: any, current: any) => {
              const prevShots = prev.shots || 0;
              const currentShots = current.shots || 0;
              
              if (currentShots > prevShots) {
                return current;
              } else if (currentShots === prevShots) {
                // If tie, use the one with later date
                const prevDate = new Date(prev.completedAt || prev.createdAt || 0);
                const currentDate = new Date(current.completedAt || current.createdAt || 0);
                return currentDate > prevDate ? current : prev;
              }
              return prev;
            });
            
            setBestVideo(best);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  // Calculate all-time stats the same way as index page
  const allTimeStats = userData?.videos 
    ? calculateShootingPercentage(userData.videos)
    : null;
  const hasOver100Shots = allTimeStats && allTimeStats.totalShots >= 100;
  const basketballSize = 100;

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
            </View>
          ) : (
            <View style={styles.content}>
              {/* Profile Picture */}
              <View style={styles.profileSection}>
                {profilePicture ? (
                  <Image
                    source={{ uri: profilePicture }}
                    style={styles.profilePicture}
                  />
                ) : (
                  <View
                    style={[styles.initialsContainer, { backgroundColor: APP_CONSTANTS.COLORS.PRIMARY }]}
                  >
                    <Text style={styles.initials}>{initials}</Text>
                  </View>
                )}
              </View>

              {/* Name */}
              <Text style={styles.name}>{fullName}</Text>

              {/* Clutch3 Percentage */}
              <View style={styles.percentageSection}>
                <Text style={styles.percentageLabel}>Clutch3 Shooting</Text>
                <Text style={styles.percentageValue}>{percentage}%</Text>
              </View>

              {/* All-Time Stats (if >100 shots) - styled like index page but smaller */}
              {hasOver100Shots && allTimeStats && (
                <View style={styles.allTimeSection}>
                  <Text style={styles.allTimeText}>
                    All time: {allTimeStats.percentage}%
                  </Text>
                </View>
              )}

              {/* Basketball Icon with Best Video */}
              {bestVideo && bestVideo.url && (
                <View style={styles.basketballSection}>
                  <TouchableOpacity
                    style={styles.basketballContainer}
                    onPress={() => setShowVideoPlayer(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.basketballWrapper}>
                      <BasketballIndicator
                        size={basketballSize}
                        backgroundColor={APP_CONSTANTS.COLORS.PRIMARY}
                        totalShots={10}
                      />
                      {/* Made shots count in center */}
                      <View style={styles.shotCountContainer}>
                        <Text style={styles.shotCountText}>
                          {bestVideo.shots || 0}
                        </Text>
                      </View>
                      {/* Play icon overlay */}
                      <View style={styles.playIconOverlay}>
                        <Ionicons
                          name="play"
                          size={20}
                          color="#fff"
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.basketballLabel}>
                    Watch the latest best shooting performance
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Video Player Modal */}
      {bestVideo && bestVideo.url && (
        <VideoPlayerModal
          visible={showVideoPlayer}
          onClose={() => setShowVideoPlayer(false)}
          videoUrl={bestVideo.url}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  profileSection: {
    marginBottom: 16,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  initialsContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "white",
    fontSize: 40,
    fontWeight: "bold",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  percentageSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  percentageLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  percentageValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: APP_CONSTANTS.COLORS.PRIMARY,
  },
  allTimeSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    width: "100%",
    minHeight: 60,
  },
  allTimeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  basketballSection: {
    alignItems: "center",
    marginTop: 8,
  },
  basketballContainer: {
    marginBottom: 8,
  },
  basketballWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  shotCountContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    top: "50%",
    marginTop: 0, // Added top margin
  },
  shotCountText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginTop: 4, // Added a bit of top margin
  },
  playIconOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 11,
  },
  basketballLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
});

export default UserInfoCard;
