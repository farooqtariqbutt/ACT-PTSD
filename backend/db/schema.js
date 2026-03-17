import mongoose, { Schema } from "mongoose";

/**
 * ==========================================
 * 1. REUSABLE SUB-SCHEMAS
 * ==========================================
 */

// Atomic response for any question
const QuestionResponseSchema = new Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  label: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Granular step-level logging
const SessionStepProgressSchema = new Schema({
  stepId: { type: String, required: true },
  stepTitle: { type: String },
  status: {
    type: String,
    enum: ["VIEWED", "STARTED", "COMPLETED"],
    default: "VIEWED",
  },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  inputs: [QuestionResponseSchema],
});

// Psychometric Test History
const PsychometricTestSchema = new Schema({
  templateId: { type: Schema.Types.ObjectId, ref: "AssessmentTemplate" },
  testType: { type: String, required: true },
  items: [QuestionResponseSchema],
  totalScore: { type: Number },
  interpretation: { type: String },
  completedAt: { type: Date, default: Date.now },
  phase: { type: String, enum: ["PRE", "POST"], default: "PRE" },
});

// Session Results
const SessionResultSchema = new Schema({
  sessionNumber: { type: Number, required: true },
  sessionTitle: { type: String },
  status: {
    type: String,
    enum: ["IN_PROGRESS", "COMPLETED", "PAUSED", "ABANDONED"],
    default: "IN_PROGRESS",
  },
  timestamp: { type: Date, default: Date.now },
  totalDurationMinutes: { type: Number, default: 0 },
  interruptionCount: { type: Number, default: 0 },
  distressBefore: { type: Number },
  distressAfter: { type: Number },
  reflections: { type: Schema.Types.Mixed, default: {} },
  stepProgress: [SessionStepProgressSchema],
  metadata: {
    device: String,
    browser: String,
    version: String,
  },
});

// Clinical Notes
const ClinicalNoteSchema = new Schema({
  therapistId: { type: Schema.Types.ObjectId, ref: "User" },
  sessionNumber: { type: Number },
  noteText: { type: String, required: true },
  isPrivate: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

/**
 * ==========================================
 * 2. EXPLICIT SUB-DOCUMENT SCHEMAS (THE FIX)
 * ==========================================
 * Defining these separately prevents Mongoose from confusing the
 * 'type' field with a schema datatype definition.
 */

const AssessmentQuestionSchema = new Schema(
  {
    id: { type: String },
    text: { type: String },
    type: {
      type: String,
      enum: ["LIKERT", "TEXT", "MULTIPLE_CHOICE", "BOOLEAN"],
    },
    options: [{ label: String, value: Schema.Types.Mixed }],
    cluster: { type: String },
  },
  { _id: false }
);

const SessionQuestionSchema = new Schema(
  {
    questionId: { type: String },
    text: { type: String },
    type: { type: String },
    options: [Schema.Types.Mixed],
  },
  { _id: false }
);

const SessionStepSchema = new Schema(
  {
    stepId: { type: String },
    title: { type: String },
    type: { type: String },
    content: { type: String },
    questions: [SessionQuestionSchema], // Safely attached here
  },
  { _id: false }
);

/**
 * ==========================================
 * 3. INDEPENDENT MODEL SCHEMAS
 * ==========================================
 */

// --- CLINIC SCHEMA ---
const ClinicSchema = new Schema(
  {
    name: { type: String, required: true },
    contactEmail: { type: String, required: true, unique: true },
    plan: {
      type: String,
      enum: ["Basic", "Professional", "Enterprise"],
      default: "Basic",
    },
    status: {
      type: String,
      enum: ["Live", "Setup", "Review"],
      default: "Setup",
    },
  },
  { timestamps: true }
);

// --- ASSESSMENT TEMPLATE SCHEMA ---
const AssessmentTemplateSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    version: { type: String, default: "1.0" },
    questions: [AssessmentQuestionSchema], // Safely attached here
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// --- SESSION TEMPLATE SCHEMA ---
const SessionTemplateSchema = new Schema(
  {
    sessionNumber: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    objective: { type: String },
    moduleKey: { type: String, required: true },
    audioUrl: { type: String },
    steps: [SessionStepSchema], // Safely attached here
  },
  { timestamps: true }
);

// --- USER SCHEMA (Main) ---
const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Auth

    themeColor: {
      type: String,
      enum: ["blue", "green", "pink"], // Make sure these match exactly!
      default: "blue",
    },
    sessionFrequency: {
      type: String,
      enum: ["once", "twice", "thrice"],
      default: "once",
    },

    demographics: { type: Schema.Types.Mixed, default: {} },
    traumaHistory: { type: Schema.Types.Mixed, default: {} },

    role: {
      type: String,
      enum: ["CLIENT", "THERAPIST", "ADMIN", "SUPER_ADMIN"],
      default: "CLIENT",
    },

    schedulePreference: {
      type: String,
      enum: [
        // Once a week options
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun",
        // Twice a week options
        "MonThu",
        "TueFri",
        "WedSat",
        // Thrice a week options
        "MonWedFri",
        "TueThuSat",
      ],
      default: null, // Leave null by default so we know if the user hasn't set it yet
    },
    prescribedSessions: { type: [Number], default: [] },

    // Add this inside your UserSchema definition:
    dailyDistressLogs: [
      {
        level: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    trend: { type: String, enum: ["up", "down", "stable"], default: "stable" },
    clinicId: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    mfaCode: { type: String },
    phoneNumber: { type: String },
    profileImage: { type: String },
    hasConsented: { type: Boolean, default: false },
    consentTimestamp: { type: Date },

    // Client Clinical Progress
    currentSession: { type: Number, default: 1 },
    assignedTherapistId: { type: Schema.Types.ObjectId, ref: "User" },

    // Data Arrays
    intakeResponses: [QuestionResponseSchema],
    sessionData: [QuestionResponseSchema],
    sessionHistory: [SessionResultSchema],
    assessmentHistory: [PsychometricTestSchema],
    clinicalNotes: [ClinicalNoteSchema],

    intakeSnapshot: {
      age: Number,
      gender: String,
      medicalHistory: String,
      updatedAt: Date,
    },

    currentClinicalSnapshot: {
      lastDistress: { type: Number, default: 0 },
      pdeqTotal: { type: Number, default: 0 },
      pcl5Total: { type: Number, default: 0 },
      dersTotal: { type: Number, default: 0 },
      aaqTotal: { type: Number, default: 0 },
      lastUpdate: { type: Date, default: Date.now },
    },

    // <-- NEW: Post-Program Snapshot
    postClinicalSnapshot: {
      pdeqTotal: { type: Number, default: 0 },
      pcl5Total: { type: Number, default: 0 },
      dersTotal: { type: Number, default: 0 },
      aaqTotal: { type: Number, default: 0 },
      completedAt: { type: Date },
    },
    notificationSettings: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      pushSubscription: { type: Schema.Types.Mixed, default: null },
    },
  },
  { timestamps: true }
);

// Calculate compliance dynamically on the fly
UserSchema.virtual("complianceScore").get(function () {
  // Only calculate for clients
  if (this.role !== "CLIENT") return null;

  // 1. Map your text-based frequency enum to a real number
  const frequencyMap = { once: 1, twice: 2, thrice: 3 };
  const targetPacePerWeek = frequencyMap[this.sessionFrequency] || 1;

  // 2. Calculate weeks active (using timestamps: true)
  const joinedDate = this.createdAt || new Date();
  const millisecondsActive = new Date() - joinedDate;
  const weeksActive = Math.max(
    1,
    millisecondsActive / (1000 * 60 * 60 * 24 * 7)
  );

  // 3. Determine expected sessions
  const expectedSessions = Math.floor(weeksActive * targetPacePerWeek);

  // If they just joined, they are 100% compliant by default
  if (expectedSessions === 0) return 100;

  // 4. Count actual completed modules from their sessionHistory array
  const completedModules = (this.sessionHistory || []).filter(
    (session) => session.status === "COMPLETED"
  ).length;

  // 5. Calculate percentage (capped at 100, floored at 0)
  const rawScore = Math.round((completedModules / expectedSessions) * 100);
  return Math.min(100, Math.max(0, rawScore));
});

UserSchema.virtual("nextSessionDate").get(function () {
  if (this.role !== "CLIENT" || !this.schedulePreference) return null;

  const validDaysMap = {
    Mon: [1],
    Tue: [2],
    Wed: [3],
    Thu: [4],
    Fri: [5],
    Sat: [6],
    Sun: [0],
    MonThu: [1, 4],
    TueFri: [2, 5],
    WedSat: [3, 6],
    MonWedFri: [1, 3, 5],
    TueThuSat: [2, 4, 6],
  };

  const allowedDays = validDaysMap[this.schedulePreference] || [1, 4];
  const today = new Date();
  let nextDate = new Date();

  // Look ahead up to 7 days to find the next valid scheduled day
  for (let i = 1; i <= 7; i++) {
    nextDate.setDate(today.getDate() + i);
    if (allowedDays.includes(nextDate.getDay())) {
      return nextDate;
    }
  }
  return null;
});

// CRITICAL: Ensure virtuals are included when sending data to the frontend
UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

// Indices for performance
UserSchema.index({ clinicId: 1, role: 1 });

/**
 * ==========================================
 * 4. CREATE MODELS & EXPORT
 * ==========================================
 */

export const User = mongoose.model("User", UserSchema);
export const Clinic = mongoose.model("Clinic", ClinicSchema);
export const AssessmentTemplate = mongoose.model(
  "AssessmentTemplate",
  AssessmentTemplateSchema
);
export const SessionTemplate = mongoose.model(
  "SessionTemplate",
  SessionTemplateSchema
);
