const mongoose = require("mongoose");
const { Schema } = mongoose;

const routeTemplateSchema = new Schema(
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
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    boardingPoint: {
      type: String,
      required: true,
      trim: true,
    },
    dropPoint: {
      type: String,
      required: true,
      trim: true,
    },
    defaultDepartureTime: {
      type: String,
      required: true,
    },
    defaultArrivalTime: {
      type: String,
      required: true,
    },
    baseFare: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RouteTemplate", routeTemplateSchema);
