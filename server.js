const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 5000;
const cors = require("cors");

// Open SQLite database
const db = new sqlite3.Database('./shopdb.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
}));

// Get all products
app.get('/products', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching products");
    } else {
      res.json(rows);
    }
  });
});

// Get a specific product by ID
app.get('/products/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    if (row) {
      res.json(row);
    } else {
      res.status(404).send('Product not found');
    }
  });
});

// Add a new product
app.post('/products', (req, res) => {
  const { name, cp, sp, stock } = req.body;
  const stmt = db.prepare('INSERT INTO products (name, cp, sp, stock) VALUES (?, ?, ?, ?)');
  stmt.run(name, cp, sp, stock, function (err) {
    if (err) {
      return console.error(err.message);
    }
    res.status(201).json({ id: this.lastID, name, cp, sp, stock });
  });
});

// Update product details
app.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, cp, sp, stock } = req.body;
  const stmt = db.prepare('UPDATE products SET name = ?, cp = ?, sp = ?, stock = ? WHERE id = ?');
  stmt.run(name, cp, sp, stock, id, function (err) {
    if (err) {
      return console.error(err.message);
    }
    if (this.changes === 0) {
      res.status(404).send('Product not found');
    } else {
      res.json({ id, name, cp, sp, stock });
    }
  });
});

// Delete a product
app.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM products WHERE id = ?');
  stmt.run(id, function (err) {
    if (err) {
      return console.error(err.message);
    }
    if (this.changes === 0) {
      res.status(404).send('Product not found');
    } else {
      res.status(204).send();
    }
  });
});

// Add a new sale
app.post('/sales', (req, res) => {
  const { product_id, quantity } = req.body;
  
  db.get('SELECT * FROM products WHERE id = ?', [product_id], (err, product) => {
    if (err) {
      return console.error(err.message);
    }
    
    if (!product) {
      return res.status(404).send('Product not found');
    }
    
    if (product.stock < quantity) {
      return res.status(400).send('Insufficient stock');
    }
    
    const total_price = product.sp * quantity;
    
    const stmt = db.prepare('INSERT INTO sales (product_id, quantity, total_price, date) VALUES (?, ?, ?, ?)');
    stmt.run(product_id, quantity, total_price, new Date().toISOString(), function(err) {
      if (err) {
        return console.error(err.message);
      }
      
      const updateStmt = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
      updateStmt.run(quantity, product_id, (err) => {
        if (err) {
          return console.error(err.message);
        }
        
        res.status(201).json({
          id: this.lastID,
          product_id,
          quantity,
          total_price,
          date: new Date().toISOString()
        });
      });
    });
  });
});

// Get all sales
app.get('/sales', (req, res) => {
  db.all('SELECT sales.id, products.name AS product_name, sales.quantity, sales.total_price, sales.date FROM sales JOIN products ON sales.product_id = products.id', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching sales');
    } else {
      res.json(rows);
    }
  });
});

// Get sales for a specific product
app.get('/sales/product/:id', (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM sales WHERE product_id = ?', [id], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching sales for this product');
    } else {
      res.json(rows);
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Close the database connection gracefully on exit
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing the database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
