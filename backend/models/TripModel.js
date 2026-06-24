const mongoose = require("mongoose");
const { Schema } = mongoose;

const seatHoldSchema = new Schema(
  {
    seatNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const tripSchema = new Schema(
  {
    operator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    routeTemplate: {
      type: Schema.Types.ObjectId,
      ref: "RouteTemplate",
      required: true,
    },
    travelDate: {
      type: String,
      required: true,
    },
    departureTime: {
      type: String,
      required: true,
    },
    arrivalTime: {
      type: String,
      required: true,
    },
    fare: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    bookedSeats: {
      type: [Number],
      default: [],
    },
    seatHolds: {
      type: [seatHoldSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "published", "cancelled", "completed"],
      default: "draft",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trip", tripSchema);
