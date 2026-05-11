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
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

connectDB();

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "fyp-management-system-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/submissions", submissionsRouter);
app.use("/api/evaluations", evaluationsRouter);
app.use("/api/users", require("./routes/users"));
app.use("/api/admin", require("./routes/admin"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
