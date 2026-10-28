const express = require('express');
const { createSupabaseClient } = require('./supabase');

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function credentials(req, res, next) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  req.credentials = { email: email.trim(), password };
  next();
}

function unavailable(error) {
  return error && (!error.status || error.status >= 500 || error.status === 429);
}

function createAuthRouter(clientFactory = createSupabaseClient) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/auth/signup', credentials, asyncRoute(async (req, res) => {
    const { data, error } = await clientFactory().auth.signUp(req.credentials);
    if (unavailable(error)) return res.status(503).json({ error: 'Authentication service unavailable' });
    if (error) return res.status(400).json({ error: 'Unable to sign up with these credentials' });
    res.status(201).json({ user: data.user });
  }));

  router.post('/auth/login', credentials, asyncRoute(async (req, res) => {
    const { data, error } = await clientFactory().auth.signInWithPassword(req.credentials);
    if (unavailable(error)) return res.status(503).json({ error: 'Authentication service unavailable' });
    if (error || !data.session) return res.status(401).json({ error: 'Invalid login credentials' });
    const { access_token, refresh_token, token_type, expires_in, expires_at } = data.session;
    res.json({ access_token, refresh_token, token_type, expires_in, expires_at });
  }));

  return router;
}

module.exports = { createAuthRouter };
