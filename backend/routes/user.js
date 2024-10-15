const express = require("express");
const router = express.Router();
const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const privateKey = "Mohit1502@#";

router.post("/createuser", async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email, role: req.body.role });

    if (existingUser) {
      return res.status(201).send({
        msg: "User doesn't exists. Try again",
      });
    } else {
      bcrypt.hash(req.body.password, 10, async function (err, hash) {
        // Store hash in your password DB
        let newUser = await User.create({
          name: req.body.name,
          email: req.body.email,
          password: hash,
          role: req.body.role
        });

        const payload = {
          userId: newUser.id,
        };
        const token = jwt.sign(payload, privateKey);

        if (req.body.name === 'admin' && req.body.role === 'admin' && req.body.email === 'admin@gmail.com') {
          return res.status(200).send({ msg: "Admin Created", token: token });
        }
        else if (req.body.role === 'busOwner') {
          return res.status(200).send({ msg: "Bus Owner Created", token: token });
        }

        return res.status(200).send({ msg: "User Created", token: token });
      });
    }
  } catch (error) {
    console.error(error);
  }
});

router.post("/loginuser", async (req, res) => {
  try {
    const existingUser = await User.findOne({
      email: req.body.email,
    });

    if (existingUser) {
      bcrypt.compare(
        req.body.password,
        existingUser.password,
        function (err, result) {
          if (result && existingUser.name === "admin") {
            res.status(201).send({ msg: "Admin Logged in" });
          } else if (result) {
            const payload = {
              userId: existingUser._id,
            };
            const token = jwt.sign(payload, privateKey);
            res.status(201).send({ msg: "Logged in", token: token });
          } else {
            return res.status(201).send({ msg: "Wrong Password" });
          }
        }
      );
    } else {
      return res.status(201).send({ msg: "Invalid details" });
    }
  } catch (error) {
    console.error(error);
  }
});

router.get('/getOwners', async (req, res) => {
  const owners = await User.find({ role: "busOwner" });

  if (owners.length === 0) {
    return res.status(204).send({ hasOwners: false });
  }

  return res.status(200).send({owners: owners, hasOwners: true});
})

module.exports = router;
