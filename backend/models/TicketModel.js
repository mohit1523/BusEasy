const mongoose = require("mongoose");
const { Schema } = mongoose;

const ticketSchema = new Schema({
  ticketNumber: {
    type: String,
    required: true
  },
  nameOfUsers: {
    type: Array,
    required: true,
  },
  seats: {
    type: Array,
    required: true
  },
  busNumber: {
    type: String,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = mongoose.model("Ticket", ticketSchema);
