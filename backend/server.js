import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import assessmentsRoutes from './routes/assessmentRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import therapistRoutes from './routes/therapistRoutes.js';
import distressRoutes from './routes/distressRoutes.js';
import superadminRoutes from './routes/superAdminRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notifyRoutes from './routes/notificationRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';



// Load env vars
dotenv.config();
const mode = process.env.NODE_ENV || 'development';

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',      // Keeps your local Vite dev server working
    'http://localhost:3000',      // Keeps your local legacy server working
    'https://act-3.onrender.com'  // Add your NEW live Render frontend URL!
  ],
  credentials: true // Important if you are using cookies/sessions
}));

app.use(express.urlencoded({ limit: '30mb',  extended: true }));
app.use(express.json({ limit: '30mb' })); 

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'API is running...' });
});



app.use('/api/auth', authRoutes);
app.use('/api/user', profileRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/therapist', therapistRoutes);
app.use('/api/distress', distressRoutes);
app.use('/api', superadminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notifyRoutes);

// Error Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${mode} mode on port ${PORT}`);
});
