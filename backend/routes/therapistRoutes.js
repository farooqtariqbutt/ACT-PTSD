import express from 'express';
import { getAssignedClients,getClientDetails,updateClientSettings,deleteClient } from '../controllers/therapist.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/clients', authMiddleware, getAssignedClients); // Fetch user details
router.put('/clients/:clientId', authMiddleware, updateClientSettings); // Update client settings
router.get('/clients/:clientId', authMiddleware, getClientDetails); // Get single client details
router.delete('/clients/:clientId', authMiddleware, deleteClient);

export default router;