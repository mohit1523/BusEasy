const mongoose = require("mongoose");
const { Schema } = mongoose;

const vehicleSchema = new Schema(
  {
    operator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    busNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seatCount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
