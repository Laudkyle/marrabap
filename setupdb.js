const sqlite3 = require("sqlite3").verbose();

// Open a database or create it if it doesn't exist
const db = new sqlite3.Database("./shopdb.sqlite", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

db.serialize(() => {
  const defaultAccounts = [
    {
      account_code: "1000",
      account_name: "Cash In Hand",
      account_type: "asset",
      balance: 0,
    },
    {
      account_code: "1015",
      account_name: "Bank Account",
      account_type: "asset",
      balance: 0,
    },
    {
      account_code: "1020",
      account_name: "Inventory",
      account_type: "asset",
      balance: 0,
    },
    
    {
      account_code: "1010",
      account_name: "Trade Accounts Receivable",
      account_type: "asset",
      balance: 0,
    },
    {
      account_code: "2000",
      account_name: "Payables",
      account_type: "liability",
      balance: 0,
    },
    {
      account_code: "5000",
      account_name: "Cost of Goods Sold",
      account_type: "expense",
      balance: 0,
    },
    {
      account_code: "4000",
      account_name: "Sales Revenue",
      account_type: "revenue",
      balance: 0,
    },
    {
      account_code: "2030",
      account_name: "VAT Payable",
      account_type: "liability",
      balance: 0,
    },
    {
      account_code: "2040",
      account_name: "VAT Receivable",
      account_type: "asset",
      balance: 0,
    },
    {
      account_code: "3000",
      account_name: "Owner's Equity",
      account_type: "equity",
      balance: 0,
    },
    {
      account_code: "5010",
      account_name: "Advances",
      account_type: "asset",
      balance: 0,
    },
    {
      account_code: "5020",
      account_name: "Prepayments",
      account_type: "liability",
      balance: 0,
    },
    {
      account_code: "2010",
      account_name: "Sales Tax Payable",
      account_type: "liability",
      balance: 0,
    },
    {
      account_code: "2020",
      account_name: "Purchase Tax Recoverable",
      account_type: "asset",
      balance: 0,
    },
    {
      account_code: "2050",
      account_name: "Income Tax Payable",
      account_type: "liability",
      balance: 0,
    },
    {
      account_code: "6000",
      account_name: "Discounts",
      account_type: "expense",
      balance: 0,
    },
    {
      account_code: "1030",
      account_name: "Unbilled Purchases",
      account_type: "asset",
      balance: 0,
    },
    {
      account_code: "6100",
      account_name: "Loss from Disposal",
      account_type: "expense",
      balance: 0,
    },
    {
      account_code: "7000",
      account_name: "Contra Account",
      account_type: "adjustment",
      balance: 0,
    },
    {
      account_code: "7001",
      account_name: "Correction Adjustments",
      account_type: "adjustment",
      balance: 0,
    },
    {
      account_code: "7001",
      account_name: "Correction Adjustments",
      account_type: "adjustment",
      balance: 0,
    },
    {
      account_code: "7002",
      account_name: "Reconciliation Adjustments",
      account_type: "adjustment",
      balance: 0,
    },
    {
      account_code: "7003",
      account_name: "Depreciation Adjustments",
      account_type: "adjustment",
      balance: 0,
    },
    {
      account_code: "7004",
      account_name: "Accrual Adjustments",
      account_type: "adjustment",
      balance: 0,
    },
    {
      account_code: "7005",
      account_name: "Prepaid Adjustments",
      account_type: "adjustment",
      balance: 0,
    },
    {
      account_code: "7006",
      account_name: "Deferral Adjustments",
      account_type: "adjustment",
      balance: 0,
    },
    {
      account_code: "7007",
      account_name: "Write-off Adjustments",
      account_type: "adjustment",
      balance: 0,
    },
    {
      account_code: "7008",
      account_name: "Tax Adjustments",
      account_type: "adjustment",
      balance: 0,
    },{
      account_code: "3000",
      account_name: "Accounts Receivable",
      account_type: "asset",
      balance: 0,
    },
    {
      account_code: "1011",
      account_name: "Notes Receivable",
      account_type: "asset",
      balance: 0,
    },
    {
      account_code: "1012",
      account_name: "interests Receivable",
      account_type: "asset",
      balance: 0,
    },
    {
      account_code: "0101",
      account_name: "Cash",
      account_type: "asset",
      balance: 0,
    },
    {
      account_code: "0202",
      account_name: "Account Payables",
      account_type: "liability",
      balance: 0,
    },
  ];
  

  db.run(`CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id INTEGER PRIMARY KEY,
    account_code TEXT NOT NULL UNIQUE, -- Unique identifier for the account
    account_name TEXT NOT NULL, -- Name of the account
    account_type TEXT NOT NULL CHECK(account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')), -- Type of account
    balance FLOAT DEFAULT 0,
    is_current BOOLEAN DEFAULT 1,
    opening_balance_journal_entry_id INTEGER,
    parent_account_id INTEGER, -- For hierarchical accounts
    FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id)
  )`);

  defaultAccounts.forEach((account) => {
    db.run(
      `INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type,balance)
       VALUES (?, ?, ?,?)`,
      [
        account.account_code,
        account.account_name,
        account.account_type,
        account.balance,
      ]
    );
  });
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    cp REAL CHECK(cp >= 0), -- Cost Price with non-negative constraint
    sp REAL CHECK(sp >= 0), -- Selling Price with non-negative constraint
    image TEXT, -- Optional, for product image URL or file path
    suppliers_id INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (suppliers_id) REFERENCES suppliers(id)
);`);
db.run(
  `CREATE TABLE adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_number TEXT NOT NULL,
    account_id INTEGER NOT NULL,
    adjustment_type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    date DATE NOT NULL,
    entry_type TEXT NOT NULL,
    status TEXT NOT NULL,
    document_reference TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    journal_entry_id INTEGER,
    affected_period_year INTEGER,
    affected_period_quarter INTEGER,
    affected_period_month INTEGER
  )`
);
  db.run(`

    CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE, -- Unique purchase order reference
  supplier_id INTEGER NOT NULL,
  total_amount REAL NOT NULL CHECK(total_amount >= 0),
  order_status TEXT DEFAULT 'pending' CHECK(order_status IN ('pending', 'received', 'cancelled')),
  payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partial', 'paid')),
  date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);`);
  db.run(`
CREATE TABLE IF NOT EXISTS purchase_order_details (
  id INTEGER PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity >= 0),
  unit_price REAL NOT NULL CHECK(unit_price >= 0),
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

`);

  db.run(`
CREATE TABLE temp_purchase_order_items (
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL CHECK(unit_price >= 0)
);
`);
  db.run(`
CREATE TRIGGER update_purchase_order_details
AFTER INSERT ON purchase_orders
FOR EACH ROW
BEGIN
  -- Insert corresponding details into the purchase_order_details table
  INSERT INTO purchase_order_details (purchase_order_id, product_id, quantity, unit_price)
  SELECT NEW.id, product_id, quantity, unit_price
  FROM temp_purchase_order_items;

  -- Clear the temp_purchase_order_items table to prevent duplicate entries
  DELETE FROM temp_purchase_order_items;
END;

)`);
  db.run(`CREATE TRIGGER IF NOT EXISTS delete_purchase_order_details
  AFTER DELETE ON purchase_orders
  FOR EACH ROW
  BEGIN
    DELETE FROM purchase_order_details WHERE purchase_order_id = OLD.id;
  END;
  `);
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique inventory record ID
  product_id INTEGER NOT NULL, -- Foreign key to Products table
  quantity_in_stock INTEGER NOT NULL DEFAULT 0 CHECK(quantity_in_stock >= 0), -- Stock quantity (cannot be negative)
  cost_per_unit REAL NOT NULL CHECK(cost_per_unit >= 0), -- Cost per unit (cannot be negative)
  FOREIGN KEY (product_id) REFERENCES products(id) -- Linking to the products table
);
`);

  db.run(`CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL, -- References the product being adjusted
    date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Movement date
    reference_number TEXT NOT NULL, -- Links to the transaction (e.g., invoice or purchase order)
    quantity INTEGER NOT NULL, -- Positive for additions, negative for subtractions
    movement_type TEXT NOT NULL CHECK(movement_type IN ('purchase', 'sale', 'return', 'adjustment')), -- Type of movement
    cost REAL NOT NULL CHECK(cost >= 0), -- Unit cost (important for COGS calculations)
    description TEXT, -- Additional details (optional)
    FOREIGN KEY (product_id) REFERENCES products(id))`);

  db.run(`-- Sales Table (Modified)
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY,
  reference_number TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL DEFAULT 1, -- Default to "Walk-in" customer
  quantity INTEGER CHECK(quantity >= 0), -- Quantity must be positive
  total_price REAL CHECK(total_price >= 0), -- Ensure total is non-negative
  date TEXT NOT NULL, -- ISO 8601 format recommended (YYYY-MM-DD)
  payment_method TEXT, -- e.g., 'cash', 'credit'
  selling_price REAL CHECK(selling_price >= 0), -- Selling price for the product
  discount_type TEXT, -- 'percentage' or 'fixed' discount type
  discount_amount REAL CHECK(discount_amount >= 0), -- Discount amount
  description TEXT, -- Additional description/details about the sale
  return_status TEXT DEFAULT 'not_returned' CHECK(return_status IN ('not_returned', 'returned', 'partial_return')),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
)`);
db.run(`
CREATE TABLE IF NOT EXISTS sales_taxes (
  id INTEGER PRIMARY KEY,
  sale_id INTEGER NOT NULL, -- Links to sales
  tax_id INTEGER NOT NULL, -- Links to taxes
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (tax_id) REFERENCES taxes(id) ON DELETE CASCADE
);`)
db.run(`CREATE TABLE IF NOT EXISTS sale_tax_amounts (
  id INTEGER PRIMARY KEY,
  sale_tax_id INTEGER NOT NULL, -- Links to sales_taxes
  tax_amount REAL CHECK(tax_amount >= 0), -- Computed tax amount per sale
  FOREIGN KEY (sale_tax_id) REFERENCES sales_taxes(id) ON DELETE CASCADE
);`)
  db.run(`CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL, -- Reference to the customer
  reference_number TEXT NOT NULL, -- Links payment to an invoice
  payment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Date and time of payment
  amount_paid REAL NOT NULL CHECK(amount_paid > 0), -- Payment amount must be positive
  payment_method TEXT, -- Optional (e.g., cash, credit card, etc.)
  payment_reference TEXT -- Optional payment reference number
)`);
  db.run(`CREATE TABLE IF NOT EXISTS supplier_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,  -- Reference to the supplier
  purchase_order_id INTEGER,     -- Reference to the purchase order (optional if not linked directly to PO)
  payment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- Date and time of payment
  amount_paid REAL NOT NULL CHECK(amount_paid > 0),      -- Payment amount (must be positive)
  payment_method TEXT,           -- Method of payment (e.g., cash, credit card)
  payment_reference TEXT,        -- Optional payment reference number
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id), -- Linking to the suppliers table
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)  -- Linking to the purchase orders table (optional)
);
`);
  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_number TEXT UNIQUE NOT NULL, -- Unique identifier for the invoice
    customer_id INTEGER NOT NULL, -- Links the invoice to a customer
    issue_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Invoice issue date
    due_date TEXT, -- Due date for payment
    total_amount REAL NOT NULL CHECK(total_amount >= 0), -- Total invoice amount
    amount_paid REAL DEFAULT 0 CHECK(amount_paid >= 0), -- Amount paid towards the invoice
    balance_due REAL GENERATED ALWAYS AS (total_amount - amount_paid) VIRTUAL, -- Calculated field for balance
    status TEXT DEFAULT 'unpaid', -- Status: unpaid, partial, or paid
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
)
`);

  db.run(`CREATE TABLE IF NOT EXISTS supplier_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique invoice ID
    reference_number TEXT UNIQUE NOT NULL, -- Unique identifier for the invoice
    supplier_id INTEGER NOT NULL, -- Links the invoice to a supplier
    purchase_order_id INTEGER, -- Links the invoice to a purchase order, if applicable
    issue_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Invoice issue date
    due_date TEXT, -- Due date for payment
    total_amount REAL NOT NULL CHECK(total_amount >= 0), -- Total invoice amount
    amount_paid REAL DEFAULT 0 CHECK(amount_paid >= 0), -- Amount paid towards the invoice
    balance_due REAL GENERATED ALWAYS AS (total_amount - amount_paid) VIRTUAL, -- Calculated balance due
    status TEXT DEFAULT 'unpaid', -- Status: unpaid, partial, or paid
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE, -- Supplier reference
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL -- Link to purchase order (optional)
);
`);
  db.run(`CREATE TABLE IF NOT EXISTS returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL, -- Links the return to the specific sale
  product_id INTEGER NOT NULL, -- Links to the product being returned
  customer_id INTEGER NOT NULL, -- Links to the customer making the return
  reference_number TEXT NOT NULL, -- Unique reference number for the sale
  return_quantity INTEGER NOT NULL CHECK(return_quantity >= 0), -- Quantity being returned must be non-negative
  action TEXT NOT NULL CHECK(action IN ('restock', 'dispose')), -- Specifies whether returned items are restocked or disposed
  return_date TEXT NOT NULL, -- ISO 8601 format (YYYY-MM-DD) recommended
  selling_price REAL CHECK(selling_price >= 0), -- Selling price of the product being returned
  tax REAL CHECK(tax >= 0), -- Tax applied to the returned product
  discount_amount REAL CHECK(discount_amount >= 0), -- Discount amount applied
  discount_type TEXT,
  payment_method TEXT,
  total_refund REAL CHECK(total_refund >= 0), -- Total refund amount for the return
  return_type TEXT CHECK(return_type IN ('full', 'partial')) NOT NULL DEFAULT 'partial', -- Full or partial return
  reason TEXT, -- Reason for the return (e.g., defective, wrong item)
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending', -- Approval status
  journal_entry_id INTEGER, -- Links the return to a journal entry
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
);
`);

  db.run(`CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL, -- "Individual" or "Business"
    contact_id TEXT UNIQUE NOT NULL,
    business_name TEXT, -- Null for individuals
    name TEXT NOT NULL,
    email TEXT UNIQUE, -- Optional, can be NULL
    tax_number TEXT, -- Optional
    pay_term TEXT, -- Payment terms
    opening_balance REAL DEFAULT 0 CHECK(opening_balance >= 0),
    advance_balance REAL DEFAULT 0 CHECK(advance_balance >= 0),
    added_on TEXT NOT NULL, -- Date of addition
    address TEXT,
    mobile TEXT UNIQUE, -- Must be unique
    total_purchase_due REAL DEFAULT 0 CHECK(total_purchase_due >= 0),
    total_purchase_return_due REAL DEFAULT 0 CHECK(total_purchase_return_due >= 0),
    active_status INTEGER DEFAULT 1 CHECK(active_status IN (0, 1)) -- Active or inactive
)`);

  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    contact_id TEXT UNIQUE NOT NULL,
    customer_type TEXT NOT NULL, -- "Individual" or "Business"
    business_name TEXT, -- Null for individuals
    name TEXT NOT NULL,
    email TEXT UNIQUE, -- Optional, can be NULL
    tax_number TEXT, -- Optional
    credit_limit REAL DEFAULT 0 CHECK(credit_limit >= 0),
    pay_term TEXT,
    opening_balance REAL DEFAULT 0 CHECK(opening_balance >= 0),
    advance_balance REAL DEFAULT 0 CHECK(advance_balance >= 0),
    added_on TEXT NOT NULL,
    address TEXT,
    mobile TEXT,
    customer_group TEXT,
    total_sale_due REAL DEFAULT 0 CHECK(total_sale_due >= 0),
    total_sell_return_due REAL DEFAULT 0 CHECK(total_sell_return_due >= 0),
    active_status INTEGER DEFAULT 1 CHECK(active_status IN (0, 1)) -- Active or inactive
)`);

  db.run(`INSERT OR IGNORE INTO customers (
  id, 
  contact_id, 
  customer_type, 
  name, 
  business_name, 
  added_on, 
  active_status
) VALUES (
  1, 
  'walkin', 
  'Individual', 
  'Walk-in Customer', 
  NULL, 
  DATE('now'), 
  1
);`);
  db.run(`CREATE TABLE IF NOT EXISTS customer_groups (
    id INTEGER PRIMARY KEY,
    group_name TEXT NOT NULL UNIQUE,
    discount REAL DEFAULT 0 CHECK(discount >= 0),
    discount_type TEXT DEFAULT 'percentage' CHECK(discount_type IN ('percentage', 'amount')), -- Discount type
    tax_type TEXT DEFAULT 'VAT', -- Tax type
    tax_rate REAL DEFAULT 0 CHECK(tax_rate >= 0), -- Tax rate must be non-negative
    tax_type_details TEXT, -- Optional, extra details about the tax type
    description TEXT, -- Optional description
    active_status INTEGER DEFAULT 1 CHECK(active_status IN (0, 1)) -- Active or inactive
)`);
  db.run(`CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY,
  reference_number TEXT NOT NULL,
  details JSON NOT NULL, -- Stores product_id and quantity as a JSON object
  date TEXT NOT NULL, -- Date the draft was created (ISO 8601 format YYYY-MM-DD)
  status TEXT DEFAULT 'pending', -- Can be 'pending', 'saved', 'completed', etc.
  FOREIGN KEY (id) REFERENCES products (id)
)`);
  db.run(`CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('sale', 'return', 'expense','stock','payment')), -- Type of transaction
  reference_number TEXT NOT NULL, -- Associated transaction's reference number
  document_name TEXT NOT NULL, -- Name of the document
  file_path TEXT NOT NULL, -- File path where the document is stored
  uploaded_on TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- Date and time of upload
);`);

  db.run(`CREATE TABLE IF NOT EXISTS general_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  date TEXT NOT NULL, -- Transaction date
  description TEXT, -- Details of the transaction
  debit REAL DEFAULT 0 CHECK(debit >= 0), -- Debit amount
  credit REAL DEFAULT 0 CHECK(credit >= 0), -- Credit amount
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);`);

  db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique ID for each entry
  reference_number TEXT NOT NULL, -- Grouping identifier (not unique)
  date TEXT NOT NULL, -- Transaction date
  description TEXT, -- Summary of the transaction
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'posted')), -- Posting status
  adjustment_type TEXT NOT NULL DEFAULT 'NON ADJUSTMENT',
  created_on TEXT DEFAULT CURRENT_TIMESTAMP -- Timestamp
)`);


  db.run(`CREATE TABLE IF NOT EXISTS taxes (
  id INTEGER PRIMARY KEY,
  tax_name TEXT NOT NULL UNIQUE, -- Name of the tax
  tax_rate REAL NOT NULL CHECK(tax_rate >= 0), -- Tax rate
  tax_type TEXT CHECK(tax_type IN ('inclusive', 'exclusive')), -- How tax is applied
  account_id INTEGER NOT NULL, -- Linked to the chart of accounts
  created_on TEXT DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the tax is created
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);`);

  db.run(`CREATE TABLE IF NOT EXISTS fixed_assets (
  id INTEGER PRIMARY KEY,
  asset_name TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  cost REAL NOT NULL CHECK(cost >= 0),
  useful_life INTEGER NOT NULL CHECK(useful_life > 0), -- In years
  depreciation_method TEXT CHECK(depreciation_method IN ('straight_line', 'reducing_balance')), -- Depreciation type
  salvage_value REAL DEFAULT 0 CHECK(salvage_value >= 0), -- Residual value
  accumulated_depreciation REAL DEFAULT 0 CHECK(accumulated_depreciation >= 0),
  account_id INTEGER NOT NULL, -- Linked to chart of accounts
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);`);

  db.run(`CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  budget_amount REAL NOT NULL CHECK(budget_amount >= 0), -- Planned budget
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);`);

db.run(`CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  journal_entry_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  debit REAL DEFAULT 0 CHECK(debit >= 0),
  credit REAL DEFAULT 0 CHECK(credit >= 0),
  entry_type TEXT NOT NULL DEFAULT 'GENERAL',
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
)`);


  db.run(`CREATE TABLE IF NOT EXISTS audit_trails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, -- User making the change
  table_name TEXT NOT NULL, -- Affected table
  record_id INTEGER NOT NULL, -- Affected record
  action TEXT NOT NULL CHECK(action IN ('insert', 'update', 'delete')), -- Type of change
  change_date TEXT DEFAULT CURRENT_TIMESTAMP, -- Timestamp
  changes TEXT -- JSON object capturing the change details
)`);

  db.run(`INSERT INTO suppliers (
    type, 
    contact_id, 
    name, 
    added_on, 
    mobile, 
    active_status
) VALUES (
    'Individual',          -- Supplier type: 'Individual' or 'Business'
    'SUP123456',           -- A unique identifier for the supplier (can be generated or assigned)
    'Generic Supplier',    -- Supplier name (e.g., 'Generic Supplier')
    datetime('now'),       -- Date of addition (current date and time)
    '1234567890',          -- Mobile number (ensure it’s unique)
    1                      -- Active status: 1 means active
);`);
  db.run(`CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_date DATE NOT NULL,
  amount DECIMAL NOT NULL,
  expense_account_id INTEGER,  -- Refers to the account ID from the chart of accounts (e.g., Cost of Goods Sold)
  payment_method VARCHAR,      -- Cash, bank transfer, credit card, etc.
  description TEXT,            -- A short description of the expense
  journal_entry_id INTEGER,    -- The ID of the journal entry created for this expense
  FOREIGN KEY (expense_account_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
);

`);
db.run(`CREATE TABLE expense_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER UNIQUE NOT NULL, -- Links to expenses table
  reference_number TEXT UNIQUE NOT NULL, -- Unique invoice reference
  issue_date DATE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Invoice date
  total_amount DECIMAL NOT NULL CHECK(total_amount >= 0), -- Invoice total
  amount_paid DECIMAL DEFAULT 0 CHECK(amount_paid >= 0), -- Amount paid
  balance_due DECIMAL GENERATED ALWAYS AS (total_amount - amount_paid) VIRTUAL, -- Auto-calculated balance
  status TEXT DEFAULT 'unpaid', -- Status: unpaid, partial, paid
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
);
`)
db.run(`CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_date DATE NOT NULL,
  amount DECIMAL NOT NULL,
  account_id INTEGER,           -- Refers to an account from the chart_of_accounts (e.g., revenue, bank, or expense)
  payment_method VARCHAR,       -- Cash, bank transfer, credit card, etc.
  description TEXT,             -- A short description of the transaction
  status VARCHAR DEFAULT 'pending', -- Status of the transaction (pending or completed)
  journal_entry_id INTEGER,     -- Links to the journal entry created for this transaction
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
);
`);

  // Triggers
  db.run(`CREATE TRIGGER after_supplier_insert
AFTER INSERT ON suppliers
FOR EACH ROW
BEGIN
  -- 1. Update Supplier Balance (if opening balance exists)
  UPDATE suppliers
  SET total_purchase_due = COALESCE(NEW.opening_balance, 0)
  WHERE id = NEW.id;

  -- 2. Insert into Audit Trail
  INSERT INTO audit_trails (user_id, table_name, record_id, action, change_date, changes)
  VALUES (
    1,  -- Example: assuming user_id is 1 (this should be dynamically set based on the logged-in user)
    'suppliers',  -- Affected table
    NEW.id,  -- Supplier ID of the newly created supplier
    'insert',  -- Action type: insert
    CURRENT_TIMESTAMP,  -- Timestamp of the action
    '{"name": "' || NEW.name || '", "mobile": "' || NEW.mobile || '"}'  -- JSON representing changes (e.g., name and mobile)
  );

  -- 3. Update General Ledger (if applicable)
  -- Conditional insertion based on opening balance
  INSERT INTO general_ledger (account_id, date, description, debit, credit)
  SELECT 
    -- If opening_balance is positive, debit Accounts Receivable (asset), otherwise credit Accounts Payable (liability)
    CASE 
      WHEN NEW.opening_balance > 0 THEN (SELECT id FROM chart_of_accounts WHERE account_code = '1010')  -- Debit Accounts Receivable
      ELSE (SELECT id FROM chart_of_accounts WHERE account_code = '2000')  -- Credit Accounts Payable
    END,
    CURRENT_TIMESTAMP,  -- Transaction date
    'Opening balance for supplier ' || NEW.name,  -- Description
    -- Debit if opening_balance is positive, otherwise 0
    CASE 
      WHEN NEW.opening_balance > 0 THEN NEW.opening_balance 
      ELSE 0 
    END,
    -- Credit if opening_balance is negative, otherwise 0
    CASE 
      WHEN NEW.opening_balance < 0 THEN ABS(NEW.opening_balance) 
      ELSE 0 
    END;
END;

`);

  db.run(`CREATE TRIGGER after_purchase_order_insert
AFTER INSERT ON purchase_orders
FOR EACH ROW
BEGIN
  -- 1. Update Supplier Balance (Optional)
  UPDATE suppliers
  SET total_purchase_due = total_purchase_due + NEW.total_amount
  WHERE id = NEW.supplier_id;

  -- 2. Insert into Audit Trail
  INSERT INTO audit_trails (user_id, table_name, record_id, action, change_date, changes)
  VALUES (
    1,  -- Example user ID
    'purchase_orders',
    NEW.id,
    'insert',
    CURRENT_TIMESTAMP,
    '{"reference_number": "' || NEW.reference_number || '", "total_amount": ' || NEW.total_amount || '}'
  );

  -- 3. Create Supplier Invoice if Status is Pending
  INSERT INTO supplier_invoices (reference_number, supplier_id, purchase_order_id, total_amount, status)
  SELECT 
    NEW.reference_number,   -- Reference number from the purchase order
    NEW.supplier_id,        -- Supplier ID from the purchase order
    NEW.id,                 -- Purchase order ID
    NEW.total_amount,       -- Total amount from the purchase order
    'unpaid'                -- Initial status set to 'unpaid'
  WHERE NEW.order_status = 'pending';  -- Only create invoice if status is 'pending'

  -- No General Ledger Entry for Pending Purchase Order
END;
`);

db.run(`CREATE TRIGGER handle_sales_updates
AFTER INSERT ON sales
BEGIN
    -- Create a new journal entry for the sale
    INSERT INTO journal_entries (reference_number, date, description, status)
    VALUES (
        'SALE-' || NEW.id,
        CURRENT_DATE,
        'Sale of product ' || NEW.product_id,
        'posted'
    );

    -- Sales Revenue (Based on selling price minus discount, before tax)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (
        (SELECT last_insert_rowid()),
        (SELECT id FROM chart_of_accounts WHERE account_code = '4000'),
        0,
        NEW.selling_price * NEW.quantity - 
            CASE 
                WHEN NEW.discount_type = 'percentage' THEN (NEW.selling_price * NEW.quantity * NEW.discount_amount / 100)
                WHEN NEW.discount_type = 'fixed' THEN NEW.discount_amount
                ELSE 0
            END
    );

    -- Accounts Receivable for credit sales (total price including all taxes)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    SELECT
        (SELECT last_insert_rowid()),
        (SELECT id FROM chart_of_accounts WHERE account_code = '1010'),
        NEW.total_price,
        0
    WHERE NEW.payment_method = 'credit';

    -- Cost of Goods Sold
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (
        (SELECT last_insert_rowid()),
        (SELECT id FROM chart_of_accounts WHERE account_code = '5000'),
        ROUND((SELECT cost_per_unit * NEW.quantity FROM inventory WHERE inventory.product_id = NEW.product_id), 2),
        0
    );

    -- Inventory reduction
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (
        (SELECT last_insert_rowid()),
        (SELECT id FROM chart_of_accounts WHERE account_code = '1020'),
        0,
        ROUND((SELECT cost_per_unit * NEW.quantity FROM inventory WHERE inventory.product_id = NEW.product_id), 2)
    );

    -- Discount Entries (if applicable)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    SELECT 
        (SELECT last_insert_rowid()),
        (SELECT id FROM chart_of_accounts WHERE account_code = '6000'),
        ROUND(
            CASE 
                WHEN NEW.discount_type = 'percentage' THEN (NEW.selling_price * NEW.quantity * NEW.discount_amount / 100)
                WHEN NEW.discount_type = 'fixed' THEN NEW.discount_amount
                ELSE 0
            END, 
            2
        ),
        0
    WHERE NEW.discount_amount > 0;

    -- Accounts Receivable adjustment for discount (if applicable)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    SELECT 
        (SELECT last_insert_rowid()),
        (SELECT id FROM chart_of_accounts WHERE account_code = '1010'),
        0,
        ROUND(
            CASE 
                WHEN NEW.discount_type = 'percentage' THEN (NEW.selling_price * NEW.quantity * NEW.discount_amount / 100)
                WHEN NEW.discount_type = 'fixed' THEN NEW.discount_amount
                ELSE 0
            END, 
            2
        )
    WHERE NEW.discount_amount > 0 AND NEW.payment_method = 'credit';
END;`)


  db.run(`CREATE TRIGGER handle_tax_journal_entries
AFTER INSERT ON sale_tax_amounts
BEGIN
    -- Create tax-specific journal entry
    INSERT INTO journal_entries (reference_number, date, description, status)
    SELECT
        'SALE-TAX-' || s.id,
        CURRENT_DATE,
        'Tax entry for sale ' || s.id,
        'posted'
    FROM sales_taxes st
    JOIN sales s ON s.id = st.sale_id
    WHERE st.id = NEW.sale_tax_id;

    -- Insert the tax journal entry lines
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    SELECT
        (SELECT last_insert_rowid()),
        t.account_id,
        CASE
            WHEN coa.account_type IN ('asset', 'expense') THEN NEW.tax_amount
            ELSE 0
        END,
        CASE
            WHEN coa.account_type IN ('liability', 'income') THEN NEW.tax_amount
            ELSE 0
        END
    FROM sales_taxes st
    JOIN taxes t ON t.id = st.tax_id
    JOIN chart_of_accounts coa ON coa.id = t.account_id
    WHERE st.id = NEW.sale_tax_id;
END;`)

 db.run(`CREATE TRIGGER handle_returns_updates
AFTER INSERT ON returns
BEGIN
    -- Create a new journal entry for the return
    INSERT INTO journal_entries (reference_number, date, description, status)
    VALUES (
        'RETURN-' || NEW.id,
        CURRENT_DATE,
        'Return of sale ' || NEW.sale_id,
        'posted'
    );
    
    -- Reverse Sales Revenue (match original credit with a debit)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (
        (SELECT last_insert_rowid()),
        (SELECT id FROM chart_of_accounts WHERE account_code = '4000'),
        NEW.selling_price * NEW.return_quantity - 
            CASE 
                WHEN NEW.discount_type = 'percentage' THEN (NEW.selling_price * NEW.return_quantity * NEW.discount_amount / 100)
                WHEN NEW.discount_type = 'fixed' THEN NEW.discount_amount
                ELSE 0
            END,
        0
    );

    -- Reverse Accounts Receivable for credit sales (match original debit with a credit)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    SELECT
        (SELECT last_insert_rowid()),
        (SELECT id FROM chart_of_accounts WHERE account_code = '1010'),
        0,
        NEW.total_refund
    WHERE NEW.payment_method = 'credit';

    -- Reverse Cost of Goods Sold (COGS) when restocking
INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
SELECT 
    (SELECT last_insert_rowid()), 
    (SELECT id FROM chart_of_accounts WHERE account_code = '5000'), -- COGS
    0, 
    ROUND(cost_per_unit * NEW.return_quantity, 2) 
FROM inventory 
WHERE product_id = NEW.product_id
AND NEW.action = 'restock';

-- Reverse Inventory reduction when restocking
INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
SELECT 
    (SELECT last_insert_rowid()), 
    (SELECT id FROM chart_of_accounts WHERE account_code = '1020'), -- Inventory
    ROUND(cost_per_unit * NEW.return_quantity, 2), 
    0 
FROM inventory 
WHERE product_id = NEW.product_id
AND NEW.action = 'restock';

-- Record Loss on Inventory Disposal (instead of reversing COGS)
INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
SELECT 
    (SELECT last_insert_rowid()), 
    (SELECT id FROM chart_of_accounts WHERE account_code = '6100'), -- Loss on Disposal
    ROUND(cost_per_unit * NEW.return_quantity, 2), 
    0 
FROM inventory 
WHERE product_id = NEW.product_id
AND NEW.action = 'dispose';

-- Remove disposed goods from Inventory
INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
SELECT 
    (SELECT last_insert_rowid()), 
    (SELECT id FROM chart_of_accounts WHERE account_code = '1020'), -- Inventory
    0, 
    ROUND(cost_per_unit * NEW.return_quantity, 2) 
FROM inventory 
WHERE product_id = NEW.product_id
AND NEW.action = 'dispose';

    -- Reverse Discount Entries (match original debit with a credit)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
SELECT 
    (SELECT last_insert_rowid()),
    (SELECT id FROM chart_of_accounts WHERE account_code = '6000'),
    0,
    ROUND(
        CASE 
            WHEN NEW.discount_type = 'percentage' THEN (NEW.selling_price * NEW.return_quantity * NEW.discount_amount / 100)
            WHEN NEW.discount_type = 'fixed' THEN (NEW.discount_amount / (SELECT quantity FROM sales WHERE id = NEW.sale_id) * NEW.return_quantity) -- Corrected for partial return
            ELSE 0
        END, 
        2
    )
WHERE NEW.discount_amount > 0;

   -- Reverse Accounts Receivable adjustment for discount (match original credit with a debit)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    SELECT 
        (SELECT last_insert_rowid()),
        (SELECT id FROM chart_of_accounts WHERE account_code = '1010'),
        ROUND(
            CASE 
                WHEN NEW.discount_type = 'percentage' THEN (NEW.selling_price * NEW.return_quantity * (NEW.discount_amount / 100))
                WHEN NEW.discount_type = 'fixed' THEN NEW.discount_amount
                ELSE 0
            END, 
            2
        ),
        0
    WHERE NEW.discount_amount > 0 AND NEW.payment_method = 'credit';
END;
`)
// -- Handle tax reversals
db.run(`
CREATE TRIGGER handle_return_tax_reversals
AFTER INSERT ON returns
BEGIN
    -- Create tax reversal journal entry
    INSERT INTO journal_entries (reference_number, date, description, status)
    VALUES (
        'RETURN-TAX-' || NEW.id,
        CURRENT_DATE,
        'Tax reversal for return ' || NEW.id,
        'posted'
    );

    -- Insert tax reversal journal entry lines
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    SELECT
        (SELECT last_insert_rowid()),  -- Get the last inserted journal entry ID
        t.account_id,
        CASE
            -- Reverse tax based on whether it was exclusive or inclusive
            WHEN t.tax_type = 'inclusive' THEN  
                (sta.tax_amount * (NEW.return_quantity * 1.0 / s.quantity))
            ELSE  
                (sta.tax_amount * (NEW.return_quantity * 1.0 / s.quantity))
        END,
        CASE
            WHEN coa.account_type IN ('asset', 'expense') THEN
                CASE
                    WHEN t.tax_type = 'inclusive' THEN  
                        (sta.tax_amount * (NEW.return_quantity * 1.0 / s.quantity))
                    ELSE  
                        (sta.tax_amount * (NEW.return_quantity * 1.0 / s.quantity))
                END
            ELSE 0
        END
    FROM sales s
    JOIN sales_taxes st ON st.sale_id = s.id
    JOIN sale_tax_amounts sta ON sta.sale_tax_id = st.id
    JOIN taxes t ON t.id = st.tax_id
    JOIN chart_of_accounts coa ON coa.id = t.account_id
    WHERE s.id = NEW.sale_id;
END;

`)
  db.run(`CREATE TRIGGER update_chart_of_accounts_after_payment
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
  -- Update the Cash/Bank Account based on payment method
  UPDATE chart_of_accounts
  SET balance = balance + NEW.amount_paid
  WHERE account_code = CASE
    WHEN NEW.payment_method = 'cash' THEN '1000' -- Cash account
    WHEN NEW.payment_method = 'credit' THEN '1015' -- Bank Account
    ELSE NULL
  END;

  -- Update Accounts Receivable (decrease the outstanding amount)
  UPDATE chart_of_accounts
  SET balance = balance - NEW.amount_paid
  WHERE account_code = '1010'; -- Accounts Receivable account
END;
`);
  db.run(`CREATE TRIGGER update_invoice_status_and_customer_sale_due
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
  -- Update the invoice status based on the amount paid
  UPDATE invoices
  SET amount_paid = amount_paid + NEW.amount_paid,
      status = CASE
        WHEN amount_paid + NEW.amount_paid >= total_amount THEN 'paid'
        WHEN amount_paid + NEW.amount_paid > 0 THEN 'partial'
        ELSE status
      END
  WHERE reference_number = NEW.reference_number;

  -- Update the customer's total_sale_due after payment is made
  UPDATE customers
  SET total_sale_due = total_sale_due - NEW.amount_paid
  WHERE id = (SELECT customer_id FROM invoices WHERE reference_number = NEW.reference_number);
END;
`);
  db.run(`
  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    account_id INTEGER NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts (id) ON DELETE CASCADE

    
  );
`);

  db.run(`
CREATE TRIGGER supplier_payment_journal_entry
AFTER INSERT ON supplier_payments
FOR EACH ROW
BEGIN
  -- Insert into journal_entries table to create a new journal entry
  INSERT INTO journal_entries (reference_number, date, description, status)
  VALUES (
    NEW.payment_reference,  -- Using payment_reference as the reference number
    CURRENT_DATE,           -- Current date for the transaction
    'Payment to supplier ' || NEW.supplier_id,  -- Description
    'posted'                -- Mark as posted after creation
  );

  -- Insert debit entry for Accounts Payable (2000)
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
  VALUES (
    (SELECT last_insert_rowid()),  -- Get the last inserted journal entry id
    '5',  -- Accounts Payable (2000)
    NEW.amount_paid,              -- Debit the Accounts Payable
    0                             -- No credit here
  );

  -- Insert credit entry for Cash/Bank (1000 or 1015) based on payment method
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
  VALUES (
    (SELECT last_insert_rowid()),  -- Get the last inserted journal entry id
    (SELECT id FROM chart_of_accounts WHERE account_code = CASE
      WHEN NEW.payment_method = 'Cash' THEN '1000'  -- Cash (1000)
      ELSE '1015'  -- Bank (1015)
    END),
    0,                              -- Debit the Cash/Bank
    NEW.amount_paid                 -- No credit here
  );

  -- Update Accounts Payable balance (decrease)
  UPDATE chart_of_accounts
  SET balance = balance - NEW.amount_paid
  WHERE account_code = '2000';

  -- Update Cash/Bank balance (decrease)
  UPDATE chart_of_accounts
  SET balance = balance - NEW.amount_paid
  WHERE account_code = CASE
    WHEN NEW.payment_method = 'Cash' THEN '1000'
    ELSE '1015'
  END;

  -- Update Supplier's total purchase due
  UPDATE suppliers
  SET total_purchase_due = total_purchase_due - NEW.amount_paid
  WHERE id = NEW.supplier_id;

  -- Update Supplier Invoice (if there is an associated invoice)
  UPDATE supplier_invoices
  SET amount_paid = amount_paid + NEW.amount_paid,
      status = CASE
        WHEN amount_paid + NEW.amount_paid >= total_amount THEN 'paid'
        WHEN amount_paid + NEW.amount_paid > 0 THEN 'partial'
        ELSE 'unpaid'
      END
  WHERE purchase_order_id = NEW.purchase_order_id
    AND supplier_id = NEW.supplier_id;

  -- Insert into audit_trails table to log the action
  INSERT INTO audit_trails (user_id, table_name, record_id, action, changes)
  VALUES (
    1,                      -- The user who made the change
    'supplier_payments',    -- Affected table
    NEW.id,                 -- Affected record (supplier payment ID)
    'insert',               -- Action (insert)
    '{"payment_reference": "' || NEW.payment_reference || '", "amount_paid": ' || NEW.amount_paid || '}'  -- Change details in JSON format
  );
END;
)
`);
  db.run(`INSERT OR IGNORE INTO payment_methods (name, account_id, description, is_active)
    VALUES 
      ('Cash', 1, 'Payment using cash', 1), -- Linked to Cash account (ID: 1)`);
});
db.run(`INSERT INTO taxes (tax_name, tax_rate, tax_type, account_id)
VALUES ('No Tax', 0, 'exclusive', (SELECT id FROM chart_of_accounts WHERE account_code = '2010'));
`);
db.run(`INSERT INTO taxes (tax_name, tax_rate, tax_type, account_id)
VALUES ('NHIL', 3.2, 'exclusive', (SELECT id FROM chart_of_accounts WHERE account_code = '2010'));
`);
db.run(`INSERT INTO taxes (tax_name, tax_rate, tax_type, account_id)
VALUES ('VAT', 1.5, 'inclusive', (SELECT id FROM chart_of_accounts WHERE account_code = '2010'));
`);
// Close the database connection
db.close((err) => {
  if (err) {
    console.error("Error closing the database:", err.message);
  } else {
    console.log("Database connection closed.");
  }
});
