import express from 'express';
import { getSessionTemplate,completeSession } from '../controllers/sessionController.js';
import {authMiddleware} from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/templates/1, /api/templates/2, etc.
router.get('/:sessionNumber',getSessionTemplate);
router.post('/complete',authMiddleware, completeSession);

export default router;