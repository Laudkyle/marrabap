const sqlite3 = require('sqlite3').verbose();

// Open a database or create it if it doesn't exist
const db = new sqlite3.Database('./shopdb.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create the 'products' table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    cp TEXT,
    sp TEXT,
    stock INTEGER
  )`);

  // Insert product data
  const insertStmt = db.prepare(`INSERT INTO products (id, name, cp, sp, stock)
    VALUES (?, ?, ?, ?, ?)`);

  const products = [
    { id: 1, name: "Can Malt 200", cp: 180, sp: 220, stock: 4 },
    { id: 2, name: "Plastic Malt", cp: 95, sp: 98, stock: 6 },
    { id: 3, name: "Bigoo Cola", cp: 42, sp: 45, stock: 5 },
    { id: 4, name: "Bigoo Cocktail", cp: 42, sp: 47, stock: 2 },
    { id: 5, name: "Bigoo Grapes", cp: 42, sp: 47, stock: 3 },
    { id: 6, name: "Storm Small", cp: 45, sp: 48, stock: 4 },
    { id: 7, name: "Storm Big", cp: 62, sp: "out of stock", stock: 0 },
    { id: 8, name: "Beta Malt", cp: 68, sp: 70, stock: 10 },
    { id: 9, name: "Kiki", cp: 72, sp: "out of stock", stock: 0 },
    { id: 10, name: "U Fresh Grapes", cp: 30, sp: 33, stock: 7 },
    { id: 11, name: "U Fresh Banana", cp: 34, sp: 33, stock: 1 },
    { id: 12, name: "U Fresh Orange", cp: 34, sp: 33, stock: 1 },
    { id: 13, name: "5 Star", cp: 39, sp: 44, stock: 5 },
    { id: 14, name: "Rush", cp: 39, sp: 44, stock: 5 },
    { id: 15, name: "U Fresh Chocolate", cp: 64, sp: 66, stock: 8 },
    { id: 16, name: "U fresh Soya", cp: 64, sp: 66, stock: 6 },
    { id: 17, name: "U fresh kids", cp: 31, sp: 34, stock: 2 },
    { id: 18, name: "U fresh sachet", cp: 35, sp: 36, stock: 2 },
    { id: 19, name: "Alvaro", cp: "N/A", sp: "N/A", stock: 0 },
    { id: 20, name: "Darling Lemon", cp: 50, sp: 53, stock: 0 },
    { id: 21, name: "Bel Active", cp: 36, sp: 40, stock: 10 },
    { id: 22, name: "Bel Tropical", cp: 37, sp: 40, stock: 1 },
    { id: 23, name: "Squeeze", cp: 37, sp: 40, stock: 5 },
    { id: 24, name: "Bel Cola", cp: 40, sp: 42, stock: 30 },
    { id: 25, name: "Bel Water (Medium)", cp: 26, sp: 28, stock: 18 },
    { id: 26, name: "Bel Water (Small)", cp: 22, sp: 25, stock: 20 },
    { id: 27, name: "Bel Water Box", cp: 50, sp: "out of stock", stock: 0 },
    { id: 28, name: "Slim Fit", cp: 18, sp: 21, stock: 2 },
    { id: 29, name: "Kaeser Apple", cp: 35, sp: 42, stock: 3 },
    { id: 30, name: "Perla", cp: 22, sp: 25, stock: 8 },
    { id: 31, name: "Awake small", cp: 22, sp: 24, stock: 10 },
    { id: 32, name: "Pukka", cp: 41, sp: 43, stock: 8 },
    { id: 33, name: "Kalyppo", cp: 93, sp: 96, stock: 200 },
    { id: 34, name: "Fruity", cp: 50, sp: 52, stock: 20 },
    { id: 35, name: "Juicee", cp: 70, sp: 73, stock: 10 },
    { id: 36, name: "Tampico Big", cp: 53, sp: 58, stock: 5 },
    { id: 37, name: "Tampico Small", cp: "N/A", sp: 58, stock: 5 },
    { id: 38, name: "Don Simon Big", cp: "N/A", sp: 30, stock: 12 },
    { id: 39, name: "Don Simon Small", cp: 17, sp: 12, stock: 12 },
    { id: 40, name: "Don Simon Multivitamin", cp: "N/A", sp: "N/A", stock: 12 },
    { id: 41, name: "Coke Big 1.5", cp: "N/A", sp: 20, stock: 6 },
    { id: 42, name: "Coke Small", cp: 55, sp: 58, stock: 1 },
    { id: 43, name: "Hollandia 1 ltr", cp: "N/A", sp: 25, stock: 10 },
    { id: 44, name: "BB Cocktail", cp: "N/A", sp: 240, stock: 1 },
    { id: 45, name: "Nero", cp: "N/A", sp: 20, stock: 1 },
    { id: 46, name: "Special Tangerine", cp: "N/A", sp: 45, stock: 2 },
    { id: 47, name: "Vita Milk 250ml", cp: 300, sp: "N/A", stock: 6 },
    { id: 48, name: "Vita Milk Bottle", cp: 75, sp: 78, stock: 4 },
    { id: 49, name: "Vita Milk Champ", cp: "N/A", sp: 27, stock: 10 },
    { id: 50, name: "Verna Water", cp: "N/A", sp: "N/A", stock: 0 },
    { id: 51, name: "Voltic Water", cp: "N/A", sp: "N/A", stock: 0 }
  ];

  // Insert products into the database
  products.forEach(product => {
    insertStmt.run(product.id, product.name, product.cp, product.sp, product.stock);
  });

  // Finalize the insert statement
  insertStmt.finalize();
});

// Close the database connection
db.close((err) => {
  if (err) {
    console.error('Error closing the database:', err.message);
  } else {
    console.log('Database connection closed.');
  }
});