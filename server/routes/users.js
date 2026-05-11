const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Project = require("../models/Project");
const Submission = require("../models/Submission");
const Evaluation = require("../models/Evaluation");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken, requireRole("admin"));

const ROLE_FILTER = ["student", "supervisor", "admin"];

router.get("/stats", async (_req, res) => {
  try {
    const [
      totalStudents,
      totalSupervisors,
      totalProjects,
      pendingProjects,
      approvedProjects,
      completedProjects,
      totalSubmissions,
      evaluatedProjects,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "supervisor" }),
      Project.countDocuments({}),
      Project.countDocuments({ status: "pending" }),
      Project.countDocuments({ status: "approved" }),
      Project.countDocuments({ status: "completed" }),
      Submission.countDocuments({}),
      Evaluation.countDocuments({ isFinalized: true }),
    ]);

    res.json({
      totalStudents,
      totalSupervisors,
      totalProjects,
      pendingProjects,
      approvedProjects,
      completedProjects,
      totalSubmissions,
      evaluatedProjects,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load stats." });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
    const skip = (page - 1) * limit;

    const query = {};
    const roleParam = req.query.role;
    if (roleParam && ROLE_FILTER.includes(String(roleParam))) {
      query.role = String(roleParam);
    }

    const q = req.query.q != null ? String(req.query.q).trim() : "";
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({ users, page, pages, total, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to list users." });
  }
});

router.patch("/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const { role } = req.body;
    if (!role || !ROLE_FILTER.includes(String(role))) {
      return res.status(400).json({ message: "Valid role is required." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot change role of the only administrator.",
        });
      }
    }

    user.role = role;
    await user.save();

    const updated = await User.findById(id).select("-password");
    res.json({ user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update role." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    if (id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot delete the only administrator.",
        });
      }
    }

    const userId = user._id;

    const relatedProjects = await Project.find({
      $or: [{ student: userId }, { supervisor: userId }],
    })
      .select("_id")
      .lean();
    const projectIds = relatedProjects.map((p) => p._id);

    await Submission.deleteMany({
      $or: [{ student: userId }, { project: { $in: projectIds } }],
    });
    await Evaluation.deleteMany({
      $or: [
        { student: userId },
        { supervisor: userId },
        { project: { $in: projectIds } },
      ],
    });
    await Project.deleteMany({
      $or: [{ student: userId }, { supervisor: userId }],
    });

    await User.findByIdAndDelete(userId);

    res.json({ message: "User and related data deleted.", id: userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete user." });
  }
});

module.exports = router;
