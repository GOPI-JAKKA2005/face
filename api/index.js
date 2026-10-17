import { sendJson, setCors } from './_lib/http.js';

export default async function handler(req, res) {
  setCors(req, res);
  return sendJson(res, 200, {
    status: 'ok',
    service: 'FaceAttend API (Serverless)',
    timestamp: new Date().toISOString()
  });
}