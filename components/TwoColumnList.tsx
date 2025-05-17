import React from "react";
import { StyleSheet, Text, View, FlatList, RefreshControl } from "react-native";

interface FileDocument {
  id: string;
  fileType?: string;
  status?: string;
  createdAt?: string;
  url?: string;
  videoLength?: number;
  shots?: number;
  userId: string;
  userName?: string;
}

interface TwoColumnListProps {
  data: FileDocument[];
  refreshing: boolean;
  onRefresh: () => void;
}

export default function TwoColumnList({
  data,
  refreshing,
  onRefresh,
}: TwoColumnListProps) {
  const renderFileItem = ({ item }: { item: FileDocument }) => {
    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString()
      : "No date";
    return (
      <View style={styles.fileItem}>
        <Text style={styles.fileDate}>{date}</Text>
        <View style={styles.shotsContainer}>
          <Text style={styles.shotsLabel}>Shots:</Text>
          <Text style={styles.fileStats}>{item.shots || 0}/10</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.filesListContainer}>
      <Text style={styles.filesListTitle}>Recent Sessions</Text>
      <FlatList
        data={data}
        renderItem={renderFileItem}
        keyExtractor={(item) => item.id}
        style={styles.filesList}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filesListContainer: {
    marginTop: 10,
    flex: 1,
    width: "90%",
    alignSelf: "center",
  },
  filesListTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  filesList: {
    flex: 1,
  },
  fileItem: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  fileDate: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    minWidth: 80,
  },
  shotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  shotsLabel: {
    fontSize: 14,
    color: "#666",
    width: 50,
  },
  fileStats: {
    fontSize: 14,
    color: "#666",
  },
});
