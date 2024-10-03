const express = require("express");
const router = express.Router();
const { User, validateUser } = require("../models/user.js"); // Changed Customer to User

// Middleware to parse JSON bodies
router.use(express.json());

// DEBUGGERS
const debug = require("debug")("app:routes/users.js"); // Updated debug namespace

// GET all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().populate("groups", "name -_id"); // Populate groups
    if (!users) return res.status(404).send("No users found");
    debug("Users found: " + users);
    res.json(users);
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

// GET user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "groups",
      "name -_id"
    ); // Use findById for single user
    if (!user) return res.status(404).send("User with given ID not found");
    debug("User found by given ID: " + user);
    res.json(user);
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

// GET users by group ID
router.get("/group/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const users = await User.find({ groups: id }).populate(
      "groups",
      "name -_id"
    ); // Populate groups
    if (users.length === 0) {
      return res.status(404).send("No users found in the given group");
    }
    debug("Users found in Group ID: ", users);
    res.json(users); // Return the found users as JSON
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

// POST new user
router.post("/", async (req, res) => {
  try {
    // Validate the request body
    debug(req.body);
    const { error } = await validateUser(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    // Create a new User instance
    const user = new User({
      name: req.body.name,
      groups: req.body.groups, // Expect groups to be an array
    });

    // Save the User to the database
    await user.save();

    // Log and return the new user
    debug("New user created:", user);
    res.status(201).send(user);
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

// PUT (update) user
router.put("/:id", async (req, res) => {
  try {
    // Validate the request body
    const { error } = await validateUser(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    // Find the user by ID and update
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, groups: req.body.groups }, // Update groups
      { new: true, runValidators: true }
    ).populate("groups", "name -_id");

    // If the user is not found
    if (!user) {
      return res.status(404).send("User with the given ID was not found.");
    }

    // Log and return the updated user
    debug("User updated:", user);
    res.send(user);
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

module.exports = router;
