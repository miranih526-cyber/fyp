const mongoose = require("mongoose");

function computeTotalAndGrade(marks) {
  const m = marks || {};
  const proposal = Number(m.proposal) || 0;
  const implementation = Number(m.implementation) || 0;
  const documentation = Number(m.documentation) || 0;
  const presentation = Number(m.presentation) || 0;
  const totalMarks = proposal + implementation + documentation + presentation;

  let grade = "F";
  if (totalMarks >= 90) grade = "A+";
  else if (totalMarks >= 80) grade = "A";
  else if (totalMarks >= 70) grade = "B+";
  else if (totalMarks >= 60) grade = "B";
  else if (totalMarks >= 50) grade = "C";

  return { totalMarks, grade };
}

const marksSchema = new mongoose.Schema(
  {
    proposal: { type: Number, min: 0, max: 25, default: 0 },
    implementation: { type: Number, min: 0, max: 25, default: 0 },
    documentation: { type: Number, min: 0, max: 25, default: 0 },
    presentation: { type: Number, min: 0, max: 25, default: 0 },
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    marks: {
      type: marksSchema,
      default: () => ({}),
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    grade: {
      type: String,
      default: "F",
    },
    overallFeedback: {
      type: String,
      required: [true, "Overall feedback is required"],
      trim: true,
    },
    strengths: {
      type: String,
      trim: true,
      default: "",
    },
    improvements: {
      type: String,
      trim: true,
      default: "",
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
    isFinalized: {
      type: Boolean,
      default: false,
    },
  },
  { versionKey: false }
);

evaluationSchema.pre("save", function (next) {
  const { totalMarks, grade } = computeTotalAndGrade(this.marks);
  this.totalMarks = totalMarks;
  this.grade = grade;
  next();
});

module.exports =
  mongoose.models.Evaluation ||
  mongoose.model("Evaluation", evaluationSchema);
