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

function requireAuth(clientFactory = createSupabaseClient) {
  return asyncRoute(async (req, res, next) => {
    res.set('WWW-Authenticate', 'Bearer');
    const match = /^Bearer[\t ]+([^\s]+)$/i.exec(req.get('Authorization') || '');
    if (!match) return res.status(401).json({ error: 'Access token required' });
    const client = clientFactory();
    const { data, error } = await client.auth.getUser(match[1]);
    if (unavailable(error)) return res.status(503).json({ error: 'Authentication service unavailable' });
    if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired token' });
    res.removeHeader('WWW-Authenticate');
    req.auth = { client, token: match[1], user: data.user };
    next();
  });
}

function createAuthRouter(clientFactory = createSupabaseClient) {
  const router = express.Router();
  const guard = requireAuth(clientFactory);
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

  router.get('/public/info', (req, res) => {
    res.json({ message: 'Welcome stranger! This info is public.' });
  });

  router.get('/protected/profile', guard, (req, res) => {
    const { id, email, created_at } = req.auth.user;
    res.json({ id, email, created_at });
  });

  router.get('/protected/dashboard', guard, (req, res) => {
    res.json({ message: 'Welcome to your dashboard!', user_id: req.auth.user.id });
  });

  router.post('/auth/logout', guard, asyncRoute(async (req, res) => {
    // This SDK method calls /auth/v1/logout with the caller's JWT.
    // It does not require a service_role key or shared SDK session storage.
    const { error } = await req.auth.client.auth.admin.signOut(req.auth.token, 'local');
    if (unavailable(error)) return res.status(503).json({ error: 'Authentication service unavailable' });
    if (error) return res.status(401).json({ error: 'Invalid or expired token' });
    res.status(204).send();
  }));

  return router;
}

module.exports = { createAuthRouter, requireAuth };
