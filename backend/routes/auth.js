const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");
const { authenticate, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

const createToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!String(name || "").trim() || !String(email || "").trim() || !password || !role) {
      return res.status(400).send({ msg: "All fields are required" });
    }

    if (String(password).length < 6) {
      return res.status(400).send({ msg: "Password must be at least 6 characters long" });
    }

    if (!["passenger", "operator"].includes(role)) {
      return res.status(400).send({ msg: "Invalid signup role" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).send({ msg: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      role,
      approvalStatus: role === "operator" ? "pending" : "approved",
    });

    const token = createToken(user);

    return res.status(201).send({
      msg:
        role === "operator"
          ? "Operator account created and pending admin approval"
          : "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: String(email || "").toLowerCase() });
    if (!user) {
      return res.status(401).send({ msg: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ msg: "Invalid email or password" });
    }

    if (user.role === "operator" && user.approvalStatus !== "approved") {
      return res.status(403).send({ msg: "Operator account is awaiting admin approval" });
    }

    const token = createToken(user);

    return res.status(200).send({
      msg: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).send({ msg: "User not found" });
    }

    return res.status(200).send(user);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.post("/bootstrap-admin", async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      return res.status(409).send({ msg: "Admin already exists" });
    }

    const { name, email, password } = req.body;
    if (!String(name || "").trim() || !String(email || "").trim() || !password) {
      return res.status(400).send({ msg: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      role: "admin",
      approvalStatus: "approved",
    });

    return res.status(201).send({
      msg: "Admin account created",
      token: createToken(admin),
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        approvalStatus: admin.approvalStatus,
      },
    });
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

module.exports = router;
