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
  db.run(`CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id INTEGER PRIMARY KEY,
    account_code TEXT NOT NULL UNIQUE, -- Unique identifier for the account
    account_name TEXT NOT NULL, -- Name of the account
    account_type TEXT NOT NULL CHECK(account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')), -- Type of account
    parent_account_id INTEGER, -- For hierarchical accounts
    FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id)
  )`);

  const defaultAccounts = [
    { account_code: "1000", account_name: "Cash", account_type: "asset" },
    {
      account_code: "1010",
      account_name: "Accounts Receivable",
      account_type: "asset",
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
      account_type: "expense", // Categorized as an expense
    },
  ];
  
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
    stock INTEGER DEFAULT 0 CHECK(stock >= 0), -- Non-negative stock
    image TEXT -- Optional, for product image URL or file path
)`);

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
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('sale', 'return', 'expense','stock')), -- Type of transaction
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

  // Additional logic for recording a sale with journal entries
  db.run(`
CREATE TRIGGER after_sale_insert
AFTER INSERT ON sales
BEGIN
    -- Validate stock
    SELECT RAISE(ABORT, 'Insufficient stock') 
    WHERE (SELECT stock FROM products WHERE id = NEW.product_id) < NEW.quantity;

    -- Decrease product stock
    UPDATE products 
    SET stock = stock - NEW.quantity 
    WHERE id = NEW.product_id;

    -- Update customer total sale due (for credit sales) or advance balance (for cash sales)
    UPDATE customers
    SET 
        advance_balance = CASE 
            WHEN NEW.payment_method = 'cash' AND advance_balance >= NEW.total_price THEN advance_balance - NEW.total_price
            ELSE advance_balance
        END,
        total_sale_due = CASE
            WHEN NEW.payment_method = 'credit' THEN total_sale_due + NEW.total_price
            WHEN NEW.payment_method = 'cash' AND advance_balance < NEW.total_price THEN total_sale_due + (NEW.total_price - advance_balance)
            ELSE total_sale_due
        END
    WHERE id = NEW.customer_id;

    -- Create a journal entry for the sale transaction
    INSERT INTO journal_entries (reference_number, date, description)
    VALUES (NEW.reference_number, NEW.date, 'Sale transaction');

    -- Record the credit side (Revenue)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    SELECT 
        (SELECT id FROM journal_entries WHERE reference_number = NEW.reference_number ORDER BY id DESC LIMIT 1),
        (SELECT id FROM chart_of_accounts WHERE account_name = 'Sales Revenue'),
        0,
        NEW.total_price;

    -- Record the debit side (Cash or Accounts Receivable)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    SELECT 
        (SELECT id FROM journal_entries WHERE reference_number = NEW.reference_number ORDER BY id DESC LIMIT 1),
        CASE 
            WHEN NEW.payment_method = 'credit' THEN
                (SELECT id FROM chart_of_accounts WHERE account_name = 'Accounts Receivable')
            ELSE
                (SELECT id FROM chart_of_accounts WHERE account_name = 'Cash')
        END,
        NEW.total_price,
        0;

    -- Log the action in audit trails
    INSERT INTO audit_trails (
        user_id, 
        table_name, 
        record_id, 
        action, 
        changes
    )
    VALUES (
        1, 
        'sales', 
        NEW.id, 
        'insert',
        json_object(
            'reference_number', NEW.reference_number,
            'total_price', NEW.total_price,
            'quantity', NEW.quantity,
            'payment_method', NEW.payment_method,
            'customer_id', NEW.customer_id
        )
    );
END;

`);
  db.run(`CREATE TRIGGER after_return_insert
AFTER INSERT ON returns
BEGIN
    -- Update the sales table to reflect the reduced quantity and total price
    UPDATE sales
    SET 
        quantity = quantity - NEW.return_quantity,
        total_price = total_price - (
            total_price * (NEW.return_quantity * 1.0 / quantity)
        )
    WHERE id = NEW.sale_id;

    -- If the return action is 'restock', update the product's stock
    UPDATE products
    SET stock = stock + NEW.return_quantity
    WHERE id = (
        SELECT product_id 
        FROM sales 
        WHERE id = NEW.sale_id
    )
    AND NEW.action = 'restock';

    -- If the original sale was on credit, reduce the customer's total_sale_due
    UPDATE customers
    SET total_sale_due = total_sale_due - (
        (SELECT total_price 
         FROM sales 
         WHERE id = NEW.sale_id) * 
        (NEW.return_quantity * 1.0 / (SELECT quantity FROM sales WHERE id = NEW.sale_id))
    )
    WHERE id = (
        SELECT customer_id 
        FROM sales 
        WHERE id = NEW.sale_id
    )
    AND (
        SELECT payment_method 
        FROM sales 
        WHERE id = NEW.sale_id
    ) = 'credit';

    -- Create a journal entry for the return
    INSERT INTO journal_entries (reference_number, date, description)
    VALUES (NEW.reference_number, NEW.return_date, 'Sale Return');

    -- Record the debit side (Sales Returns)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (
        (SELECT id 
         FROM journal_entries 
         WHERE reference_number = NEW.reference_number 
         ORDER BY id DESC LIMIT 1),
        (SELECT id 
         FROM chart_of_accounts 
         WHERE account_name = 'Sales Returns'),
        (SELECT total_price 
         FROM sales 
         WHERE id = NEW.sale_id) * 
        (NEW.return_quantity * 1.0 / (SELECT quantity FROM sales WHERE id = NEW.sale_id)),
        0
    );

    -- Record the credit side (Accounts Receivable or Cash)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (
        (SELECT id 
         FROM journal_entries 
         WHERE reference_number = NEW.reference_number 
         ORDER BY id DESC LIMIT 1),
        CASE 
            WHEN (SELECT payment_method 
                  FROM sales 
                  WHERE id = NEW.sale_id) = 'credit' THEN 
                (SELECT id 
                 FROM chart_of_accounts 
                 WHERE account_name = 'Accounts Receivable')
            ELSE 
                (SELECT id 
                 FROM chart_of_accounts 
                 WHERE account_name = 'Cash')
        END,
        0,
        (SELECT total_price 
         FROM sales 
         WHERE id = NEW.sale_id) * 
        (NEW.return_quantity * 1.0 / (SELECT quantity FROM sales WHERE id = NEW.sale_id))
    );

    -- Log the return in the audit trail
    INSERT INTO audit_trails (
        user_id, 
        table_name, 
        record_id, 
        action, 
        changes
    )
    VALUES (
        1, -- Assume the user ID is static; replace with dynamic handling if needed
        'returns', 
        NEW.id, 
        'insert',
        json_object(
            'sale_id', NEW.sale_id,
            'return_quantity', NEW.return_quantity,
            'action', NEW.action,
            'reference_number', NEW.reference_number
        )
    );
END;


`);

  // Insert product data
  const insertStmt =
    db.prepare(`INSERT INTO products (id, name, cp, sp, stock, image)
    VALUES (?, ?, ?, ?, ?, ?)`);

  const products = [
    {
      id: 1,
      name: "Can Malt 200",
      cp: 180,
      sp: 220,
      image: "/images/logo.png",
      stock: 4,
    },
    {
      id: 2,
      name: "Plastic Malt",
      cp: 95,
      sp: 98,
      image: "/images/logo.png",
      stock: 6,
    },
    {
      id: 3,
      name: "Bigoo Cola",
      cp: 42,
      sp: 45,
      image: "/images/logo.png",
      stock: 5,
    },
    {
      id: 4,
      name: "Bigoo Cocktail",
      cp: 42,
      sp: 47,
      image: "/images/logo.png",
      stock: 2,
    },
    {
      id: 5,
      name: "Bigoo Grapes",
      cp: 42,
      sp: 47,
      image: "/images/logo.png",
      stock: 3,
    },
    {
      id: 6,
      name: "Storm Small",
      cp: 45,
      sp: 48,
      image: "/images/logo.png",
      stock: 4,
    },
    {
      id: 7,
      name: "Storm Big",
      cp: 62,
      sp: "30",
      image: "/images/logo.png",
      stock: 30,
    },
    {
      id: 8,
      name: "Beta Malt",
      cp: 68,
      sp: 70,
      image: "/images/logo.png",
      stock: 10,
    },
    {
      id: 9,
      name: "Kiki",
      cp: 72,
      sp: "30",
      image: "/images/logo.png",
      stock: 30,
    },
    {
      id: 10,
      name: "U Fresh Grapes",
      cp: 30,
      sp: 33,
      image: "/images/logo.png",
      stock: 7,
    },
    {
      id: 11,
      name: "U Fresh Banana",
      cp: 34,
      sp: 33,
      image: "/images/logo.png",
      stock: 1,
    },
    {
      id: 12,
      name: "U Fresh Orange",
      cp: 34,
      sp: 33,
      image: "/images/logo.png",
      stock: 1,
    },
    {
      id: 13,
      name: "5 Star",
      cp: 39,
      sp: 44,
      image: "/images/logo.png",
      stock: 5,
    },
    {
      id: 14,
      name: "Rush",
      cp: 39,
      sp: 44,
      image: "/images/logo.png",
      stock: 5,
    },
    {
      id: 15,
      name: "U Fresh Chocolate",
      cp: 64,
      sp: 66,
      image: "/images/logo.png",
      stock: 8,
    },
    {
      id: 16,
      name: "U fresh Soya",
      cp: 64,
      sp: 66,
      image: "/images/logo.png",
      stock: 6,
    },
    {
      id: 17,
      name: "U fresh kids",
      cp: 31,
      sp: 34,
      image: "/images/logo.png",
      stock: 2,
    },
    {
      id: 18,
      name: "U fresh sachet",
      cp: 35,
      sp: 36,
      image: "/images/logo.png",
      stock: 2,
    },
    {
      id: 19,
      name: "Alvaro",
      cp: 20,
      sp: 20,
      image: "/images/logo.png",
      stock: 30,
    },
    {
      id: 20,
      name: "Darling Lemon",
      cp: 50,
      sp: 53,
      image: "/images/logo.png",
      stock: 30,
    },
    {
      id: 21,
      name: "Bel Active",
      cp: 36,
      sp: 40,
      image: "/images/logo.png",
      stock: 10,
    },
    {
      id: 22,
      name: "Bel Tropical",
      cp: 37,
      sp: 40,
      image: "/images/logo.png",
      stock: 1,
    },
    {
      id: 23,
      name: "Squeeze",
      cp: 37,
      sp: 40,
      image: "/images/logo.png",
      stock: 5,
    },
    {
      id: 24,
      name: "Bel Cola",
      cp: 40,
      sp: 42,
      image: "/images/logo.png",
      stock: 30,
    },
    {
      id: 25,
      name: "Bel Water (Medium)",
      cp: 26,
      sp: 28,
      image: "/images/logo.png",
      stock: 18,
    },
    {
      id: 26,
      name: "Bel Water (Small)",
      cp: 22,
      sp: 25,
      image: "/images/logo.png",
      stock: 20,
    },
    {
      id: 27,
      name: "Bel Water Box",
      cp: 50,
      sp: "30",
      image: "/images/logo.png",
      stock: 30,
    },
    {
      id: 28,
      name: "Slim Fit",
      cp: 18,
      sp: 21,
      image: "/images/logo.png",
      stock: 2,
    },
    {
      id: 29,
      name: "Kaeser Apple",
      cp: 35,
      sp: 42,
      image: "/images/logo.png",
      stock: 3,
    },
    {
      id: 30,
      name: "Perla",
      cp: 22,
      sp: 25,
      image: "/images/logo.png",
      stock: 8,
    },
    {
      id: 31,
      name: "Awake small",
      cp: 22,
      sp: 24,
      image: "/images/logo.png",
      stock: 10,
    },
    {
      id: 32,
      name: "Pukka",
      cp: 41,
      sp: 43,
      image: "/images/logo.png",
      stock: 8,
    },
    {
      id: 33,
      name: "Kalyppo",
      cp: 93,
      sp: 96,
      image: "/images/logo.png",
      stock: 200,
    },
    {
      id: 34,
      name: "Fruity",
      cp: 50,
      sp: 52,
      image: "/images/logo.png",
      stock: 20,
    },
    {
      id: 35,
      name: "Juicee",
      cp: 70,
      sp: 73,
      image: "/images/logo.png",
      stock: 10,
    },
    {
      id: 36,
      name: "Tampico Big",
      cp: 53,
      sp: 58,
      image: "/images/logo.png",
      stock: 5,
    },
    {
      id: 37,
      name: "Tampico Small",
      cp: 20,
      sp: 58,
      image: "/images/logo.png",
      stock: 5,
    },
    {
      id: 38,
      name: "Don Simon Big",
      cp: 20,
      sp: 30,
      image: "/images/logo.png",
      stock: 12,
    },
    {
      id: 39,
      name: "Don Simon Small",
      cp: 17,
      sp: 12,
      image: "/images/logo.png",
      stock: 12,
    },
    {
      id: 40,
      name: "Don Simon Multivitamin",
      cp: 20,
      sp: 25,
      image: "/images/logo.png",
      stock: 12,
    },
    {
      id: 41,
      name: "Coke Big 1.5",
      cp: 20,
      sp: 25,
      image: "/images/logo.png",
      stock: 16,
    },
    {
      id: 42,
      name: "Coke Small",
      cp: 55,
      sp: 58,
      image: "/images/logo.png",
      stock: 15,
    },
    {
      id: 43,
      name: "Hollandia 1 ltr",
      cp: 20,
      sp: 25,
      image: "/images/logo.png",
      stock: 10,
    },
    {
      id: 44,
      name: "BB Cocktail",
      cp: 20,
      sp: 240,
      image: "/images/logo.png",
      stock: 11,
    },
    {
      id: 45,
      name: "Nero",
      cp: 15,
      sp: 20,
      image: "/images/logo.png",
      stock: 1,
    },
    {
      id: 46,
      name: "Special Tangerine",
      cp: 20,
      sp: 45,
      image: "/images/logo.png",
      stock: 2,
    },
    {
      id: 47,
      name: "Vita Milk 250ml",
      cp: 300,
      sp: 20,
      image: "/images/logo.png",
      stock: 6,
    },
    {
      id: 48,
      name: "Vita Milk Bottle",
      cp: 75,
      sp: 78,
      image: "/images/logo.png",
      stock: 4,
    },
    {
      id: 49,
      name: "Vita Milk Champ",
      cp: 20,
      sp: 27,
      image: "/images/logo.png",
      stock: 10,
    },
    {
      id: 50,
      name: "Verna Water",
      cp: 20,
      sp: 25,
      image: "/images/logo.png",
      stock: 30,
    },
    {
      id: 51,
      name: "Voltic Water",
      cp: 20,
      sp: 20,
      image: "/images/logo.png",
      stock: 30,
    },
  ];
  // Insert products into the database
  products.forEach((product) => {
    insertStmt.run(
      product.id,
      product.name,
      product.cp,
      product.sp,
      product.stock,
      product.image
    );
  });
  // Finalize the insert statement
  insertStmt.finalize();

   const insertStmt1 =
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
);`)

});

// Close the database connection
db.close((err) => {
  if (err) {
    console.error("Error closing the database:", err.message);
  } else {
    console.log("Database connection closed.");
  }
});
