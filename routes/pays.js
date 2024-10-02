const express = require("express");
const router = express.Router();
const { Pay, validate } = require("../models/pay.js");

// Middleware to parse JSON bodies
router.use(express.json());

//DEBUGGERS
const debug = require("debug")("app:routes/pays.js");

router.get("/", async (req, res) => {
  try {
    const pays = await Pay.find();
    debug("Pays: " + pays);
    res.json(pays);
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const pay = await Pay.find({ _id: req.params.id });
    debug("Pay found by Id: " + pay);
    res.json(pay);
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

router.get("/category/:category", async (req, res) => {
  try {
    const pays = await Pay.find({ category: req.params.category });
    debug("Pays found by category: " + pays);
    res.json(pays);
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

router.post("/", async (req, res) => {
  try {
    // Validate request body
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Create new pay object
    const newPay = new Pay({
      contractName: req.body.contractName,
      category: req.body.category,
      age: req.body.age,
      hourlyRate: req.body.hourlyRate,
      eveningBonus: req.body.eveningBonus,
      saturdayBonus: req.body.saturdayBonus,
      sundayBonus: req.body.sundayBonus,
      nightBonus: req.body.nightBonus,
    });

    // Save the new pay object
    const savedPay = await newPay.save();
    debug("Pay saved: " + savedPay);

    res.send(savedPay); // Respond with the saved pay object
  } catch (err) {
    console.error("Error creating pay:", err);
    res.status(500).send("Error creating pay"); // Respond with an error status and message
  }
});

router.put("/:id", async (req, res) => {
  if (!req.params.id) return res.status(404).send("ID not provided");

  try {
    // Retrieve pay object by ID using Mongoose
    const pay = await Pay.findById(req.params.id);

    if (!pay) return res.status(404).send("Pay not found");

    // Validate request body
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Update pay object properties
    pay.contractName = req.body.contractName;
    pay.category = req.body.category;
    pay.age = req.body.age;
    pay.hourlyRate = req.body.hourlyRate;
    pay.eveningBonus = req.body.eveningBonus;
    pay.saturdayBonus = req.body.saturdayBonus;
    pay.sundayBonus = req.body.sundayBonus;
    pay.nightBonus = req.body.nightBonus;

    // Save the updated pay object
    const updatedPay = await pay.save();
    debug("Pay updated: " + updatedPay);
    res.send(updatedPay); // Respond with the updated pay object
  } catch (err) {
    console.error("Error updating pay:", err);
    res.status(500).send("Error updating pay"); // Respond with an error status and message
  }
});

router.delete("/:id", async (req, res) => {
  if (!req.params.id) return res.status(404).send("ID not provided");
  try {
    // Retrieve pay object by ID using Mongoose
    const pay = await Pay.findById(req.params.id);
    if (!pay) return res.status(404).send("Pay not found");

    // Delete the pay object
    const result = await pay.deleteOne();
    debug("Pay deleted result: " + result);

    if (result.deletedCount === 1) {
      res.send("Pay deleted successfully");
    } else {
      res.status(404).send("Pay not found");
    }
  } catch (err) {
    console.error("Error deleting pay:", err);
    res.status(500).send("Error deleting pay");
  }
});

module.exports = router;
