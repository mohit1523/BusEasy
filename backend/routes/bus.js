const express = require("express");
const router = express.Router();
const Bus = require("../models/BusModel");
const verifyUser = require("../middleware/verifyuser");

router.get("/allbuses", async (req, res) => {
  try {
    const allBuses = await Bus.find();
    res.status(200).send(allBuses);
  } catch (error) {
    console.error(error);
  }
});

router.post("/createbus", verifyUser, async (req, res) => {
  try {
    const b = await Bus.findOne({ busNumber: req.body.busNumber });
    if (b) {
      return res.status(201).send({ msg: "Bus already exists" });
    }
    let newBus = new Bus({
      busOwner: req.userId,
      busNumber: req.body.busNumber,
      name: req.body.name,
      from: req.body.from,
      to: req.body.to,
      numOfSeats: req.body.numOfSeats,
      timeTo: req.body.timeTo,
      timeFrom: req.body.timeFrom,
    });

    await newBus.save();
    res.status(200).send({ msg: "Bus Created" });
  } catch (error) {
    console.error(error);
  }
});

router.post("/findbuses", async (req, res) => {
  try {
    const requiresBuses = await Bus.find({
      from: req.body.from,
      to: req.body.to,
    });
    res.status(200).send(requiresBuses);
  } catch (error) {
    console.error(error);
  }
});

router.post("/findbus", async (req, res) => {
  try {
    const requiresBuses = await Bus.findOne({
      busNumber: req.body.busNumber
    });
    res.status(200).send(requiresBuses);
  } catch (error) {
    console.error(error);
  }
});

module.exports = router;
