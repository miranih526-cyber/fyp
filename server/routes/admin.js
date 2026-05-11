const express = require("express");
const Project = require("../models/Project");
const Submission = require("../models/Submission");
const Evaluation = require("../models/Evaluation");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken, requireRole("admin"));

router.get("/ping", (_req, res) => {
  res.json({ message: "Admin access granted." });
});

const ALL_GRADES = ["A+", "A", "B+", "B", "C", "F"];
const ALL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "in_progress",
  "completed",
];

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

router.get("/reports/projects-csv", async (_req, res) => {
  try {
    const projects = await Project.find({})
      .populate("student", "name email")
      .populate("supervisor", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const evaluations = await Evaluation.find({ isFinalized: true })
      .select("project grade")
      .lean();
    const gradeByProjectId = new Map(
      evaluations.map((e) => [e.project.toString(), e.grade || ""])
    );

    const header = [
      "Student Name",
      "Student Email",
      "Project Title",
      "Supervisor Name",
      "Supervisor Email",
      "Status",
      "Grade",
    ].join(",");

    const rows = projects.map((p) => {
      const sid = p._id.toString();
      const studentName = p.student?.name || "";
      const studentEmail = p.student?.email || "";
      const supName = p.supervisor?.name || "";
      const supEmail = p.supervisor?.email || "";
      const grade = gradeByProjectId.get(sid) || "";
      return [
        csvEscape(studentName),
        csvEscape(studentEmail),
        csvEscape(p.title || ""),
        csvEscape(supName),
        csvEscape(supEmail),
        csvEscape(p.status || ""),
        csvEscape(grade),
      ].join(",");
    });

    const csv = [header, ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="projects-export.csv"'
    );
    res.send("\uFEFF" + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to export CSV." });
  }
});

router.get("/reports", async (_req, res) => {
  try {
    const gradeAgg = await Evaluation.aggregate([
      { $match: { isFinalized: true } },
      { $group: { _id: "$grade", count: { $sum: 1 } } },
    ]);
    const gradeMap = Object.fromEntries(
      gradeAgg.map((g) => [g._id || "F", g.count])
    );
    const gradeDistribution = ALL_GRADES.map((grade) => ({
      grade,
      count: gradeMap[grade] || 0,
    }));

    const statusAgg = await Project.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusMap = Object.fromEntries(statusAgg.map((s) => [s._id, s.count]));
    const projectsByStatus = ALL_STATUSES.map((status) => ({
      status,
      count: statusMap[status] || 0,
    }));

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
      });
    }

    const submissionsByMonth = await Promise.all(
      months.map(async ({ key, start, end }) => {
        const count = await Submission.countDocuments({
          createdAt: { $gte: start, $lte: end },
        });
        return { month: key, count };
      })
    );

    res.json({
      gradeDistribution,
      projectsByStatus,
      submissionsByMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load reports." });
  }
});

module.exports = router;
