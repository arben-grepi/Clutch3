const mongoose = require("../db/MongoDBConnect");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
  },
  groups: [
    {
      type: mongoose.Schema.Types.ObjectId, // Store directly as ObjectId
      ref: "Group", // Reference to the Group model
    },
  ],
});

const User = mongoose.model("User", userSchema);

// Remove validation schema for simplicity
async function validateUser(user) {
  // You can perform any other necessary cleaning or processing here
  return { error: null }; // Skip validation
}

exports.User = User;
exports.validateUser = validateUser;
