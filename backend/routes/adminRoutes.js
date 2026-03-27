import express from 'express';
import { getClinicTherapists,getClinicDashboardStats } from '../controllers/adminController.js';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/clinicStaff',authMiddleware, adminMiddleware, getClinicTherapists);
router.get('/dashboard-stats', authMiddleware, adminMiddleware, getClinicDashboardStats);

export default router;