import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
} from "react-native";

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
}

const contacts: ContactInfo[] = [
  {
    name: "Clutch3 Support",
    email: "clutch3.info@gmail.com",
    phone: "",
  },
];

const ContactSection: React.FC = () => {
  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Contact Information</Text>
      {contacts.map((contact, index) => (
        <View key={index} style={styles.contactContainer}>
          <Text style={styles.name}>{contact.name}</Text>
          <TouchableOpacity onPress={() => handleEmailPress(contact.email)}>
            <Text style={styles.contactText}>{contact.email}</Text>
          </TouchableOpacity>
          {contact.phone && (
            <TouchableOpacity onPress={() => handlePhonePress(contact.phone)}>
              <Text style={styles.contactText}>{contact.phone}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  contactContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 2,
  },
});

export default ContactSection;
