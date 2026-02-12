
/**
 * Database Seed Script - Clinical Template Edition
 * Run: node seed.js
 */

const mongoose = require('mongoose');
const { Clinic, User, AssessmentTemplate, SessionTemplate } = require('./schema');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/act_path_db';

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for clinical template seeding...');

    await Clinic.deleteMany({});
    await User.deleteMany({});
    await AssessmentTemplate.deleteMany({});
    await SessionTemplate.deleteMany({});

    // 1. Seed Clinic
    const mainClinic = await Clinic.create({
      name: 'Central Wellness Clinic',
      contactEmail: 'admin@centralwellness.com',
      plan: 'Professional',
      status: 'Live'
    });

    // 2. Seed Assessment Templates
    const pcl5Template = await AssessmentTemplate.create({
      code: 'PCL5-V1',
      title: 'PTSD Checklist for DSM-5',
      description: 'Standard clinical assessment for PTSD severity.',
      questions: [
        { id: 'q1', text: 'Repeated, disturbing, and unwanted memories of the stressful experience?', type: 'LIKERT' },
        { id: 'q2', text: 'Repeated, disturbing dreams of the stressful experience?', type: 'LIKERT' }
      ]
    });

    // 3. Seed Session Templates
    await SessionTemplate.create([
      {
        sessionNumber: 1,
        title: 'Creative Hopelessness',
        moduleKey: 'ch',
        steps: [
          { stepId: 'mood-in', title: 'Mood Check-in', type: 'INTRO' },
          { stepId: 'avoidance-q', title: 'Avoidance Assessment', type: 'QUESTIONNAIRE' },
          { stepId: 'anchor-med', title: 'Dropping the Anchor', type: 'EXERCISE' }
        ]
      }
    ]);

    // 4. Seed Test Client with question-aware intake
    const testClient = {
      name: 'Clinical Test Account',
      email: 'test@actpath.com',
      role: 'CLIENT',
      clinicId: mainClinic._id,
      hasConsented: true,
      consentTimestamp: new Date(),
      currentSession: 2,
      
      intakeResponses: [
        { questionId: 'age', questionText: 'What is your current age?', value: 32 },
        { questionId: 'trauma-near-death', questionText: 'Have you had a near death experience?', value: true, label: 'Yes' }
      ],

      assessmentHistory: [{
        templateId: pcl5Template._id,
        testType: 'PCL5',
        totalScore: 42,
        items: [
          { questionId: 'q1', questionText: 'Repeated, disturbing, and unwanted memories...', value: 3, label: 'Quite a bit' },
          { questionId: 'q2', questionText: 'Repeated, disturbing dreams...', value: 2, label: 'Moderately' }
        ]
      }],

      sessionHistory: [{
        sessionNumber: 1,
        sessionTitle: 'Creative Hopelessness',
        status: 'COMPLETED',
        totalDurationMinutes: 22,
        moodBefore: 3,
        moodAfter: 4,
        reflections: { coreCost: 'Social Isolation' },
        stepProgress: [
          { stepId: 'mood-in', status: 'COMPLETED', startTime: new Date(Date.now() - 100000) }
        ]
      }],

      currentClinicalSnapshot: {
        lastMood: 3,
        pcl5Total: 42,
        lastUpdate: new Date()
      }
    };

    const clientDoc = await User.create(testClient);
    
    // 5. Seed Staff
    await User.insertMany([
      { name: 'Dr. Sarah Smith', email: 'sarah@clinic.com', role: 'THERAPIST', clinicId: mainClinic._id, hasConsented: true },
      { name: 'System Admin', email: 'super@actsaas.com', role: 'SUPER_ADMIN', hasConsented: true }
    ]);
    
    console.log('Database seeded with clinical templates and question-aware data!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
