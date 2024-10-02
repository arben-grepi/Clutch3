const express = require("express");
const router = express.Router();
const { Customer, validateCustomer } = require("../models/customer.js");

// Middleware to parse JSON bodies
router.use(express.json());

//DEBUGGERS
const debug = require("debug")("app:routes/customers.js");

router.get("/", async (req, res) => {
  try {
    const customers = await Customer.find().populate(
      "pay",
      "contractName -_id"
    );
    if (!customers) return res.status(404).send("No customer found");
    debug("Customers found: " + customers);
    res.json(customers);
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.find({ _id: req.params.id }).populate(
      "pay",
      "contractName -_id"
    );
    if (!customer)
      return res.status(404).send("Customer with given ID not found");
    debug("Customer found by given ID: " + customer);
    res.json(customer);
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

router.get("/pay/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const customers = await Customer.find({ pay: id }).populate(
      "pay",
      "contractName -_id"
    );
    if (customers.length === 0) {
      return res.status(404).send("Customer with given ID not found");
    }
    debug("Customers found with Pay ID: ", customers);
    res.json(customers); // Return the found customers as JSON
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

router.post("/", async (req, res) => {
  try {
    // Validate the request body
    debug(req.body);
    const { error } = await validateCustomer(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    // Create a new Customer instance
    const customer = new Customer({
      name: req.body.name,
      pay: req.body.pay,
    });

    // Save the Customer to the database
    await customer.save();

    // Log and return the new customer
    debug("New customer created:", customer);
    res.status(201).send(customer);
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

router.put("/:id", async (req, res) => {
  try {
    // Validate the request body
    const { error } = await validateCustomer(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    // Find the customer by ID and update
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, pay: req.body.pay },
      { new: true, runValidators: true }
    ).populate("pay", "contractName -_id");

    // If the customer is not found
    if (!customer) {
      return res.status(404).send("Customer with the given ID was not found.");
    }

    // Log and return the updated customer
    debug("Customer updated:", customer);
    res.send(customer);
  } catch (err) {
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

module.exports = router;
