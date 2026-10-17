/**
 * Standalone Express Backend Server for Face Recognition Attendance System.
 * Hosts all /api endpoints locally on port 5000.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.server') });
dotenv.config();

// Import serverless endpoint handlers
import markHandler from './api/attendance/mark.js';
import listAttendanceHandler from './api/attendance/list.js';
import manualAttendanceHandler from './api/attendance/manual.js';
import exportAttendanceHandler from './api/attendance/export.js';
import attendanceByIdHandler from './api/attendance/[id].js';

import studentsIndexHandler from './api/students/index.js';
import studentByIdHandler from './api/students/[id].js';
import signatureHandler from './api/students/signature.js';

import settingsHandler from './api/settings/index.js';
import kioskConfigHandler from './api/kiosk/config.js';

import uploadImageHandler from './api/media/upload-image.js';
import videoHandler from './api/media/video.js';

import chatHandler from './api/chat/index.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and body parsing
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Helper to adapt serverless handlers to Express
const adapt = (handler) => async (req, res) => {
  try {
    // Merge URL params into query safely in Express 5
    if (req.params) {
      const merged = { ...(req.query || {}), ...req.params };
      Object.defineProperty(req, 'query', { value: merged, writable: true, configurable: true });
    }
    await handler(req, res);
  } catch (err) {
    console.error('API Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
};

const router = express.Router();

// Healthcheck
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'face-attend-backend', timestamp: new Date().toISOString() });
});

// Attendance Endpoints
router.all('/attendance/mark', adapt(markHandler));
router.all('/attendance/list', adapt(listAttendanceHandler));
router.all('/attendance/manual', adapt(manualAttendanceHandler));
router.all('/attendance/export', adapt(exportAttendanceHandler));
router.all('/attendance/:id', adapt(attendanceByIdHandler));

// Student Endpoints
router.all('/students/signature', adapt(signatureHandler));
router.all('/students/:id', adapt(studentByIdHandler));
router.all('/students', adapt(studentsIndexHandler));

// Settings & Kiosk Endpoints
router.all('/settings', adapt(settingsHandler));
router.all('/kiosk/config', adapt(kioskConfigHandler));

// Media Endpoints
router.all('/media/upload-image', adapt(uploadImageHandler));
router.all('/media/video', adapt(videoHandler));

// Chatbot Endpoint
router.all('/chat', adapt(chatHandler));

router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'face-attend-backend', timestamp: new Date().toISOString() });
});

app.use('/api', router);
app.use('/', router);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` FaceAttend Backend Server running on port ${PORT}`);
    console.log(` Healthcheck: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

export default app;
