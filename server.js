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
    origin: 'http://localhost:3000', // Make sure to allow your frontend's URL
  }));

app.get('/products', (req, res) => {
    db.all('SELECT * FROM products', (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error fetching products");
      } else {
        console.log(rows); // Log the products data
        res.json(rows); // Send the products as JSON response
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
