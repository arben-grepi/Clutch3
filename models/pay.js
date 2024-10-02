const mongoose = require("../db/MongoDBConnect");
const Joi = require("joi");

const paySchema = new mongoose.Schema({
  contractName: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
  },
  category: {
    type: String,
    required: true,
    enum: ["store", "restaurant", "travel"],
    lowercase: true,
    trim: true,
  },
  age: {
    type: String,
    required: true,
    enum: ["0-2", "3-6", "7-12", "13<", "any"],
    trim: true,
  },
  hourlyRate: Number,
  eveningBonus: {
    amount: {
      type: Number,
      required: true,
    },
    start: {
      type: String, // Kellonaika merkkijonona "HH:MM"-muodossa
      required: true,
    },
    finish: {
      type: String, // Kellonaika merkkijonona "HH:MM"-muodossa
      required: true,
    },
  },
  saturdayBonus: {
    amount: {
      type: Number,
      required: true,
    },
    start: {
      type: String, // Kellonaika merkkijonona "HH:MM"-muodossa
      required: true,
    },
    finish: {
      type: String, // Kellonaika merkkijonona "HH:MM"-muodossa
      required: true,
    },
  },
  sundayBonus: {
    amount: {
      type: Number,
      required: true,
    },
    start: {
      type: String, // Kellonaika merkkijonona "HH:MM"-muodossa
      required: true,
    },
    finish: {
      type: String, // Kellonaika merkkijonona "HH:MM"-muodossa
      required: true,
    },
  },
  nightBonus: {
    amount: {
      type: Number,
      required: true,
    },
    start: {
      type: String, // Kellonaika merkkijonona "HH:MM"-muodossa
      required: true,
    },
    finish: {
      type: String, // Kellonaika merkkijonona "HH:MM"-muodossa
      required: true,
    },
  },
});

const Pay = mongoose.model("Pay", paySchema);

const timeFormat = Joi.string()
  .custom((value, helpers) => {
    if (value === "24:00") {
      // Convert "24:00" to "00:00"
      return "00:00";
    }
    return value;
  })
  .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
  .required();

const bonusSchema = Joi.object({
  amount: Joi.number().required(),
  start: timeFormat,
  finish: timeFormat,
});

const contractSchema = Joi.object({
  contractName: Joi.string().min(3).max(50).required(),
  category: Joi.string()
    .valid("store", "restaurant", "travel")
    .trim()
    .required(),
  age: Joi.string().valid("0-2", "3-6", "7-12", "13<", "any").trim().required(),
  hourlyRate: Joi.number().optional(),
  eveningBonus: bonusSchema,
  saturdayBonus: bonusSchema,
  sundayBonus: bonusSchema,
  nightBonus: bonusSchema,
});

async function validate(reqBody) {
  // Clone the object to avoid modifying the original reference
  const sanitizedBody = { ...reqBody };

  // Remove internal Mongoose properties if they exist
  if (sanitizedBody.$__) delete sanitizedBody.$__;
  if (sanitizedBody._id) delete sanitizedBody._id;
  if (sanitizedBody.__v) delete sanitizedBody.__v;

  try {
    await contractSchema.validateAsync(sanitizedBody);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

exports.Pay = Pay;
exports.validate = validate;
