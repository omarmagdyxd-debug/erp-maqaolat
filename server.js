const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

function isAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login.html');
}

const authRoutes = require('./routes/auth');
const hrRoutes = require('./routes/hr');
const accountingRoutes = require('./routes/accounting');

app.use('/api/auth', authRoutes);
app.use('/api/hr', isAuth, hrRoutes);
app.use('/api/accounting', isAuth, accountingRoutes);

app.get('/', isAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/hr', isAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'hr.html'));
});

app.get('/accounting', isAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'accounting.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ السيرفر شغال على http://localhost:${PORT}`);
});