// controllers/therapist.js
import { User } from '../db/schema.js';

export const getAssignedClients = async (req, res) => {
  try {
    // req.user.id comes from your JWT authentication middleware
    const clients = await User.find({ 
      role: 'CLIENT', 
      assignedTherapistId: req.user.id 
    }).select('-password -mfaCode'); // Exclude sensitive fields

    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clients', error: error.message });
  }
};