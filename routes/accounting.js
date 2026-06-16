const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ===== دليل الحسابات =====
router.get('/accounts', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM accounts ORDER BY code');
  res.json(rows);
});

router.post('/accounts', async (req, res) => {
  const { code, name, type, parent_id, balance_type, opening_balance } = req.body;
  await db.execute(
    'INSERT INTO accounts (code,name,type,parent_id,balance_type,opening_balance) VALUES (?,?,?,?,?,?)',
    [code, name, type, parent_id || null, balance_type, opening_balance || 0]
  );
  res.json({ success: true });
});

router.put('/accounts/:id', async (req, res) => {
  const { name, type, balance_type, is_active } = req.body;
  await db.execute(
    'UPDATE accounts SET name=?, type=?, balance_type=?, is_active=? WHERE id=?',
    [name, type, balance_type, is_active, req.params.id]
  );
  res.json({ success: true });
});

// كشف حساب (Account Statement) - كل الحركات على حساب معين
router.get('/accounts/:id/statement', async (req, res) => {
  const [rows] = await db.execute(`
    SELECT jl.*, je.entry_no, je.entry_date, je.description as entry_desc
    FROM journal_lines jl
    JOIN journal_entries je ON jl.entry_id = je.id
    WHERE jl.account_id = ?
    ORDER BY je.entry_date, je.id
  `, [req.params.id]);
  res.json(rows);
});

// ===== القيود اليومية =====
router.get('/journal', async (req, res) => {
  const [entries] = await db.execute(`
    SELECT je.*, 
      (SELECT SUM(debit) FROM journal_lines WHERE entry_id = je.id) as total_debit
    FROM journal_entries je
    ORDER BY je.entry_date DESC, je.id DESC
  `);
  res.json(entries);
});

router.get('/journal/:id', async (req, res) => {
  const [lines] = await db.execute(`
    SELECT jl.*, a.code, a.name as account_name
    FROM journal_lines jl
    JOIN accounts a ON jl.account_id = a.id
    WHERE jl.entry_id = ?
  `, [req.params.id]);
  res.json(lines);
});

router.post('/journal', async (req, res) => {
  const { entry_date, description, lines } = req.body;
  // lines = [{account_id, debit, credit, description}, ...]

  const totalDebit = lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.json({ success: false, message: 'القيد غير متوازن: المدين لا يساوي الدائن' });
  }

  const [countRows] = await db.execute('SELECT COUNT(*) as c FROM journal_entries');
  const entry_no = 'JE-' + String(countRows[0].c + 1).padStart(5, '0');

  const [result] = await db.execute(
    'INSERT INTO journal_entries (entry_no, entry_date, description) VALUES (?,?,?)',
    [entry_no, entry_date, description]
  );
  const entryId = result.insertId;

  for (const line of lines) {
    await db.execute(
      'INSERT INTO journal_lines (entry_id, account_id, debit, credit, description) VALUES (?,?,?,?,?)',
      [entryId, line.account_id, line.debit || 0, line.credit || 0, line.description || '']
    );
  }

  res.json({ success: true, entry_no });
});

router.delete('/journal/:id', async (req, res) => {
  await db.execute('DELETE FROM journal_entries WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// ===== ميزان المراجعة (Trial Balance) =====
router.get('/trial-balance', async (req, res) => {
  const [rows] = await db.execute(`
    SELECT a.id, a.code, a.name, a.type, a.balance_type, a.opening_balance,
      COALESCE(SUM(jl.debit),0) as total_debit,
      COALESCE(SUM(jl.credit),0) as total_credit
    FROM accounts a
    LEFT JOIN journal_lines jl ON jl.account_id = a.id
    WHERE a.is_active = 1
    GROUP BY a.id
    ORDER BY a.code
  `);

  const result = rows.map(r => {
    let balance;
    if (r.balance_type === 'debit') {
      balance = parseFloat(r.opening_balance) + parseFloat(r.total_debit) - parseFloat(r.total_credit);
    } else {
      balance = parseFloat(r.opening_balance) + parseFloat(r.total_credit) - parseFloat(r.total_debit);
    }
    return { ...r, balance };
  });

  res.json(result);
});

// ===== العملاء =====
router.get('/customers', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM customers ORDER BY name');
  res.json(rows);
});

router.post('/customers', async (req, res) => {
  const { name, phone, address } = req.body;
  const [countRows] = await db.execute('SELECT COUNT(*) as c FROM accounts WHERE code LIKE "1300%"');
  const code = '1300' + String(countRows[0].c).padStart(2, '0');

  const [accResult] = await db.execute(
    'INSERT INTO accounts (code, name, type, balance_type, parent_id) VALUES (?,?,"asset","debit",(SELECT id FROM accounts WHERE code="1300"))',
    [code, 'عميل - ' + name]
  );

  await db.execute(
    'INSERT INTO customers (name, phone, address, account_id) VALUES (?,?,?,?)',
    [name, phone, address, accResult.insertId]
  );
  res.json({ success: true });
});

// ===== الموردون =====
router.get('/suppliers', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM suppliers ORDER BY name');
  res.json(rows);
});

router.post('/suppliers', async (req, res) => {
  const { name, phone, address } = req.body;
  const [countRows] = await db.execute('SELECT COUNT(*) as c FROM accounts WHERE code LIKE "2100%"');
  const code = '2100' + String(countRows[0].c).padStart(2, '0');

  const [accResult] = await db.execute(
    'INSERT INTO accounts (code, name, type, balance_type, parent_id) VALUES (?,?,"liability","credit",(SELECT id FROM accounts WHERE code="2100"))',
    [code, 'مورد - ' + name]
  );

  await db.execute(
    'INSERT INTO suppliers (name, phone, address, account_id) VALUES (?,?,?,?)',
    [name, phone, address, accResult.insertId]
  );
  res.json({ success: true });
});

// ===== فواتير المبيعات =====
router.get('/sales-invoices', async (req, res) => {
  const [rows] = await db.execute(`
    SELECT si.*, c.name as customer_name
    FROM sales_invoices si
    JOIN customers c ON si.customer_id = c.id
    ORDER BY si.invoice_date DESC
  `);
  res.json(rows);
});

router.post('/sales-invoices', async (req, res) => {
  const { invoice_date, customer_id, total, notes } = req.body;
  const [countRows] = await db.execute('SELECT COUNT(*) as c FROM sales_invoices');
  const invoice_no = 'SI-' + String(countRows[0].c + 1).padStart(5, '0');

  // إنشاء قيد محاسبي: مدين العميل / دائن إيرادات المشاريع
  const [custRows] = await db.execute('SELECT account_id FROM customers WHERE id=?', [customer_id]);
  const [revAccount] = await db.execute('SELECT id FROM accounts WHERE code="4100"');

  const [entryResult] = await db.execute(
    'INSERT INTO journal_entries (entry_no, entry_date, description) VALUES (?,?,?)',
    ['JE-' + invoice_no, invoice_date, 'فاتورة مبيعات ' + invoice_no]
  );

  await db.execute(
    'INSERT INTO journal_lines (entry_id, account_id, debit, credit) VALUES (?,?,?,0)',
    [entryResult.insertId, custRows[0].account_id, total]
  );
  await db.execute(
    'INSERT INTO journal_lines (entry_id, account_id, debit, credit) VALUES (?,?,0,?)',
    [entryResult.insertId, revAccount[0].id, total]
  );

  await db.execute(
    'INSERT INTO sales_invoices (invoice_no, invoice_date, customer_id, total, notes, journal_entry_id) VALUES (?,?,?,?,?,?)',
    [invoice_no, invoice_date, customer_id, total, notes, entryResult.insertId]
  );

  res.json({ success: true, invoice_no });
});

// ===== فواتير المشتريات =====
router.get('/purchase-invoices', async (req, res) => {
  const [rows] = await db.execute(`
    SELECT pi.*, s.name as supplier_name
    FROM purchase_invoices pi
    JOIN suppliers s ON pi.supplier_id = s.id
    ORDER BY pi.invoice_date DESC
  `);
  res.json(rows);
});

router.post('/purchase-invoices', async (req, res) => {
  const { invoice_date, supplier_id, total, notes, expense_account_id } = req.body;
  const [countRows] = await db.execute('SELECT COUNT(*) as c FROM purchase_invoices');
  const invoice_no = 'PI-' + String(countRows[0].c + 1).padStart(5, '0');

  const [supRows] = await db.execute('SELECT account_id FROM suppliers WHERE id=?', [supplier_id]);

  const [entryResult] = await db.execute(
    'INSERT INTO journal_entries (entry_no, entry_date, description) VALUES (?,?,?)',
    ['JE-' + invoice_no, invoice_date, 'فاتورة مشتريات ' + invoice_no]
  );

  await db.execute(
    'INSERT INTO journal_lines (entry_id, account_id, debit, credit) VALUES (?,?,?,0)',
    [entryResult.insertId, expense_account_id, total]
  );
  await db.execute(
    'INSERT INTO journal_lines (entry_id, account_id, debit, credit) VALUES (?,?,0,?)',
    [entryResult.insertId, supRows[0].account_id, total]
  );

  await db.execute(
    'INSERT INTO purchase_invoices (invoice_no, invoice_date, supplier_id, total, notes, journal_entry_id) VALUES (?,?,?,?,?,?)',
    [invoice_no, invoice_date, supplier_id, total, notes, entryResult.insertId]
  );

  res.json({ success: true, invoice_no });
});

module.exports = router;