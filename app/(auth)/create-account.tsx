import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  SafeAreaView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../../FirebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import User from "../../models/User";
import { Ionicons } from "@expo/vector-icons";
import { countries, states, Country, State } from "../config/locationData";
import { APP_CONSTANTS } from "../config/constants";

export default function CreateAccountScreen() {
  const params = useLocalSearchParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [isGoogleSignIn, setIsGoogleSignIn] = useState(false);
  const { appUser, setAppUser } = useAuth();

  // Pre-fill data from Google Sign-In if available
  useEffect(() => {
    if (params.isGoogleSignIn === "true") {
      setIsGoogleSignIn(true);
      if (params.email) setEmail(params.email as string);
      if (params.firstName) setFirstName(params.firstName as string);
      if (params.lastName) setLastName(params.lastName as string);
    }
  }, [params]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const handleCreateAccount = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    // Capitalize first letter of first name and last name
    const capitalizedFirstName =
      trimmedFirstName.charAt(0).toUpperCase() +
      trimmedFirstName.slice(1).toLowerCase();
    const capitalizedLastName =
      trimmedLastName.charAt(0).toUpperCase() +
      trimmedLastName.slice(1).toLowerCase();

    if (!trimmedFirstName || !trimmedLastName) {
      Alert.alert("Error", "First name and last name are required");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (!validatePhoneNumber(trimmedPhoneNumber)) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    if (!selectedCountry) {
      Alert.alert("Error", "Please select your country");
      return;
    }

    if (selectedCountry.code === "united_states" && !selectedState) {
      Alert.alert("Error", "Please select your state");
      return;
    }

    // Skip password validation for Google Sign-In
    if (!isGoogleSignIn) {
      if (trimmedPassword !== trimmedConfirmPassword) {
        Alert.alert("Error", "Passwords do not match");
        return;
      }

      if (trimmedPassword.length < 6) {
        Alert.alert("Error", "Password must be at least 6 characters long");
        return;
      }
    }

    setLoading(true);
    try {
      let userCredential;
      
      // For Google Sign-In, user is already authenticated
      if (isGoogleSignIn) {
        userCredential = { user: auth.currentUser };
        if (!userCredential.user) {
          throw new Error("No authenticated user found");
        }
      } else {
        // Email/password sign-up
        userCredential = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          trimmedPassword
        );

        // Update the user's display name
        await updateProfile(userCredential.user, {
          displayName: `${capitalizedFirstName} ${capitalizedLastName}`,
        });
      }

      // Determine what to store as the location code
      // For US users, store the state code; for others, store the country code
      const locationCode = selectedCountry.code === "united_states" && selectedState
        ? selectedState.code
        : selectedCountry.code;

      // Store user data in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        firstName: capitalizedFirstName,
        lastName: capitalizedLastName,
        email: trimmedEmail,
        phoneNumber: trimmedPhoneNumber,
        country: locationCode,
        admin: false,
        membership: false,
        staff: false,
        createdAt: new Date(),
        profilePicture: {
          url: null,
        },
        videos: [],
        staffAnswers: [],
        groups: [], // Initialize empty groups array
        hasReviewed: true, // Initialize hasReviewed to true for new users
        hasPendingGroupRequests: false,
        incorrectReviews: 0,
        incorrectUploads: 0,
        lastWarningDate: null,
        suspended: false,
        hasSeenWelcome: false, // New users haven't seen the welcome modal yet
      });

      // Create User object and store in context
      const newUser = new User(
        userCredential.user.uid,
        trimmedEmail,
        capitalizedFirstName,
        capitalizedLastName,
        null
      );
      
      // Set additional properties for new user
      newUser.groups = [];
      newUser.staffAnswers = [];
      newUser.country = locationCode;
      newUser.hasReviewed = true;
      newUser.admin = false;
      newUser.membership = false;
      newUser.staff = false;
      newUser.hasPendingGroupRequests = false;
      newUser.incorrectReviews = 0;
      newUser.incorrectUploads = 0;
      newUser.lastWarningDate = null;
      newUser.suspended = false;
      newUser.hasSeenWelcome = false;
      
      setAppUser(newUser);

      router.replace("/(tabs)" as any);
    } catch (error: any) {
      console.error("❌ CREATE ACCOUNT - Error:", error.code);
      let errorMessage = "Failed to create account. Please try again.";

      if (error.code === "auth/email-already-in-use") {
        errorMessage =
          "This email is already registered. Please use a different email or login.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.replace("/(auth)/auth-method" as any);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Create Account</Text>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={firstName}
          onChangeText={(text) => setFirstName(text.trim())}
          autoCapitalize="words"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={lastName}
          onChangeText={(text) => setLastName(text.trim())}
          autoCapitalize="words"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={(text) => setEmail(text.trim())}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading && !isGoogleSignIn}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number (e.g., +1234567890)"
          value={phoneNumber}
          onChangeText={(text) => setPhoneNumber(text.trim())}
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

        {selectedCountry?.code === "united_states" && (
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

        {!isGoogleSignIn && (
          <>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                value={password}
                onChangeText={(text) => setPassword(text.trim())}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={(text) => setConfirmPassword(text.trim())}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={styles.loader}
          />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleCreateAccount}>
            <Text style={styles.buttonText}>Create Account</Text>
          </TouchableOpacity>
        )}

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 10,
    padding: 10,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    marginTop: 60,
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
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  buttonText: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "bold",
  },
  loader: {
    marginVertical: 15,
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 15,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
    top: 13,
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
