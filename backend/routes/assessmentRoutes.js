import express from 'express';
import { getTemplate,submitAssessment,getAllTemplates } from '../controllers/assessmentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/template/:code', getTemplate);
router.post('/submit',authMiddleware, submitAssessment); 

router.get('/templates', getAllTemplates);

export default router;