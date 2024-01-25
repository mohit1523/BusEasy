const mongoose = require("mongoose");
const { Schema } = mongoose;

const busSchema = new Schema({
  busNumber: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  numOfSeats: {
    type: Number,
    required: true,
  },
  timeTo: {
    type: String,
    required: true,
  },
  timeFrom: {
    type: String,
    required: true,
  },
  seatAllocated: {
    type: Array,
    default: []
  }
});

module.exports = mongoose.model("Bus", busSchema);
