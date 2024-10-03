const mongoose = require("../db/MongoDBConnect");
const Joi = require("joi");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
  },
  endDate: {
    type: Date,
    required: true,
  },
  shootingSpot: {
    type: String,
    required: true,
    enum: ["threepointer", "freethrow", "halfcourt"],
    trim: true,
  },
});

const Group = mongoose.model("Group", groupSchema);

// Validation schema using Joi
const groupValidationSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  endDate: Joi.date().required(),
  shootingSpot: Joi.string()
    .valid("threepointer", "freethrow", "halfcourt")
    .required(),
});

async function validateGroup(group) {
  const sanitizedBody = { ...group };

  if (sanitizedBody.$__) delete sanitizedBody.$__;
  if (sanitizedBody._id) delete sanitizedBody._id;
  if (sanitizedBody.__v) delete sanitizedBody.__v;

  try {
    await groupValidationSchema.validateAsync(sanitizedBody);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

exports.Group = Group;
exports.validateGroup = validateGroup;
