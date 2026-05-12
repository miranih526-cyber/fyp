require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");
const authRouter = require("./routes/auth");
const projectsRouter = require("./routes/projects");
const submissionsRouter = require("./routes/submissions");
const evaluationsRouter = require("./routes/evaluations");

const uploadsDir = path.join(__dirname, "uploads");
if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(503).json({ message: "Database unavailable." });
    }
  }
});

const clientOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

app.use(
  cors({
    origin(origin, callback) {
      if (!clientOrigins || clientOrigins.length === 0) {
        return callback(null, true);
      }
      if (!origin || clientOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "fyp-management-system-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/submissions", submissionsRouter);
app.use("/api/evaluations", evaluationsRouter);
app.use("/api/users", require("./routes/users"));
app.use("/api/admin", require("./routes/admin"));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (!res.headersSent) {
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = app;
