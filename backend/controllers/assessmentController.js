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
export const submitAssessment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId, testType, items, totalScore,interpretation } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 1. Create the new assessment record
    const newAssessmentRecord = {
      templateId,
      testType, // e.g., 'PCL5-V1', 'DERS18-V1', 'AAQ-V1'
      items,    // Array of { questionId, questionText, value, label }
      totalScore,
      interpretation,
      completedAt: new Date()
    };

    // 2. Push to history
    user.assessmentHistory.push(newAssessmentRecord);

    // 3. Dynamic Snapshot Update Logic
    // Maps the incoming test code to the specific field in our User Schema snapshot
    if(testType.includes('PDEQ')){
      user.currentClinicalSnapshot.pdeqTotal = totalScore;
    }
    else if (testType.includes('PCL5')) {
      user.currentClinicalSnapshot.pcl5Total = totalScore;
    } else if (testType.includes('DERS18')) {
      user.currentClinicalSnapshot.dersTotal = totalScore;
    } else if (testType.includes('AAQ')) {
      user.currentClinicalSnapshot.aaqTotal = totalScore;
    }

    user.currentClinicalSnapshot.lastUpdate = new Date();

    await user.save();

    res.status(201).json({ 
      message: 'Assessment submitted successfully', 
      snapshot: user.currentClinicalSnapshot,
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
