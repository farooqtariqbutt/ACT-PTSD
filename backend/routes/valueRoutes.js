import express from 'express';
import { getValuesCompassData, addActionLogEntry, deleteActionLogEntry,getSession7ValuesData } from '../controllers/valueController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();


router.get("/values-compass", authMiddleware, getValuesCompassData);
router.post("/values-action-log", authMiddleware, addActionLogEntry);
router.delete("/values-action-log/:index", authMiddleware, deleteActionLogEntry);
router.get("/session7-values", authMiddleware, getSession7ValuesData);
export default router;