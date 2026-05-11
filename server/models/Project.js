const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "in_progress", "completed"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    technologies: {
      type: [String],
      default: [],
    },
    startDate: {
      type: Date,
    },
    expectedEndDate: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

module.exports =
  mongoose.models.Project || mongoose.model("Project", projectSchema);
