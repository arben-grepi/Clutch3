import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
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
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!selectedCountry) {
      return;
    }

    if (selectedCountry.code === "united_states" && !selectedState) {
      return;
    }

    setLoading(true);
    try {
      // Determine what to store as the location code
      // For US users, store the state code; for others, store the country code
      const locationCode =
        selectedCountry.code === "united_states" && selectedState
          ? selectedState.code
          : selectedCountry.code;

      // Update user's country in Firestore
      await updateDoc(doc(db, "users", userId), {
        country: locationCode,
      });

      console.log("✅ Country updated successfully:", locationCode);
      onCountrySelected(locationCode);
    } catch (error) {
      console.error("❌ Error updating country:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => {
        setSelectedCountry(item);
        setShowCountryModal(false);
        if (item.code !== "united_states") {
          setSelectedState(null);
        }
      }}
    >
      <Text style={styles.countryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderStateItem = ({ item }: { item: State }) => (
    <TouchableOpacity
      style={styles.stateItem}
      onPress={() => {
        setSelectedState(item);
        setShowStateModal(false);
      }}
    >
      <Text style={styles.stateName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const canSave =
    selectedCountry &&
    (selectedCountry.code !== "united_states" || selectedState !== null);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.mainModalContainer}>
          <View style={styles.mainModalContent}>
            <Text style={styles.title}>Select Your Location</Text>
            <Text style={styles.subtitle}>
              Please select your country to continue. This is required for
              competition eligibility.
            </Text>

            <TouchableOpacity
              style={styles.countrySelector}
              onPress={() => setShowCountryModal(true)}
            >
              <Text
                style={[
                  styles.selectorText,
                  !selectedCountry && styles.placeholderText,
                ]}
              >
                {selectedCountry ? selectedCountry.name : "Select Country"}
              </Text>
              <Ionicons name="chevron-down" size={24} color="#666" />
            </TouchableOpacity>

            {selectedCountry?.code === "united_states" && (
              <TouchableOpacity
                style={styles.stateSelector}
                onPress={() => setShowStateModal(true)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !selectedState && styles.placeholderText,
                  ]}
                >
                  {selectedState ? selectedState.name : "Select State"}
                </Text>
                <Ionicons name="chevron-down" size={24} color="#666" />
              </TouchableOpacity>
            )}

            {loading ? (
              <ActivityIndicator
                size="large"
                color={APP_CONSTANTS.COLORS.PRIMARY}
                style={styles.loader}
              />
            ) : (
              <TouchableOpacity
                style={[styles.saveButton, !canSave && styles.disabledButton]}
                onPress={handleSave}
                disabled={!canSave || loading}
              >
                <Text style={styles.saveButtonText}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={countries}
              renderItem={renderCountryItem}
              keyExtractor={(item) => item.code}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* State Selection Modal */}
      <Modal
        visible={showStateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={states}
              renderItem={renderStateItem}
              keyExtractor={(item) => item.code}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  mainModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  mainModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  countrySelector: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stateSelector: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorText: {
    fontSize: 16,
    color: "#000",
  },
  placeholderText: {
    color: "#999",
  },
  saveButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.5,
  },
  loader: {
    marginVertical: 15,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalList: {
    maxHeight: "100%",
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  countryName: {
    fontSize: 16,
  },
  stateItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  stateName: {
    fontSize: 16,
  },
});

