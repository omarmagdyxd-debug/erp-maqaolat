const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ===== الموظفون =====
router.get('/employees', async (req, res) => {
  const [rows] = await db.execute(`
    SELECT e.*, d.name as dept_name, j.title as job_title_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN job_titles j ON e.job_title_id = j.id
    WHERE e.status = 'active'
    ORDER BY e.full_name
  `);
  res.json(rows);
});

router.post('/employees', async (req, res) => {
  const { emp_code, full_name, national_id, birth_date, gender, phone, address, hire_date, department_id, job_title_id, basic_salary } = req.body;
  await db.execute(
    'INSERT INTO employees (emp_code,full_name,national_id,birth_date,gender,phone,address,hire_date,department_id,job_title_id,basic_salary) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [emp_code, full_name, national_id, birth_date, gender, phone, address, hire_date, department_id, job_title_id, basic_salary]
  );
  res.json({ success: true });
});

router.put('/employees/:id', async (req, res) => {
  const { full_name, phone, address, department_id, job_title_id, basic_salary, status } = req.body;
  await db.execute(
    'UPDATE employees SET full_name=?,phone=?,address=?,department_id=?,job_title_id=?,basic_salary=?,status=? WHERE id=?',
    [full_name, phone, address, department_id, job_title_id, basic_salary, status, req.params.id]
  );
  res.json({ success: true });
});

// ===== الحضور والغياب =====
router.get('/attendance', async (req, res) => {
  const { date } = req.query;
  const [rows] = await db.execute(`
    SELECT a.*, e.full_name, e.emp_code
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    WHERE a.att_date = ?
    ORDER BY e.full_name
  `, [date || new Date().toISOString().split('T')[0]]);
  res.json(rows);
});

router.post('/attendance', async (req, res) => {
  const { employee_id, att_date, check_in, check_out, status, notes } = req.body;
  await db.execute(
    'INSERT INTO attendance (employee_id,att_date,check_in,check_out,status,notes) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE check_in=?,check_out=?,status=?,notes=?',
    [employee_id, att_date, check_in, check_out, status, notes, check_in, check_out, status, notes]
  );
  res.json({ success: true });
});

// ===== الإجازات =====
router.get('/leaves', async (req, res) => {
  const [rows] = await db.execute(`
    SELECT l.*, e.full_name, e.emp_code
    FROM leaves l
    JOIN employees e ON l.employee_id = e.id
    ORDER BY l.created_at DESC
  `);
  res.json(rows);
});

router.post('/leaves', async (req, res) => {
  const { employee_id, leave_type, start_date, end_date, days_count, reason } = req.body;
  await db.execute(
    'INSERT INTO leaves (employee_id,leave_type,start_date,end_date,days_count,reason) VALUES (?,?,?,?,?,?)',
    [employee_id, leave_type, start_date, end_date, days_count, reason]
  );
  res.json({ success: true });
});

router.put('/leaves/:id/approve', async (req, res) => {
  const { status } = req.body;
  await db.execute('UPDATE leaves SET status=?, approved_by=? WHERE id=?',
    [status, req.session.user.id, req.params.id]);
  res.json({ success: true });
});

// ===== الرواتب =====
router.get('/payroll', async (req, res) => {
  const { month } = req.query;
  const [rows] = await db.execute(`
    SELECT p.*, e.full_name, e.emp_code
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    WHERE p.month = ?
    ORDER BY e.full_name
  `, [month]);
  res.json(rows);
});

router.post('/payroll/generate', async (req, res) => {
  const { month } = req.body;
  const [employees] = await db.execute("SELECT * FROM employees WHERE status='active'");
  
  for (const emp of employees) {
    const [absences] = await db.execute(
      "SELECT COUNT(*) as cnt FROM attendance WHERE employee_id=? AND SUBSTRING(att_date,1,7)=? AND status='absent'",
      [emp.id, month]
    );
    const [rewards] = await db.execute(
      "SELECT COALESCE(SUM(CASE WHEN type='reward' THEN amount ELSE 0 END),0) as r, COALESCE(SUM(CASE WHEN type='penalty' THEN amount ELSE 0 END),0) as p FROM rewards_penalties WHERE employee_id=? AND applied_month=?",
      [emp.id, month]
    );

    const absence_days = absences[0].cnt;
    const daily_rate = emp.basic_salary / 26;
    const absence_deduction = absence_days * daily_rate;
    const net = emp.basic_salary - absence_deduction + (rewards[0].r || 0) - (rewards[0].p || 0);

    await db.execute(
      'INSERT INTO payroll (employee_id,month,basic_salary,deductions,absence_deduction,net_salary) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE basic_salary=?,absence_deduction=?,net_salary=?',
      [emp.id, month, emp.basic_salary, rewards[0].p, absence_deduction, net, emp.basic_salary, absence_deduction, net]
    );
  }
  res.json({ success: true });
});

// ===== المكافآت والعقوبات =====
router.get('/rewards', async (req, res) => {
  const [rows] = await db.execute(`
    SELECT r.*, e.full_name FROM rewards_penalties r
    JOIN employees e ON r.employee_id = e.id
    ORDER BY r.issue_date DESC
  `);
  res.json(rows);
});

router.post('/rewards', async (req, res) => {
  const { employee_id, type, amount, reason, issue_date, applied_month } = req.body;
  await db.execute(
    'INSERT INTO rewards_penalties (employee_id,type,amount,reason,issue_date,applied_month) VALUES (?,?,?,?,?,?)',
    [employee_id, type, amount, reason, issue_date, applied_month]
  );
  res.json({ success: true });
});

// ===== الأقسام =====
router.get('/departments', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM departments');
  res.json(rows);
});

module.exports = router;