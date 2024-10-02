const Joi = require("joi");
const mongoose = require("mongoose");
const { Pay } = require("./pay");

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
  },
  pay: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pay",
  },
});

const Customer = mongoose.model("Customer", customerSchema);

const customerValidationSchema = Joi.object({
  name: Joi.string().min(5).max(50).required(),
});

async function validateCustomer(customer) {
  const sanitizedBody = { ...customer };

  // Remove internal Mongoose properties if they exist
  if (sanitizedBody.$__) delete sanitizedBody.$__;
  if (sanitizedBody._id) delete sanitizedBody._id;
  if (sanitizedBody.__v) delete sanitizedBody.__v;
  if (sanitizedBody.pay) delete sanitizedBody.pay;
  try {
    await customerValidationSchema.validateAsync(sanitizedBody);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

exports.Customer = Customer;
exports.validateCustomer = validateCustomer;
