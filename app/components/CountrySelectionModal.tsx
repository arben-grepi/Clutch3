import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { countries, states, Country, State } from "../config/locationData";
import { APP_CONSTANTS } from "../config/constants";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

interface CountrySelectionModalProps {
  visible: boolean;
  userId: string;
  onCountrySelected: (country: string) => void;
}

export default function CountrySelectionModal({
  visible,
  userId,
  onCountrySelected,
}: CountrySelectionModalProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStates, setShowStates] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedCountry(null);
      setSelectedState(null);
      setShowStates(false);
    }
  }, [visible]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    if (country.code === "united_states") {
      // Show states list for US
      setShowStates(true);
      setSelectedState(null);
    } else {
      // For non-US countries, save immediately
      handleSave(country.code);
    }
  };

  const handleStateSelect = (state: State) => {
    setSelectedState(state);
    // Save immediately after state selection
    if (selectedCountry) {
      handleSave(state.code);
    }
  };

  const handleSave = async (locationCode: string) => {
    setLoading(true);
    try {
      // Update user's country in Firestore
      await updateDoc(doc(db, "users", userId), {
        country: locationCode,
      });

      onCountrySelected(locationCode);
    } catch (error) {
      console.error("❌ Error updating country:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => handleCountrySelect(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.listItemText}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  const renderStateItem = ({ item }: { item: State }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => handleStateSelect(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.listItemText}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        // Prevent closing without selection
      }}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {showStates ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setShowStates(false);
                setSelectedState(null);
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
          <Text style={styles.title}>
            {showStates ? "Select State" : "Select Country"}
          </Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={APP_CONSTANTS.COLORS.PRIMARY}
            />
            <Text style={styles.loadingText}>Saving...</Text>
          </View>
        ) : (
          <FlatList
            data={showStates ? states : countries}
            renderItem={showStates ? renderStateItem : renderCountryItem}
            keyExtractor={(item) => item.code}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    ...Platform.select({
      ios: {
        paddingTop: 10,
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonPlaceholder: {
    width: 40,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  listItemText: {
    fontSize: 16,
    color: "#000",
    flex: 1,
    marginRight: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
});
