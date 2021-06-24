// for deployment to hosting service
// This file starts an express server, serves static files (e.g. html), and routes API requests.

// values for node
const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');

// port config
const PORT = process.env.PORT || 3000;
const config = require('./config');
if (config.credentials.client_id == null || config.credentials.client_secret == null) {
  console.error('Missing FORGE_CLIENT_ID or FORGE_CLIENT_SECRET env. variables.');
  return;
}

// app name and keys with express
let app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  cookieSession({
    name: 'forge_session',
    keys: ['forge_secure_key'],
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days, same as refresh token
  })
);

// app routes with express
app.use(express.json({ limit: '50mb' }));
app.use('/api/forge', require('./routes/oauth'));
app.use('/api/forge', require('./routes/datamanagement'));
app.use('/api/forge', require('./routes/user'));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode).json(err);
});
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
