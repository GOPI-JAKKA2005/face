/**
 * HTTP helper utilities for Vercel Serverless Functions.
 * Handles JSON serialization, standard error formatting, CORS, and HTTP method guards.
 */

import { getServerEnv } from './env.js';

export function setCors(req, res) {
  let env;
  try {
    env = getServerEnv();
  } catch (_e) {
    env = { CORS_ALLOWED_ORIGINS: 'http://localhost:5173' };
  }

  const allowedOrigins = (env.CORS_ALLOWED_ORIGINS || '*')
    .split(',')
    .map(o => o.trim());
  const origin = req.headers.origin;

  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Kiosk-Device-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(req, res);
    res.status(204).end();
    return true;
  }
  return false;
}

export function guardMethod(req, res, allowedMethods) {
  const methods = Array.isArray(allowedMethods) ? allowedMethods : [allowedMethods];
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    res.status(405).json({
      error: {
        code: 'method_not_allowed',
        message: `HTTP ${req.method} not allowed. Supported: ${methods.join(', ')}`
      }
    });
    return false;
  }
  return true;
}

export function sendJson(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(statusCode).json(data);
}

export function sendError(res, statusCode, code, message) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(statusCode).json({
    error: {
      code,
      message
    }
  });
}
