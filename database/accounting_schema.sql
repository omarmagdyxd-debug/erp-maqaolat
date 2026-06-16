USE erp_maqaolat;

-- ===== دليل الحسابات (Chart of Accounts) =====
CREATE TABLE accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  type ENUM('asset','liability','equity','revenue','expense') NOT NULL,
  parent_id INT NULL,
  level INT DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  opening_balance DECIMAL(14,2) DEFAULT 0,
  balance_type ENUM('debit','credit') DEFAULT 'debit',
  FOREIGN KEY (parent_id) REFERENCES accounts(id)
);

-- ===== القيود اليومية (رأس القيد) =====
CREATE TABLE journal_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_no VARCHAR(30) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  project_id INT NULL,
  created_by INT,
  status ENUM('draft','posted') DEFAULT 'posted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== تفاصيل القيد (سطور مدين/دائن) =====
CREATE TABLE journal_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  account_id INT NOT NULL,
  debit DECIMAL(14,2) DEFAULT 0,
  credit DECIMAL(14,2) DEFAULT 0,
  description VARCHAR(255),
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- ===== الموردون =====
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  account_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- ===== العملاء =====
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  account_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- ===== فواتير المبيعات =====
CREATE TABLE sales_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(30) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  customer_id INT NOT NULL,
  total DECIMAL(14,2) DEFAULT 0,
  paid DECIMAL(14,2) DEFAULT 0,
  status ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  notes TEXT,
  journal_entry_id INT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
);

-- ===== فواتير المشتريات =====
CREATE TABLE purchase_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(30) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  supplier_id INT NOT NULL,
  total DECIMAL(14,2) DEFAULT 0,
  paid DECIMAL(14,2) DEFAULT 0,
  status ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  notes TEXT,
  journal_entry_id INT NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
);

-- ===== إضافة دليل حسابات أساسي =====
INSERT INTO accounts (code, name, type, balance_type) VALUES
('1000', 'الأصول', 'asset', 'debit'),
('1100', 'الصندوق', 'asset', 'debit'),
('1200', 'البنك', 'asset', 'debit'),
('1300', 'العملاء', 'asset', 'debit'),
('1400', 'المخزون', 'asset', 'debit'),
('2000', 'الخصوم', 'liability', 'credit'),
('2100', 'الموردون', 'liability', 'credit'),
('3000', 'حقوق الملكية', 'equity', 'credit'),
('3100', 'رأس المال', 'equity', 'credit'),
('4000', 'الإيرادات', 'revenue', 'credit'),
('4100', 'إيرادات المشاريع', 'revenue', 'credit'),
('5000', 'المصروفات', 'expense', 'debit'),
('5100', 'مصروفات الرواتب', 'expense', 'debit'),
('5200', 'مصروفات المواد', 'expense', 'debit'),
('5300', 'مصروفات عمومية وإدارية', 'expense', 'debit');