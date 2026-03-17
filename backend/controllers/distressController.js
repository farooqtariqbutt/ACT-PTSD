import { User } from "../db/schema.js";

export const logDailyDistress = async (req, res) => {
  try {
    // Assuming you have an authentication middleware that sets req.user.id
    const userId = req.user.id; 
    const { level } = req.body;

    if (typeof level !== 'number' || level < 1 || level > 10) {
      return res.status(400).json({ message: 'Valid distress level (1-10) is required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 1. Ensure the objects/arrays exist (safety check)
    if (!user.dailyDistressLogs) user.dailyDistressLogs = [];
    if (!user.currentClinicalSnapshot) user.currentClinicalSnapshot = {};

    // 2. Push the new log to the history array
    user.dailyDistressLogs.push({
      level: level,
      timestamp: new Date()
    });

    // 3. Update the snapshot for immediate dashboard retrieval
    user.currentClinicalSnapshot.lastDistress = level;
    user.currentClinicalSnapshot.lastUpdate = new Date();

    await user.save();

    res.status(200).json({ 
      message: 'Distress level logged successfully.',
      currentClinicalSnapshot: user.currentClinicalSnapshot 
    });

  } catch (error) {
    console.error('Error logging daily distress:', error);
    res.status(500).json({ message: 'Server error while logging distress.' });
  }
};