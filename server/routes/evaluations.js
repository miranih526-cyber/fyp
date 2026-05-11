const express = require("express");
const mongoose = require("mongoose");
const Evaluation = require("../models/Evaluation");
const Project = require("../models/Project");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken);

const MARK_KEYS = ["proposal", "implementation", "documentation", "presentation"];

const evaluationPopulate = [
  { path: "project", select: "title status description student supervisor" },
  { path: "student", select: "name rollNo email" },
  { path: "supervisor", select: "name email" },
];

function idEquals(ref, userId) {
  if (!ref) return false;
  const rid = ref._id ? ref._id.toString() : ref.toString();
  return rid === userId;
}

function canAccessProject(project, reqUser) {
  if (!reqUser || !project) return false;
  if (reqUser.role === "admin") return true;
  if (reqUser.role === "student") {
    return idEquals(project.student, reqUser.id);
  }
  if (reqUser.role === "supervisor") {
    return idEquals(project.supervisor, reqUser.id);
  }
  return false;
}

function parseMarks(body) {
  const raw = body.marks || {};
  const marks = {};
  for (const key of MARK_KEYS) {
    const n = Number(raw[key]);
    if (Number.isNaN(n)) {
      return { error: `Invalid number for marks.${key}.` };
    }
    if (n < 0 || n > 25) {
      return { error: `Each mark must be between 0 and 25 (${key}).` };
    }
    marks[key] = n;
  }
  return { marks };
}

router.get("/supervisor/all", requireRole("supervisor"), async (req, res) => {
  try {
    const evaluations = await Evaluation.find({ supervisor: req.user.id })
      .sort({ evaluatedAt: -1 })
      .populate(evaluationPopulate);
    res.json({ evaluations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch evaluations." });
  }
});

router.get("/admin/all", requireRole("admin"), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [evaluations, total] = await Promise.all([
      Evaluation.find({})
        .sort({ evaluatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(evaluationPopulate),
      Evaluation.countDocuments({}),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({
      evaluations,
      page,
      pages,
      total,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch evaluations." });
  }
});

router.get("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project id." });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (!canAccessProject(project, req.user)) {
      return res.status(403).json({ message: "Access denied." });
    }

    const evaluation = await Evaluation.findOne({ project: project._id }).populate(
      evaluationPopulate
    );

    if (!evaluation) {
      return res.status(200).json({ evaluation: null });
    }

    res.json({ evaluation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch evaluation." });
  }
});

router.post("/", requireRole("supervisor"), async (req, res) => {
  try {
    const { projectId, overallFeedback, strengths, improvements } = req.body;
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Valid projectId is required." });
    }

    const feedbackTrim = overallFeedback != null ? String(overallFeedback).trim() : "";
    if (!feedbackTrim) {
      return res.status(400).json({ message: "Overall feedback is required." });
    }

    const { marks, error } = parseMarks(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (!idEquals(project.supervisor, req.user.id)) {
      return res.status(403).json({
        message: "You can only evaluate projects assigned to you.",
      });
    }

    let evaluation = await Evaluation.findOne({ project: project._id });
    let isCreate = false;

    if (evaluation && evaluation.isFinalized) {
      return res.status(409).json({
        message: "This evaluation is finalized and cannot be changed.",
      });
    }

    const strengthStr = strengths != null ? String(strengths).trim() : "";
    const improveStr = improvements != null ? String(improvements).trim() : "";

    if (evaluation) {
      evaluation.marks = marks;
      evaluation.overallFeedback = feedbackTrim;
      evaluation.strengths = strengthStr;
      evaluation.improvements = improveStr;
      evaluation.evaluatedAt = new Date();
    } else {
      isCreate = true;
      evaluation = new Evaluation({
        project: project._id,
        supervisor: req.user.id,
        student: project.student,
        marks,
        overallFeedback: feedbackTrim,
        strengths: strengthStr,
        improvements: improveStr,
        evaluatedAt: new Date(),
        isFinalized: false,
      });
    }

    await evaluation.save();

    const populated = await Evaluation.findById(evaluation._id).populate(
      evaluationPopulate
    );

    res.status(isCreate ? 201 : 200).json({ evaluation: populated });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "An evaluation already exists for this project." });
    }
    res.status(500).json({ message: "Failed to save evaluation." });
  }
});

router.patch("/:id/finalize", requireRole("supervisor"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid evaluation id." });
    }

    const evaluation = await Evaluation.findById(id);
    if (!evaluation) {
      return res.status(404).json({ message: "Evaluation not found." });
    }

    if (!idEquals(evaluation.supervisor, req.user.id)) {
      return res.status(403).json({ message: "Access denied." });
    }

    if (evaluation.isFinalized) {
      return res.status(400).json({ message: "Evaluation is already finalized." });
    }

    evaluation.isFinalized = true;
    evaluation.evaluatedAt = new Date();
    await evaluation.save();

    await Project.findByIdAndUpdate(evaluation.project, { status: "completed" });

    const populated = await Evaluation.findById(evaluation._id).populate(
      evaluationPopulate
    );

    res.json({ evaluation: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to finalize evaluation." });
  }
});

module.exports = router;
