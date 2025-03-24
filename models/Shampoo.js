const mongoose = require("mongoose");

const ShampooSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  ingredients: {
    harmful: { type: [String], default: [] },
    beneficial: { type: [String], default: [] }
  },
  sustainabilityScore: { type: Number, required: true, min: 0, max: 100 },
  alternatives: { type: [String], default: [] }
});

module.exports = mongoose.model("Shampoo", ShampooSchema);