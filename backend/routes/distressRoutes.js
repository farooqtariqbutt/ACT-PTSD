import express from 'express';
import { logDailyDistress } from '../controllers/distressController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/distress-log', authMiddleware, logDailyDistress);

export default router;