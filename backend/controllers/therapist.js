// controllers/therapist.js
import { User } from '../db/schema.js';

export const getAssignedClients = async (req, res) => {
  try {
    const clients = await User.find({ 
      role: 'CLIENT', 
      assignedTherapistId: req.user.id 
    }).select('-password -mfaCode'); 

    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clients', error: error.message });
  }
};

/**
 * NEW: Get a single assigned client's details
 * Route: GET /api/therapist/clients/:clientId
 */
export const getClientDetails = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // SECURITY: Ensure the requested user is a CLIENT and is assigned to THIS therapist
    const client = await User.findOne({
      _id: clientId,
      role: 'CLIENT',
      assignedTherapistId: req.user.id 
    }).select('-password -mfaCode');

    if (!client) {
      return res.status(404).json({ message: 'Client not found or not assigned to you' });
    }

    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching client details', error: error.message });
  }
};

/**
 * NEW: Update an assigned client's clinical settings (like sessionFrequency)
 * Route: PUT /api/therapist/clients/:clientId
 */
export const updateClientSettings = async (req, res) => {
  try {
    const { clientId } = req.params;
    const updates = { ...req.body };

    // SECURITY: Prevent therapist from changing core identity fields of the client
    delete updates.role;
    delete updates.password;
    delete updates.email;
    delete updates.assignedTherapistId; // Prevent therapist from transferring the client here

    const updatedClient = await User.findOneAndUpdate(
      { 
        _id: clientId, 
        role: 'CLIENT',
        assignedTherapistId: req.user.id // SECURITY: Must be their client!
      }, 
      { $set: updates }, 
      { new: true, runValidators: true }
    ).select('-password -mfaCode');

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found or not assigned to you' });
    }

    res.status(200).json(updatedClient);
  } catch (error) {
    res.status(500).json({ message: 'Error updating client settings', error: error.message });
  }
};

