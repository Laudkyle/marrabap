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

// Add multiple products in bulk
app.post('/products/bulk', (req, res) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).send('Invalid product data');
  }

  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      console.error('Transaction start error:', err.message);
      return res.status(500).send('Internal Server Error');
    }

    let errorOccurred = false;

    products.forEach((product, index) => {
      const { name, cp, sp, stock } = product;

      const stmt = db.prepare('INSERT INTO products (name, cp, sp, stock) VALUES (?, ?, ?, ?)');
      stmt.run(name, cp, sp, stock, (err) => {
        if (err) {
          errorOccurred = true;
          console.error('Error inserting product:', err.message);
        }

        if (index === products.length - 1) {
          if (errorOccurred) {
            db.run('ROLLBACK', (rollbackErr) => {
              if (rollbackErr) {
                console.error('Rollback error:', rollbackErr.message);
              }
              res.status(400).send('Error adding one or more products');
            });
          } else {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                console.error('Commit error:', commitErr.message);
                res.status(500).send('Internal Server Error');
              } else {
                res.status(201).send('Products added successfully');
              }
            });
          }
        }
      });
    });
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

app.post('/sales', (req, res) => {
  const salesData = req.body;

  // Normalize salesData into an array if it's a single object
  const salesArray = Array.isArray(salesData) ? salesData : [salesData];

  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Internal Server Error');
    }

    let errorOccurred = false;

    salesArray.forEach((sale, index) => {
      const { product_id, quantity } = sale;

      db.get('SELECT * FROM products WHERE id = ?', [product_id], (err, product) => {
        if (err || !product) {
          errorOccurred = true;
          console.error(err ? err.message : 'Product not found');
          return;
        }

        if (product.stock < quantity) {
          errorOccurred = true;
          console.error('Insufficient stock for product ID:', product_id);
          return;
        }

        const total_price = product.sp * quantity;

        const stmt = db.prepare(
          'INSERT INTO sales (product_id, quantity, total_price, date) VALUES (?, ?, ?, ?)'
        );
        stmt.run(product_id, quantity, total_price, new Date().toISOString(), function (err) {
          if (err) {
            errorOccurred = true;
            console.error(err.message);
            return;
          }

          const updateStmt = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
          updateStmt.run(quantity, product_id, (err) => {
            if (err) {
              errorOccurred = true;
              console.error(err.message);
              return;
            }

            if (index === salesArray.length - 1) {
              if (errorOccurred) {
                db.run('ROLLBACK');
                return res.status(400).send('Error processing some sales');
              } else {
                db.run('COMMIT');
                return res.status(201).send('Sales processed successfully');
              }
            }
          });
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
