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
);`);
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
});

// Close the database connection
db.close((err) => {
  if (err) {
    console.error("Error closing the database:", err.message);
  } else {
    console.log("Database connection closed.");
  }
});
