
/**
 * MongoDB Schema for ACT Path SaaS
 * Forensic Clinical Tracking & Template Version
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * REUSABLE SCHEMAS
 */

// Atomic response for any question in any context
const QuestionResponseSchema = new Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  label: { type: String }, // Human-readable label for the value (e.g., 'Strongly Agree')
  timestamp: { type: Date, default: Date.now }
});

// Granular step-level logging within a session
const SessionStepProgressSchema = new Schema({
  stepId: { type: String, required: true },
  stepTitle: { type: String },
  status: { type: String, enum: ['VIEWED', 'STARTED', 'COMPLETED'], default: 'VIEWED' },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  inputs: [QuestionResponseSchema]
});

/**
 * TEMPLATE SCHEMAS (Definitions for Assessments and Modules)
 */

const AssessmentTemplateSchema = new Schema({
  code: { type: String, required: true, unique: true }, // e.g., 'PCL-5-V1'
  title: { type: String, required: true },
  description: { type: String },
  version: { type: String, default: '1.0' },
  questions: [{
    id: String,
    text: String,
    type: { type: String, enum: ['LIKERT', 'TEXT', 'MULTIPLE_CHOICE', 'BOOLEAN'] },
    options: [{ label: String, value: Schema.Types.Mixed }]
  }],
  active: { type: Boolean, default: true }
});

const SessionTemplateSchema = new Schema({
  sessionNumber: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  moduleKey: { type: String, required: true },
  steps: [{
    stepId: String,
    title: String,
    type: { type: String, enum: ['INTRO', 'EXERCISE', 'QUESTIONNAIRE', 'OUTRO'] }
  }]
});

/**
 * USER-SPECIFIC DATA SCHEMAS
 */

const PsychometricTestSchema = new Schema({
  templateId: { type: Schema.Types.ObjectId, ref: 'AssessmentTemplate' },
  testType: { type: String, required: true },
  items: [QuestionResponseSchema],
  totalScore: { type: Number },
  interpretation: { type: String }, // Clinical summary based on score
  completedAt: { type: Date, default: Date.now }
});

const SessionResultSchema = new Schema({
  sessionNumber: { type: Number, required: true },
  sessionTitle: { type: String },
  status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED', 'PAUSED', 'ABANDONED'], default: 'IN_PROGRESS' },
  timestamp: { type: Date, default: Date.now },
  totalDurationMinutes: { type: Number, default: 0 },
  interruptionCount: { type: Number, default: 0 },
  moodBefore: { type: Number },
  moodAfter: { type: Number },
  reflections: { type: Schema.Types.Mixed, default: {} },
  stepProgress: [SessionStepProgressSchema],
  metadata: {
    device: String,
    browser: String,
    version: String
  }
});

const ClinicalNoteSchema = new Schema({
  therapistId: { type: Schema.Types.ObjectId, ref: 'User' },
  sessionNumber: { type: Number },
  noteText: { type: String, required: true },
  isPrivate: { type: Boolean, default: true }, // Whether the client can see this note
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ['CLIENT', 'THERAPIST', 'ADMIN', 'SUPER_ADMIN'], 
    required: true 
  },
  clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic' },
  phoneNumber: { type: String },
  profileImage: { type: String }, 
  hasConsented: { type: Boolean, default: false },
  consentTimestamp: { type: Date },
  
  // --- CLIENT CLINICAL PROGRESS ---
  
  currentSession: { type: Number, default: 1 },
  assignedTherapistId: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Dynamic Intake (records specific questions and answers)
  intakeResponses: [QuestionResponseSchema],
  
  // Legacy intake structure (retained for cached quick lookups)
  intakeSnapshot: {
    age: Number,
    gender: String,
    medicalHistory: String,
    updatedAt: Date
  },

  // Forensic high-fidelity log of every single input across sessions
  sessionData: [QuestionResponseSchema],

  // Granular history of session completions and internal step progress
  sessionHistory: [SessionResultSchema],

  // History of psychometric assessments
  assessmentHistory: [PsychometricTestSchema],
  
  // Therapist-only records
  clinicalNotes: [ClinicalNoteSchema],

  // Quick-access clinical dashboard stats
  currentClinicalSnapshot: {
    lastMood: Number,
    pcl5Total: Number,
    dersTotal: Number,
    aaqTotal: Number,
    lastUpdate: Date
  }
});

// Indices for performance
UserSchema.index({ email: 1 });
UserSchema.index({ clinicId: 1, role: 1 });

const ClinicSchema = new Schema({
  name: { type: String, required: true },
  contactEmail: { type: String, required: true, unique: true },
  plan: { type: String, enum: ['Basic', 'Professional', 'Enterprise'] },
  status: { type: String, enum: ['Live', 'Setup', 'Review'] },
  createdAt: { type: Date, default: Date.now }
});

const AssessmentTemplate = mongoose.model('AssessmentTemplate', AssessmentTemplateSchema);
const SessionTemplate = mongoose.model('SessionTemplate', SessionTemplateSchema);
const Clinic = mongoose.model('Clinic', ClinicSchema);
const User = mongoose.model('User', UserSchema);

module.exports = { Clinic, User, AssessmentTemplate, SessionTemplate };
