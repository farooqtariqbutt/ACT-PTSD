import {SessionTemplate,User} from "../db/schema.js";
export const getSessionTemplate = async (req, res) => {
    try {
      const { sessionNumber } = req.params;
  
      // Find the template based on the sessionNumber (1, 2, 3, etc.)
      const template = await SessionTemplate.findOne({ 
        sessionNumber: parseInt(sessionNumber) 
      });
  
      if (!template) {
        return res.status(404).json({ message: "Session template not found." });
      }
  
      res.status(200).json(template);
    } catch (error) {
      console.error("Error fetching session template:", error);
      res.status(500).json({ message: "Server error while fetching template." });
    }
  };



export const completeSession = async (req, res) => {
  try {
    const userId  = req.user.id; // Assuming you have auth middleware
    const { 
      sessionNumber, 
      sessionTitle, 
      status: status,
      moodBefore, 
      moodAfter, 
      distressBefore,
      distressAfter,
      reflections, 
      stepProgress,
      metadata ,
      startTime, 
      endTime
    } = req.body;

    // 1. Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const existingIndex = user.sessionHistory.findIndex(
      (s) => s.sessionNumber === sessionNumber
    );

    let duration = req.body.totalDurationMinutes;

    if (!duration && startTime && endTime) {
      const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
      duration = Math.round(diffMs / 60000); // convert ms to minutes
    }

    // 2. Prepare the session result object based on your SessionResultSchema
    const sessionResult = {
      sessionNumber,
      sessionTitle,
      distressBefore,
      distressAfter,
      status: status,
      timestamp: new Date(), // This is crucial for the "2 per week" check later
      totalDurationMinutes: duration || 0,
      moodBefore,
      moodAfter,
      reflections,
      stepProgress,
      metadata
    };

    if (existingIndex !== -1) {
      // UPDATE: Replace the old session data with the new recap data
      user.sessionHistory[existingIndex] = sessionResult;
    } else {
      // CREATE: First time completing this session
      user.sessionHistory.push(sessionResult);
    }

    // 4. Only increment currentSession if it's actually finished
    if (status === 'COMPLETED' && user.currentSession === sessionNumber) {
      user.currentSession = sessionNumber + 1;
    }

    await user.save();

    res.status(200).json({ 
      message: "Session saved successfully", 
      duration: duration,
      nextSession: user.currentSession 
    });

  } catch (error) {
    console.error("Error saving session completion:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

