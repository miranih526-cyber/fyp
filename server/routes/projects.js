const express = require("express");
const mongoose = require("mongoose");
const Project = require("../models/Project");
const User = require("../models/User");
const Submission = require("../models/Submission");
const Evaluation = require("../models/Evaluation");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const STATUS_VALUES = ["pending", "approved", "rejected", "in_progress", "completed"];

router.use(verifyToken);

const populateFields = [
  { path: "student", select: "name rollNo email" },
  { path: "supervisor", select: "name email" },
];

function idEquals(ref, userId) {
  if (!ref) return false;
  const rid = ref._id ? ref._id.toString() : ref.toString();
  return rid === userId;
}

function canAccessProject(project, reqUser) {
  if (reqUser.role === "admin") return true;
  if (reqUser.role === "student") {
    return idEquals(project.student, reqUser.id);
  }
  if (reqUser.role === "supervisor") {
    return idEquals(project.supervisor, reqUser.id);
  }
  return false;
}

function assertSupervisorPatch(project, reqUser) {
  if (reqUser.role === "admin") return true;
  if (reqUser.role === "supervisor") {
    return idEquals(project.supervisor, reqUser.id);
  }
  return false;
}

router.post("/", requireRole("student"), async (req, res) => {
  try {
    const { title, description, technologies, expectedEndDate } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required.",
      });
    }

    const existing = await Project.countDocuments({
      student: req.user.id,
      status: { $in: ["pending", "approved"] },
    });
    if (existing > 0) {
      return res.status(409).json({
        message:
          "You already have a project in pending or approved status. Complete or resolve it before submitting another.",
      });
    }

    const techList = Array.isArray(technologies)
      ? technologies.map((t) => String(t).trim()).filter(Boolean)
      : typeof technologies === "string"
        ? technologies
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    let expectedEnd = undefined;
    if (expectedEndDate) {
      const d = new Date(expectedEndDate);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ message: "Invalid expected end date." });
      }
      expectedEnd = d;
    }

    const project = await Project.create({
      title: String(title).trim(),
      description: String(description).trim(),
      student: req.user.id,
      status: "pending",
      technologies: techList,
      startDate: new Date(),
      expectedEndDate: expectedEnd,
    });

    const populated = await Project.findById(project._id).populate(populateFields);
    res.status(201).json({ project: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create project." });
  }
});

router.get("/", async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "student") {
      query.student = req.user.id;
    } else if (req.user.role === "supervisor") {
      query.supervisor = req.user.id;
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden." });
    }

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .populate(populateFields);
    res.json({ projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch projects." });
  }
});

/** Must stay before `GET /:id` so "notifications" is not parsed as an id. */
router.get("/notifications", async (req, res) => {
  try {
    const notifications = [];
    const uid = req.user.id;
    const { role } = req.user;

    if (role === "admin") {
      const pending = await Project.countDocuments({ status: "pending" });
      if (pending > 0) {
        notifications.push({
          id: "admin-pending-approvals",
          type: "warning",
          message: `${pending} project proposal(s) await approval`,
          createdAt: new Date().toISOString(),
        });
      }
      const unassigned = await Project.countDocuments({
        status: { $in: ["pending", "approved"] },
        $or: [{ supervisor: null }, { supervisor: { $exists: false } }],
      });
      if (unassigned > 0) {
        notifications.push({
          id: "admin-unassigned-supervisor",
          type: "info",
          message: `${unassigned} project(s) still need a supervisor assigned`,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (role === "supervisor") {
      const projects = await Project.find({ supervisor: uid }).select("_id title status").lean();
      const pids = projects.map((p) => p._id);
      if (pids.length) {
        const pendingDocs = await Submission.countDocuments({
          project: { $in: pids },
          $or: [{ supervisorReviewed: false }, { supervisorReviewed: { $exists: false } }],
        });
        if (pendingDocs > 0) {
          notifications.push({
            id: "sup-pending-docs",
            type: "warning",
            message: `${pendingDocs} document submission(s) need your review`,
            createdAt: new Date().toISOString(),
          });
        }
      }
      for (const p of projects) {
        if (!["approved", "in_progress"].includes(p.status)) continue;
        const fin = await Evaluation.findOne({ project: p._id, isFinalized: true }).select("_id").lean();
        if (!fin) {
          notifications.push({
            id: `sup-eval-${p._id}`,
            type: "info",
            message: `Complete evaluation for “${p.title}”`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } else if (role === "student") {
      const proj = await Project.findOne({ student: uid }).sort({ createdAt: -1 }).lean();
      if (proj) {
        if (proj.status === "pending") {
          notifications.push({
            id: `stu-pending-${proj._id}`,
            type: "info",
            message: `Proposal “${proj.title}” is pending admin approval`,
            createdAt: new Date().toISOString(),
          });
        } else if (proj.status === "rejected") {
          notifications.push({
            id: `stu-rejected-${proj._id}`,
            type: "error",
            message: `Proposal “${proj.title}” was rejected`,
            createdAt: new Date().toISOString(),
          });
        } else if (proj.status === "approved" || proj.status === "in_progress") {
          notifications.push({
            id: `stu-active-${proj._id}`,
            type: "success",
            message: `Proposal “${proj.title}” is ${String(proj.status).replace("_", " ")}`,
            createdAt: new Date().toISOString(),
          });
        }
        const finalized = await Evaluation.findOne({ project: proj._id, isFinalized: true }).select("grade").lean();
        if (finalized) {
          notifications.push({
            id: `stu-grade-${proj._id}`,
            type: "success",
            message: `Final grade published: ${finalized.grade}`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    res.json({ notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load notifications." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid project id." });
    }

    const project = await Project.findById(id).populate(populateFields);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const allowed = canAccessProject(project, req.user);
    if (!allowed) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch project." });
  }
});

router.patch("/:id/status", requireRole("admin", "supervisor"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid project id." });
    }

    const { status, rejectionReason, supervisorId } = req.body;
    if (!status || !STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: "Valid status is required." });
    }

    const project = await Project.findById(id).populate(populateFields);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const canPatch = assertSupervisorPatch(project, req.user);
    if (!canPatch) {
      return res.status(403).json({
        message: "You can only update projects assigned to you.",
      });
    }

    project.status = status;
    if (status === "rejected") {
      project.rejectionReason = rejectionReason
        ? String(rejectionReason).trim()
        : "";
    } else {
      project.rejectionReason = "";
    }

    if (status === "approved" && supervisorId) {
      if (!mongoose.isValidObjectId(supervisorId)) {
        return res.status(400).json({ message: "Invalid supervisor id." });
      }
      const supervisorUser = await User.findById(supervisorId);
      if (!supervisorUser || supervisorUser.role !== "supervisor") {
        return res.status(400).json({
          message: "supervisorId must reference a user with role supervisor.",
        });
      }
      project.supervisor = supervisorId;
    }

    await project.save();
    const updated = await Project.findById(project._id).populate(populateFields);
    res.json({ project: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update project status." });
  }
});

router.patch("/:id/assign", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid project id." });
    }

    const { supervisorId } = req.body;
    if (!supervisorId || !mongoose.isValidObjectId(supervisorId)) {
      return res.status(400).json({ message: "Valid supervisorId is required." });
    }

    const supervisorUser = await User.findById(supervisorId);
    if (!supervisorUser || supervisorUser.role !== "supervisor") {
      return res.status(400).json({
        message: "supervisorId must reference a user with role supervisor.",
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    project.supervisor = supervisorId;
    await project.save();

    const updated = await Project.findById(project._id).populate(populateFields);
    res.json({ project: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to assign supervisor." });
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid project id." });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    await Submission.deleteMany({ project: id });
    await Evaluation.deleteMany({ project: id });
    await Project.findByIdAndDelete(id);

    res.json({ message: "Project deleted.", id: project._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete project." });
  }
});

module.exports = router;
