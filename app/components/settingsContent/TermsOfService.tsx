import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { APP_CONSTANTS } from "../../config/constants";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TermsOfService() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.lastUpdated}>
            Last Updated: {new Date().toLocaleDateString()}
          </Text>

          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>
            By accessing and using Clutch3, you agree to be bound by these Terms
            of Service and all applicable laws and regulations. If you do not
            agree with any of these terms, you are prohibited from using this
            app.
          </Text>

          <Text style={styles.sectionTitle}>2. Use License</Text>
          <Text style={styles.text}>
            Permission is granted to temporarily use Clutch3 for personal,
            non-commercial purposes. This license does not include:
            {"\n\n"}• Modifying or copying the materials
            {"\n"}• Using the materials for commercial purposes
            {"\n"}• Attempting to reverse engineer any software
            {"\n"}• Removing any copyright or proprietary notations
          </Text>

          <Text style={styles.sectionTitle}>3. User Account</Text>
          <Text style={styles.text}>
            To use certain features of the app, you must create an account. You
            are responsible for:
            {"\n\n"}• Maintaining the confidentiality of your account
            {"\n"}• All activities that occur under your account
            {"\n"}• Providing accurate and complete information
          </Text>

          <Text style={styles.sectionTitle}>4. User Content</Text>
          <Text style={styles.text}>
            You retain ownership of content you create, but grant us a license
            to use, modify, and display it. You agree not to post content that:
            {"\n\n"}• Is illegal, harmful, or objectionable
            {"\n"}• Infringes on others' rights
            {"\n"}• Contains malware or harmful code
            {"\n"}• Is spam or unauthorized advertising
          </Text>

          <Text style={styles.sectionTitle}>5. Prohibited Activities</Text>
          <Text style={styles.text}>
            You agree not to:
            {"\n\n"}• Use the app for illegal purposes
            {"\n"}• Harass or abuse other users
            {"\n"}• Interfere with the app's operation
            {"\n"}• Attempt to gain unauthorized access
            {"\n"}• Use automated systems or bots
            {"\n"}• Manipulate or cheat in shot attempts
          </Text>

          <Text style={styles.sectionTitle}>6. Termination</Text>
          <Text style={styles.text}>
            We may terminate or suspend your access to the app immediately,
            without prior notice, for any breach of these Terms of Service.
          </Text>

          <Text style={styles.sectionTitle}>7. Disclaimer</Text>
          <Text style={styles.text}>
            The app is provided "as is" without any warranties. We are not
            responsible for any damages arising from the use or inability to use
            the app.
          </Text>

          <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
          <Text style={styles.text}>
            In no event shall Clutch3 be liable for any damages arising out of
            the use or inability to use the app.
          </Text>

          <Text style={styles.sectionTitle}>9. Changes to Terms</Text>
          <Text style={styles.text}>
            We reserve the right to modify these terms at any time. We will
            notify users of any material changes.
          </Text>

          <Text style={styles.sectionTitle}>10. Contact Information</Text>
          <Text style={styles.text}>
            For questions about these Terms of Service, please contact us at:
            {"\n\n"}arben.grepi@gmail.com
          </Text>
        </View>
      </ScrollView>
    </View>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    fontSize: 20,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    fontSize: 24,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  lastUpdated: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 24,
  },
  sectionTitle: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    fontSize: 18,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginTop: 24,
    marginBottom: 12,
  },
  text: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 24,
  },
});
