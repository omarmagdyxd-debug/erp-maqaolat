CREATE DATABASE IF NOT EXISTS erp_maqaolat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE erp_maqaolat;

-- جدول المستخدمين
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','hr','accountant','viewer') DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الأقسام
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  manager_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول المناصب الوظيفية
CREATE TABLE job_titles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  department_id INT,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- جدول الموظفين
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  emp_code VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  national_id VARCHAR(20) UNIQUE,
  birth_date DATE,
  gender ENUM('male','female'),
  phone VARCHAR(20),
  address TEXT,
  hire_date DATE NOT NULL,
  department_id INT,
  job_title_id INT,
  basic_salary DECIMAL(10,2) DEFAULT 0,
  status ENUM('active','inactive','terminated') DEFAULT 'active',
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (job_title_id) REFERENCES job_titles(id)
);

-- جدول الحضور والغياب
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  att_date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status ENUM('present','absent','late','half_day','holiday') DEFAULT 'present',
  notes TEXT,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- جدول الإجازات
CREATE TABLE leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type ENUM('annual','sick','emergency','unpaid','other') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INT NOT NULL,
  reason TEXT,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  approved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- جدول الرواتب
CREATE TABLE payroll (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  month VARCHAR(7) NOT NULL,
  basic_salary DECIMAL(10,2) DEFAULT 0,
  allowances DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  absence_deduction DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2) DEFAULT 0,
  paid_date DATE,
  status ENUM('pending','paid') DEFAULT 'pending',
  notes TEXT,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- جدول المكافآت والعقوبات
CREATE TABLE rewards_penalties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  type ENUM('reward','penalty') NOT NULL,
  amount DECIMAL(10,2) DEFAULT 0,
  reason TEXT,
  issue_date DATE NOT NULL,
  applied_month VARCHAR(7),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- إضافة مستخدم admin افتراضي (باسورد: admin123)
INSERT INTO users (username, password, role) VALUES 
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh8y', 'admin');

-- إضافة أقسام أولية
INSERT INTO departments (name) VALUES 
('الإدارة العامة'), ('الموارد البشرية'), ('المحاسبة'), ('المشاريع'), ('المخازن');