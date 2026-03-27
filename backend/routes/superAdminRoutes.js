import { Router } from 'express';
import { getAllUsers,getAllClinics } from '../controllers/superAdminController.js';
import { authMiddleware,superAdminMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/admin/users?page=1&limit=50
router.get('/admin/users', authMiddleware,superAdminMiddleware, getAllUsers);

router.get('/admin/clinics', authMiddleware, superAdminMiddleware, getAllClinics);

export default router;