const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

const signToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  rollNo: user.rollNo || "",
  department: user.department || "Software Engineering",
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, rollNo, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    const allowedRoles = ["student", "supervisor"];
    const safeRole =
      role && allowedRoles.includes(role) ? role : "student";

    if (safeRole === "student" && (!rollNo || String(rollNo).trim() === "")) {
      return res.status(400).json({
        message: "Roll number is required for students.",
      });
    }

    const emailNorm = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: emailNorm,
      password,
      role: safeRole,
      rollNo: safeRole === "student" ? String(rollNo).trim() : "",
      department:
        department && String(department).trim()
          ? String(department).trim()
          : "Software Engineering",
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already registered." });
    }
    res.status(500).json({ message: "Server error during registration." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signToken(user);
    res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during login." });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
