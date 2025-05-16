import { View, StyleSheet } from "react-native";
import { useAuth } from "../../context/AuthContext";
import UserCard from "../Profile/UserCard";
import User from "../../models/User";

export default function WelcomeScreen() {
  const { appUser, setAppUser } = useAuth();

  const handleUserUpdate = (updatedUser: User) => {
    setAppUser(updatedUser);
  };

  return (
    <View style={styles.container}>
      {appUser && <UserCard user={appUser} onUserUpdate={handleUserUpdate} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
});
