const dbDebugger = require("debug")("app:db");

const mongoose = require("mongoose");
mongoose
  .connect("mongodb://localhost/clutch3")
  .then(() => dbDebugger("Connected to MongoDB"))
  .catch((err) => console.log("Could not connect to MongoDB: ", err));

module.exports = mongoose;
