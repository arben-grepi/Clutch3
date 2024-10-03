// Import necessary models
const { Group, validateGroup } = require("../models/group.js");
const { User, validateUser } = require("../models/user.js");

// Create Group instances for basketball clubs
const basketballClubA = new Group({
  name: "Basketball Club A",
  endDate: new Date("2024-12-31"),
  shootingSpot: "threepointer",
});

const basketballClubB = new Group({
  name: "Basketball Club B",
  endDate: new Date("2024-12-31"),
  shootingSpot: "freethrow",
});

// Function to validate and save Groups
async function validateAndSaveGroup(groupObject) {
  try {
    const groupObjectData = groupObject.toObject();
    const { error } = await validateGroup(groupObjectData);
    if (error) {
      console.error("Validation error:", error.details[0].message);
      return; // Exit the function if validation fails
    }

    const savedGroup = await groupObject.save();
    console.log("Group saved successfully:", savedGroup);
    return savedGroup; // Return the saved group object
  } catch (err) {
    console.error("Error while saving group:", err);
  }
}

async function validateAndSaveUser(userObj) {
  try {
    const userObjData = userObj.toObject();
    const { error } = await validateUser(userObjData); // This will now skip validation
    if (error) {
      console.error("Validation User error:", error);
      return;
    }
    const savedUser = await userObj.save(); // Save the user to the database
    console.log("User saved successfully:", savedUser);
    return savedUser;
  } catch (err) {
    console.error("Error:", err);
  }
}

async function createDatabase() {
  try {
    const clubAResult = await validateAndSaveGroup(basketballClubA);
    if (!clubAResult) throw new Error("Failed to save Basketball Club A.");

    const clubBResult = await validateAndSaveGroup(basketballClubB);
    if (!clubBResult) throw new Error("Failed to save Basketball Club B.");

    // Create User instances
    const user1 = new User({
      name: "John Smith",
      groups: [clubAResult._id, clubBResult._id], // Use ObjectId directly
    });

    const user2 = new User({
      name: "Mosh Hamedani",
      groups: [clubBResult._id], // Use ObjectId directly
    });

    // Validate and save Users
    await validateAndSaveUser(user1);
    await validateAndSaveUser(user2);
  } catch (error) {
    console.error("Error during group creation:", error);
  }
}

createDatabase();
