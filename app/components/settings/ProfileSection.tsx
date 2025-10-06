import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { countries, states, Country, State } from "../../config/locationData";
import { Ionicons } from "@expo/vector-icons";
import User from "../../../models/User";

export default function ProfileSection() {
  const { appUser, setAppUser } = useAuth();
  const [firstName, setFirstName] = useState(appUser?.firstName || "");
  const [lastName, setLastName] = useState(appUser?.lastName || "");
  const [email, setEmail] = useState(appUser?.email || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const handleUpdateProfile = async () => {
    if (!appUser) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      Alert.alert("Error", "First name and last name are required");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (trimmedPhoneNumber && !validatePhoneNumber(trimmedPhoneNumber)) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: `${trimmedFirstName} ${trimmedLastName}`,
        });
      }

      // Update Firestore document
      const userRef = doc(db, "users", appUser.id);
      const updateData: any = {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
      };

      if (trimmedPhoneNumber) {
        updateData.phoneNumber = trimmedPhoneNumber;
      }

      if (selectedCountry) {
        updateData.country = selectedCountry.code;
        if (selectedCountry.code === "US" && selectedState) {
          updateData.state = selectedState.code;
        }
      }

      await updateDoc(userRef, updateData);

      // Update local user state
      const updatedUser = new User(
        appUser.id,
        trimmedEmail,
        trimmedFirstName,
        trimmedLastName,
        appUser.profilePicture,
        appUser.videos
      );
      
      // Preserve additional properties
      updatedUser.groups = appUser.groups || [];
      updatedUser.staffAnswers = appUser.staffAnswers || [];
      updatedUser.country = appUser.country || "";
      updatedUser.hasReviewed = appUser.hasReviewed || false;
      
      setAppUser(updatedUser);

      Alert.alert("Success", "Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
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
        if (item.code !== "US") {
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <TextInput
        style={styles.input}
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number (e.g., +1234567890)"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        editable={!loading}
      />
      <TouchableOpacity
        style={styles.countrySelector}
        onPress={() => setShowCountryModal(true)}
      >
        <Text style={styles.selectorText}>
          {selectedCountry ? selectedCountry.name : "Select Country"}
        </Text>
        <Ionicons name="chevron-down" size={24} color="#666" />
      </TouchableOpacity>

      {selectedCountry?.code === "US" && (
        <TouchableOpacity
          style={styles.stateSelector}
          onPress={() => setShowStateModal(true)}
        >
          <Text style={styles.selectorText}>
            {selectedState ? selectedState.name : "Select State"}
          </Text>
          <Ionicons name="chevron-down" size={24} color="#666" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleUpdateProfile}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Updating..." : "Update Profile"}
        </Text>
      </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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
