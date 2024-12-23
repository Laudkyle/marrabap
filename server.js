const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize the app
const app = express();
const port = 5000;

// Ensure `uploads` directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

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

// Serve static files from the `uploads` directory
app.use('/uploads', express.static(uploadsDir));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ===================== Products Endpoints =====================

// Get all products
app.get('/products', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching products');
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
      console.error(err.message);
      res.status(500).send('Error fetching product');
    } else if (!row) {
      res.status(404).send('Product not found');
    } else {
      res.json(row);
    }
  });
});

// Add a new product
app.post('/products', (req, res) => {
  const { name, cp, sp, stock } = req.body;
  const stmt = db.prepare('INSERT INTO products (name, cp, sp, stock) VALUES (?, ?, ?, ?)');
  stmt.run(name, cp, sp, stock, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error adding product');
    } else {
      res.status(201).json({ id: this.lastID, name, cp, sp, stock });
    }
  });
});

// Add multiple products in bulk
app.post('/products/bulk', (req, res) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).send('Invalid product data');
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    let errorOccurred = false;

    products.forEach((product) => {
      const { name, cp, sp, stock } = product;
      const stmt = db.prepare('INSERT INTO products (name, cp, sp, stock) VALUES (?, ?, ?, ?)');
      stmt.run(name, cp, sp, stock, (err) => {
        if (err) {
          console.error('Error inserting product:', err.message);
          errorOccurred = true;
        }
      });
    });

    if (errorOccurred) {
      db.run('ROLLBACK');
      res.status(400).send('Error adding products');
    } else {
      db.run('COMMIT');
      res.status(201).send('Products added successfully');
    }
  });
});

// Update a product
app.put('/products/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, cp, sp, stock } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  const fields = [];
  const values = [];

  if (name) {
    fields.push('name = ?');
    values.push(name);
  }
  if (cp) {
    fields.push('cp = ?');
    values.push(cp);
  }
  if (sp) {
    fields.push('sp = ?');
    values.push(sp);
  }
  if (stock) {
    fields.push('stock = ?');
    values.push(stock);
  }
  if (imagePath) {
    fields.push('image = ?');
    values.push(imagePath);
  }

  values.push(id);

  const query = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;

  db.run(query, values, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error updating product');
    } else if (this.changes === 0) {
      res.status(404).send('Product not found');
    } else {
      res.json({ id, name, cp, sp, stock, image: imagePath });
    }
  });
});

// Delete a product
app.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error deleting product');
    } else if (this.changes === 0) {
      res.status(404).send('Product not found');
    } else {
      res.status(204).send();
    }
  });
});

// ===================== Sales Endpoints =====================

// Add a sale or bulk sales
app.post('/sales', (req, res) => {
  const salesData = Array.isArray(req.body) ? req.body : [req.body];

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    let errorOccurred = false;

    salesData.forEach(({ product_id, quantity }) => {
      db.get('SELECT * FROM products WHERE id = ?', [product_id], (err, product) => {
        if (err || !product) {
          errorOccurred = true;
          return console.error(err ? err.message : 'Product not found');
        }

        if (product.stock < quantity) {
          errorOccurred = true;
          return console.error('Insufficient stock for product ID:', product_id);
        }

        const total_price = product.sp * quantity;

        db.run(
          'INSERT INTO sales (product_id, quantity, total_price, date) VALUES (?, ?, ?, ?)',
          [product_id, quantity, total_price, new Date().toISOString()],
          (err) => {
            if (err) {
              errorOccurred = true;
              console.error(err.message);
            }
          }
        );

        db.run(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [quantity, product_id],
          (err) => {
            if (err) {
              errorOccurred = true;
              console.error(err.message);
            }
          }
        );
      });
    });

    if (errorOccurred) {
      db.run('ROLLBACK');
      res.status(400).send('Error processing sales');
    } else {
      db.run('COMMIT');
      res.status(201).send('Sales processed successfully');
    }
  });
});

// Get all sales
app.get('/sales', (req, res) => {
  db.all(
    `SELECT sales.id, products.name AS product_name, sales.quantity, sales.total_price, sales.date 
     FROM sales 
     JOIN products ON sales.product_id = products.id`,
    (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error fetching sales');
      } else {
        res.json(rows);
      }
    }
  );
});

// ===================== Server Initialization =====================
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

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
