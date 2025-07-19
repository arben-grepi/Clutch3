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

export default function PrivacyPolicy() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>
            Last Updated: {new Date().toLocaleDateString()}
          </Text>

          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.text}>
            We collect information that you provide directly to us, including:
            {"\n\n"}• Account information (email, name)
            {"\n"}• User-generated content (photos, videos)
            {"\n"}• Communication data
            {"\n"}• Device information
          </Text>

          <Text style={styles.sectionTitle}>
            2. How We Use Your Information
          </Text>
          <Text style={styles.text}>
            We use the collected information to:
            {"\n\n"}• Provide and maintain our services
            {"\n"}• Process your transactions
            {"\n"}• Send you technical notices and support messages
            {"\n"}• Communicate with you about products, services, and events
            {"\n"}• Improve our services
          </Text>

          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.text}>
            We do not sell your personal information. We may share your
            information with:
            {"\n\n"}• Service providers who assist in our operations
            {"\n"}• Legal authorities when required by law
            {"\n"}• Third parties with your consent
          </Text>

          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.text}>
            We implement appropriate security measures to protect your personal
            information. However, no method of transmission over the internet is
            100% secure.
          </Text>

          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <Text style={styles.text}>
            You have the right to:
            {"\n\n"}• Access your personal information
            {"\n"}• Correct inaccurate data
            {"\n"}• Request deletion of your data
            {"\n"}• Opt-out of marketing communications
          </Text>

          <Text style={styles.sectionTitle}>6. Children's Privacy</Text>
          <Text style={styles.text}>
            Our services are not intended for children under 13. We do not
            knowingly collect personal information from children under 13.
          </Text>

          <Text style={styles.sectionTitle}>7. Changes to This Policy</Text>
          <Text style={styles.text}>
            We may update this privacy policy from time to time. We will notify
            you of any changes by posting the new policy on this page.
          </Text>

          <Text style={styles.sectionTitle}>8. Contact Us</Text>
          <Text style={styles.text}>
            If you have any questions about this Privacy Policy, please contact
            us at:
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
