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

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'face-attend-backend', timestamp: new Date().toISOString() });
});

// Attendance Endpoints
app.all('/api/attendance/mark', adapt(markHandler));
app.all('/api/attendance/list', adapt(listAttendanceHandler));
app.all('/api/attendance/manual', adapt(manualAttendanceHandler));
app.all('/api/attendance/export', adapt(exportAttendanceHandler));
app.all('/api/attendance/:id', adapt(attendanceByIdHandler));

// Student Endpoints
app.all('/api/students/signature', adapt(signatureHandler));
app.all('/api/students/:id', adapt(studentByIdHandler));
app.all('/api/students', adapt(studentsIndexHandler));

// Settings & Kiosk Endpoints
app.all('/api/settings', adapt(settingsHandler));
app.all('/api/kiosk/config', adapt(kioskConfigHandler));

// Media Endpoints
app.all('/api/media/upload-image', adapt(uploadImageHandler));
app.all('/api/media/video', adapt(videoHandler));

// Chatbot Endpoint
app.all('/api/chat', adapt(chatHandler));

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` FaceAttend Backend Server running on port ${PORT}`);
  console.log(` Healthcheck: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});

export default app;
