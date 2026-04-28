import { AssessmentTemplate,User } from "../db/schema.js";

export const getTemplate = async (req, res) => {
    try {
      const { code } = req.params;
      const template = await AssessmentTemplate.findOne({ code, active: true });
      
      if (!template) {
        return res.status(404).json({ message: 'Assessment template not found' });
      }
      
      res.status(200).json(template);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching template', error: error.message });
    }
};

/**
 * Saves completed assessment results to User history and updates clinical snapshots
 */
/**
 * Saves completed assessment results to User history and updates clinical snapshots
 */
export const submitAssessment = async (req, res) => {
  try {
    const userId = req.user.id;
    // Extract 'phase' from the request body (default to PRE if missing)
    const { templateId, testType, items, totalScore, interpretation, phase = 'PRE' } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 1. Create the new assessment record with the phase tag
    const newAssessmentRecord = {
      templateId,
      testType,
      items,    
      totalScore,
      interpretation,
      phase, // 'PRE' or 'POST'
      completedAt: new Date()
    };

    // 2. Push to history
    user.assessmentHistory.push(newAssessmentRecord);

    // 3. Dynamic Snapshot Update Logic based on Phase
    if (phase === 'PRE') {
      if(testType.includes('PDEQ')) user.currentClinicalSnapshot.pdeqTotal = totalScore;
      else if (testType.includes('PCL5')) user.currentClinicalSnapshot.pcl5Total = totalScore;
      else if (testType.includes('DERS18')) user.currentClinicalSnapshot.dersTotal = totalScore;
      else if (testType.includes('AAQ')) user.currentClinicalSnapshot.aaqTotal = totalScore;
      
      user.currentClinicalSnapshot.lastUpdate = new Date();

    } else if (phase === 'POST') {
      // Create the object if it doesn't exist yet (for older accounts)
      if (!user.postClinicalSnapshot) user.postClinicalSnapshot = {};
      
      if(testType.includes('PDEQ')) user.postClinicalSnapshot.pdeqTotal = totalScore;
      else if (testType.includes('PCL5')) user.postClinicalSnapshot.pcl5Total = totalScore;
      else if (testType.includes('DERS18')) user.postClinicalSnapshot.dersTotal = totalScore;
      else if (testType.includes('AAQ')) user.postClinicalSnapshot.aaqTotal = totalScore;
      
      user.postClinicalSnapshot.completedAt = new Date();

      // ─────────────────────────────────────────────────────────────────
      // PROGRAM RESTART LOGIC
      // ─────────────────────────────────────────────────────────────────
      // Determine if therapy is still needed based on a clinical threshold.
      // Example: PCL-5 score of 33 or higher typically indicates clinically significant PTSD symptoms.
      const needsMoreTherapy = 
        (testType.includes('PCL5') && totalScore >= 33) ||
        (testType.includes('PDEQ') && totalScore > 15) ||
        (testType.includes('DERS18') && totalScore > 35) ||
        (testType.includes('AAQ') && totalScore > 20);

        if (needsMoreTherapy) {
          // ONLY archive if there are actually completed sessions to archive
          // This prevents archiving empty arrays when the 2nd/3rd assessment comes through
          if (user.sessionHistory && user.sessionHistory.length > 0) {
            if (!user.archivedSessionHistory) {
              user.archivedSessionHistory = [];
            }
            
            user.archivedSessionHistory.push({
              roundCompletedAt: new Date(),
              sessions: [...user.sessionHistory]
            });
  
            // Clear active histories and trackers
            user.sessionHistory = [];
            user.currentSession = 0; 
            user.prescribedSessions = []; 
          }
        }
    }

    

    await user.save();

    res.status(201).json({ 
      message: 'Assessment submitted successfully', 
      snapshot: phase === 'PRE' ? user.currentClinicalSnapshot : user.postClinicalSnapshot,
      historyRecordId: user.assessmentHistory[user.assessmentHistory.length - 1]._id
    });

  } catch (error) {
    res.status(500).json({ message: 'Error submitting assessment', error: error.message });
  }
};

/**
 * Retrieves the assessment history for a specific user
 */
export const getUserAssessmentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select('assessmentHistory')
      .populate('assessmentHistory.templateId', 'title code');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user.assessmentHistory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching history', error: error.message });
  }
};

export const getAllTemplates = async (req, res) => {
  try {
    // Only return active templates; exclude massive fields if needed with .select(...)
    const templates = await AssessmentTemplate.find({ active: true });
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};


