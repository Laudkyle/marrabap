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
    { account_code: "1000", account_name: "Cash", account_type: "asset" },
    {
      account_code: "1010",
      account_name: "Accounts Receivable",
      account_type: "asset",
    },
    {
      account_code: "1020",
      account_name: "Inventory",
      account_type: "asset", // New Inventory account
    },
    {
      account_code: "2000",
      account_name: "Accounts Payable",
      account_type: "liability",
    },
    {
      account_code: "3000",
      account_name: "Owner's Equity",
      account_type: "equity",
    },
    {
      account_code: "4000",
      account_name: "Sales Revenue",
      account_type: "revenue",
    },
    {
      account_code: "5000",
      account_name: "Cost of Goods Sold",
      account_type: "expense",
    },
    {
      account_code: "5010",
      account_name: "Salaries and Wages",
      account_type: "expense",
    },
    {
      account_code: "5020",
      account_name: "Sales Returns",
      account_type: "expense",
    },
    // Added accounts for taxes:
    {
      account_code: "2010",
      account_name: "Sales Tax Payable",
      account_type: "liability",
    },
    {
      account_code: "2020",
      account_name: "Purchase Tax Recoverable",
      account_type: "asset",
    },
    {
      account_code: "2030",
      account_name: "VAT Payable",
      account_type: "liability",
    },
    {
      account_code: "2040",
      account_name: "VAT Receivable",
      account_type: "asset",
    },
    {
      account_code: "2050",
      account_name: "Income Tax Payable",
      account_type: "liability",
    },
    {
      account_code: "6000",
      account_name: "Tax Expense",
      account_type: "expense",
    },
    // Added unbilled purchases:
    {
      account_code: "1030",
      account_name: "Unbilled Purchases",
      account_type: "asset",
    },
  ];

  
  db.run(`CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id INTEGER PRIMARY KEY,
    account_code TEXT NOT NULL UNIQUE, -- Unique identifier for the account
    account_name TEXT NOT NULL, -- Name of the account
    account_type TEXT NOT NULL CHECK(account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')), -- Type of account
    parent_account_id INTEGER, -- For hierarchical accounts
    FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id)
  )`);

 
  defaultAccounts.forEach((account) => {
    db.run(
      `INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type)
       VALUES (?, ?, ?)`,
      [account.account_code, account.account_name, account.account_type]
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
);`)
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
);`)
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

`)

db.run(`
CREATE TABLE temp_purchase_order_items (
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL CHECK(unit_price >= 0)
);
`)
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
  `)
db.run(`CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique inventory record ID
  product_id INTEGER NOT NULL, -- Foreign key to Products table
  quantity_in_stock INTEGER NOT NULL DEFAULT 0 CHECK(quantity_in_stock >= 0), -- Stock quantity (cannot be negative)
  cost_per_unit REAL NOT NULL CHECK(cost_per_unit >= 0), -- Cost per unit (cannot be negative)
  FOREIGN KEY (product_id) REFERENCES products(id) -- Linking to the products table
);
`)

db.run(`CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL, -- References the product being adjusted
    date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Movement date
    reference_number TEXT NOT NULL, -- Links to the transaction (e.g., invoice or purchase order)
    quantity INTEGER NOT NULL, -- Positive for additions, negative for subtractions
    movement_type TEXT NOT NULL CHECK(movement_type IN ('purchase', 'sale', 'return', 'adjustment')), -- Type of movement
    cost REAL NOT NULL CHECK(cost >= 0), -- Unit cost (important for COGS calculations)
    description TEXT, -- Additional details (optional)
    FOREIGN KEY (product_id) REFERENCES products(id))`)

  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY,
    reference_number TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL DEFAULT 1, -- Default to "Walk-in" customer
    quantity INTEGER CHECK(quantity >= 0), -- Quantity must be positive
    total_price REAL CHECK(total_price >= 0), -- Ensure total is non-negative
    date TEXT NOT NULL, -- ISO 8601 format recommended (YYYY-MM-DD)
    payment_method TEXT, -- e.g., 'cash', 'credit'
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
)`);
  db.run(`CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_number TEXT NOT NULL, -- Links payment to an invoice
  payment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Date and time of payment
  amount_paid REAL NOT NULL CHECK(amount_paid > 0), -- Payment amount must be positive
  payment_method TEXT, -- Optional (e.g., cash, credit card, etc.)
  payment_reference TEXT -- Optional payment reference number
)`);

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
`)
  db.run(`CREATE TABLE IF NOT EXISTS returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  reference_number TEXT NOT NULL,
  return_quantity INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('restock', 'dispose')),
  return_date TEXT NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id)
)`);
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
  created_on TEXT DEFAULT CURRENT_TIMESTAMP -- Timestamp
)`);

  db.run(`CREATE TABLE IF NOT EXISTS taxes (
  id INTEGER PRIMARY KEY,
  tax_name TEXT NOT NULL UNIQUE, -- Name of the tax
  tax_rate REAL NOT NULL CHECK(tax_rate >= 0), -- Tax rate
  tax_type TEXT CHECK(tax_type IN ('inclusive', 'exclusive')), -- How tax is applied
  account_id INTEGER NOT NULL, -- Linked to the chart of accounts
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
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
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

`)
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
`)
});

// Close the database connection
db.close((err) => {
  if (err) {
    console.error("Error closing the database:", err.message);
  } else {
    console.log("Database connection closed.");
  }
});
