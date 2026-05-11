const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const Submission = require("../models/Submission");
const Project = require("../models/Project");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const uploadsRoot = path.join(__dirname, "..", "uploads");

const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".zip"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "") || "";
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(
        new Error("Only PDF, DOC, DOCX, and ZIP files are allowed.")
      );
    }
    cb(null, true);
  },
});

function idEquals(ref, userId) {
  if (!ref) return false;
  const rid = ref._id ? ref._id.toString() : ref.toString();
  return rid === userId;
}

async function loadProject(projectId) {
  if (!mongoose.isValidObjectId(projectId)) return null;
  return Project.findById(projectId);
}

async function canAccessProjectForSubmission(project, reqUser) {
  if (!project) return false;
  if (reqUser.role === "admin") return true;
  if (reqUser.role === "student") {
    return idEquals(project.student, reqUser.id);
  }
  if (reqUser.role === "supervisor") {
    return idEquals(project.supervisor, reqUser.id);
  }
  return false;
}

async function canAccessSubmissionDoc(submission, reqUser) {
  const project = await loadProject(submission.project);
  return canAccessProjectForSubmission(project, reqUser);
}

router.use(verifyToken);

function handleUploadError(err, req, res) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File size must not exceed 10MB.",
      });
    }
    return res.status(400).json({ message: err.message || "Upload failed." });
  }
  return res.status(400).json({ message: err.message || "Upload failed." });
}

router.post(
  "/",
  requireRole("student"),
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) return handleUploadError(err, req, res);
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File is required." });
      }

      const { projectId, title, description } = req.body;
      if (!projectId || !title) {
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          message: "projectId and title are required.",
        });
      }

      const project = await loadProject(projectId);
      if (!project || !idEquals(project.student, req.user.id)) {
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({
          message: "Project not found or you do not own this project.",
        });
      }

      const titleTrim = String(title).trim();
      const latest = await Submission.findOne({
        project: project._id,
        title: titleTrim,
      })
        .sort({ version: -1 })
        .select("version")
        .lean();

      const nextVersion = latest && typeof latest.version === "number" ? latest.version + 1 : 1;

      const storedRelative = path.join("uploads", req.file.filename).replace(/\\/g, "/");

      const submission = await Submission.create({
        project: project._id,
        student: req.user.id,
        title: titleTrim,
        description: description != null ? String(description).trim() : "",
        fileUrl: storedRelative,
        fileName: req.file.originalname || req.file.filename,
        fileSize: typeof req.file.size === "number" ? req.file.size : 0,
        version: nextVersion,
      });

      const populated = await Submission.findById(submission._id).populate({
        path: "student",
        select: "name rollNo",
      });

      res.status(201).json({ submission: populated });
    } catch (err) {
      console.error(err);
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          /* ignore */
        }
      }
      res.status(500).json({ message: "Failed to save submission." });
    }
  }
);

router.get("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await loadProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const allowed = await canAccessProjectForSubmission(project, req.user);
    if (!allowed) {
      return res.status(403).json({ message: "Access denied." });
    }

    const submissions = await Submission.find({ project: project._id })
      .sort({ createdAt: -1 })
      .populate({ path: "student", select: "name rollNo" });

    res.json({ submissions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch submissions." });
  }
});

router.patch("/:id/feedback", requireRole("supervisor"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid submission id." });
    }

    const { feedback } = req.body;
    if (feedback === undefined || feedback === null) {
      return res.status(400).json({ message: "Feedback is required." });
    }
    const trimmed = String(feedback).trim();
    if (!trimmed) {
      return res.status(400).json({ message: "Feedback cannot be empty." });
    }

    const submission = await Submission.findById(id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    const project = await loadProject(submission.project);
    if (!project || !idEquals(project.supervisor, req.user.id)) {
      return res.status(403).json({
        message: "You can only give feedback on submissions for your assigned projects.",
      });
    }

    submission.feedback = trimmed;
    submission.feedbackGivenAt = new Date();
    submission.supervisorReviewed = true;
    await submission.save();

    const updated = await Submission.findById(submission._id).populate({
      path: "student",
      select: "name rollNo",
    });

    res.json({ submission: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save feedback." });
  }
});

router.get("/download/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid submission id." });
    }

    const submission = await Submission.findById(id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    const allowed = await canAccessSubmissionDoc(submission, req.user);
    if (!allowed) {
      return res.status(403).json({ message: "Access denied." });
    }

    const diskName = path.basename(submission.fileUrl);
    const absolutePath = path.join(uploadsRoot, diskName);

    const uploadsResolved = path.resolve(uploadsRoot);
    const resolvedFile = path.resolve(absolutePath);
    if (!resolvedFile.startsWith(uploadsResolved + path.sep) && resolvedFile !== uploadsResolved) {
      return res.status(400).json({ message: "Invalid file path." });
    }

    if (!fs.existsSync(resolvedFile)) {
      return res.status(404).json({ message: "File not found on disk." });
    }

    res.download(resolvedFile, submission.fileName, (err) => {
      if (err && !res.headersSent) {
        console.error(err);
        res.status(500).json({ message: "Failed to download file." });
      }
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to download file." });
    }
  }
});

module.exports = router;
