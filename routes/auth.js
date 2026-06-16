const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.json({ success: false, message: 'اسم المستخدم غير صحيح' });

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.json({ success: false, message: 'كلمة المرور غير صحيحة' });

    req.session.user = { id: rows[0].id, username: rows[0].username, role: rows[0].role };
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'خطأ في الاتصال بقاعدة البيانات' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

module.exports = router;