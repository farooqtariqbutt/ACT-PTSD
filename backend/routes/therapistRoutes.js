import express from 'express';
import { getAssignedClients } from '../controllers/therapist.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/clients', authMiddleware, getAssignedClients); // Fetch user details

export default router;