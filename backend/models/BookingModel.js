const mongoose = require("mongoose");
const { Schema } = mongoose;

const passengerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    seatNumber: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const bookingSchema = new Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
    },
    trip: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    operator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    passengers: {
      type: [passengerSchema],
      required: true,
      validate: [(value) => value.length > 0, "At least one passenger is required"],
    },
    totalFare: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "confirmed",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "initiated", "paid", "failed"],
      default: "unpaid",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
