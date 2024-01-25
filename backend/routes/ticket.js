const express = require("express");
const router = express.Router();
const Ticket = require("../models/TicketModel");
const User = require("../models/UserModel");
const Bus = require("../models/BusModel");
const verifyUser = require("../middleware/verifyuser");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require('uuid');

router.get("/alltickets", verifyUser, async (req, res) => {
  try {
    const allTickets = await Ticket.find({ user: req.userId });
    res.status(200).send({ tickets: allTickets, msg: "success" });
  } catch (error) {
    res.status(500).send({ msg: `Internal Server Error : ${error.message}` });
  }
});

router.post("/bookticket", verifyUser, async (req, res) => {
  try {
    let currUser = await User.findById(req.userId);
    bcrypt.compare(
      req.body.userPassword,
      currUser.password,
      async function (err, result) {
        if (result) {
          let newTicket = new Ticket({
            ticketNumber: uuidv4(),
            nameOfUsers: req.body.nameOfUsers,
            seats: req.body.seats,
            busNumber: req.body.busNumber,
            user: currUser._id,
          });
          await newTicket.save();
          let busToUpdate = await Bus.findOne({busNumber : req.body.busNumber});
          let busSeatArr = busToUpdate.seatAllocated.concat(req.body.seats);

          await Bus.findOneAndUpdate({busNumber: req.body.busNumber},{seatAllocated: busSeatArr});

          res.status(200).send({ msg: "Ticket Booked Successfully!!" });
        } else {
          res.status(500).send({ msg: "Wrong Password" });
        }
      }
    );
  } catch (error) {
    res.status(500).send({ msg: `Internal Server Error : ${error.message}` });
  }
});

router.delete("/deleteticket", verifyUser, async (req, res) => {
  try {
    let currUser = await User.findById(req.userId);
    bcrypt.compare(
      req.body.userPassword,
      currUser.password,
      async function (err, result) {
        if (result) {
          await Ticket.deleteOne({ _id: req.body.ticketId });
          await Bus.updateOne({busNumber: req.body.busNumber}, {$pullAll : {seatAllocated: req.body.seats}});
          res.status(200).send({ msg: "Ticket Cancel Successfully" });
        } else {
          res.status(401).send({ msg: "Wrong Password" });
        }
      }
    );
  } catch (error) {
    res.status(500).send({ msg: `Internal Server Error : ${error.message}` });
  }
});

module.exports = router;
