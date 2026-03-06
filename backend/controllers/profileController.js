import { User } from '../db/schema.js';

/**
 * Fetch user details
 */
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; 
    const user = await User.findById(userId).select('-password'); 

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile', error: error.message });
  }
};

/**
 * Edit and update user details
 */
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const updates = { ...req.body };

    // SECURITY: Strip out fields the user should NEVER be able to update themselves via this route
    delete updates.role;
    delete updates.clinicId;
    delete updates.password; // Handled by a separate change-password route
    delete updates.assignedTherapistId;

    // Find the user and update with the dynamic (but sanitized) updates object
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates }, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user profile', error: error.message });
  }
};