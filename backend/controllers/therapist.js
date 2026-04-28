// controllers/therapist.js
import { User , Notification} from '../db/schema.js';

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

    if (updates.sessionFrequency === 'daily') {
      updates.schedulePreference = 'Daily';
    }

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

export const deleteClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Assuming your auth middleware attaches the logged-in therapist's ID to req.user
    const therapistId = req.user.id || req.user._id;

    // 1. Verify the client exists and belongs to this specific therapist
    // Using 'assignedTherapistId' as defined in your UserSchema
    const client = await User.findOne({ 
      _id: clientId, 
      assignedTherapistId: therapistId, 
      role: 'CLIENT' 
    });

    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found or you are unauthorized to delete this record.' 
      });
    }

    // 2. Delete all standalone related documents first (Notifications)
    await Notification.deleteMany({ userId: clientId });

    // 3. Delete the main User document
    // NOTE: Because sessionHistory, assessmentHistory, dailyDistressLogs, etc. 
    // are embedded arrays inside the User document, they are automatically 
    // deleted permanently right here. No extra code needed!
    await User.findByIdAndDelete(clientId);

    res.status(200).json({ 
      success: true, 
      message: 'Client, their clinical history, and all notifications were successfully deleted.' 
    });
    
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while attempting to delete client data.' 
    });
  }
};

