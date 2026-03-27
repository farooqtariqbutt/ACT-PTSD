import express from 'express';
import { sendClientReminder,getUserNotifications,markNotificationRead } from '../controllers/notificationController.js';
import {authMiddleware} from '../middleware/authMiddleware.js';


const router = express.Router();

router.post('/remind',sendClientReminder);
router.get('/', authMiddleware, getUserNotifications);
router.put('/:id/read', authMiddleware, markNotificationRead);

export default router;