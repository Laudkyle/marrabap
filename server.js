const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Initialize the app
const app = express();
const port = 5000;

// Ensure `uploads` directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Open SQLite database
const db = new sqlite3.Database("./shopdb.sqlite", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

// Middleware to parse JSON requests
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

// Serve static files from the `uploads` directory
app.use("/uploads", express.static(uploadsDir));

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
app.get("/products", (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching products");
    } else {
      res.json(rows);
    }
  });
});

// Get a specific product by ID
app.get("/products/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error fetching product");
    } else if (!row) {
      res.status(404).send("Product not found");
    } else {
      res.json(row);
    }
  });
});

// Add a new product
app.post("/products", (req, res) => {
  const { name, cp, sp, stock } = req.body;
  const stmt = db.prepare(
    "INSERT INTO products (name, cp, sp, stock) VALUES (?, ?, ?, ?)"
  );
  stmt.run(name, cp, sp, stock, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error adding product");
    } else {
      res.status(201).json({ id: this.lastID, name, cp, sp, stock });
    }
  });
});

// Add multiple products in bulk
app.post("/products/bulk", (req, res) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).send("Invalid product data");
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    let errorOccurred = false;

    products.forEach((product) => {
      const { name, cp, sp, stock } = product;
      const stmt = db.prepare(
        "INSERT INTO products (name, cp, sp, stock) VALUES (?, ?, ?, ?)"
      );
      stmt.run(name, cp, sp, stock, (err) => {
        if (err) {
          console.error("Error inserting product:", err.message);
          errorOccurred = true;
        }
      });
    });

    if (errorOccurred) {
      db.run("ROLLBACK");
      res.status(400).send("Error adding products");
    } else {
      db.run("COMMIT");
      res.status(201).send("Products added successfully");
    }
  });
});

// Update a product
app.put("/products/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { name, cp, sp, stock } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  const fields = [];
  const values = [];

  if (name) {
    fields.push("name = ?");
    values.push(name);
  }
  if (cp) {
    fields.push("cp = ?");
    values.push(cp);
  }
  if (sp) {
    fields.push("sp = ?");
    values.push(sp);
  }
  if (stock) {
    fields.push("stock = ?");
    values.push(stock);
  }
  if (imagePath) {
    fields.push("image = ?");
    values.push(imagePath);
  }

  values.push(id);

  const query = `UPDATE products SET ${fields.join(", ")} WHERE id = ?`;

  db.run(query, values, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error updating product");
    } else if (this.changes === 0) {
      res.status(404).send("Product not found");
    } else {
      res.json({ id, name, cp, sp, stock, image: imagePath });
    }
  });
});

// Delete a product
app.delete("/products/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error deleting product");
    } else if (this.changes === 0) {
      res.status(404).send("Product not found");
    } else {
      res.status(204).send();
    }
  });
});
// ===================== Draft Endpoints =====================

// Get all drafts
app.get("/drafts", (req, res) => {
  db.all("SELECT * FROM drafts", (err, rows) => {
    if (err) {
      console.error("Error fetching drafts:", err.message);
      res.status(500).send("Error fetching drafts");
    } else {
      res.json(rows);
    }
  });
});

// Get a specific draft by ID
app.get("/drafts/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM drafts WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error fetching draft:", err.message);
      res.status(500).send("Error fetching draft");
    } else if (!row) {
      res.status(404).send("Draft not found");
    } else {
      res.json(row);
    }
  });
});

// Add a new draft
app.post("/drafts", (req, res) => {
  const { referenceNumber, details, date, status } = req.body;

  if (!referenceNumber || !details || !date) {
    return res
      .status(400)
      .send("Missing required fields: referenceNumber, details, or date");
  }

  const detailsJSON = JSON.stringify(details);

  db.run(
    `INSERT INTO drafts (reference_number, details, date, status) VALUES (?, ?, ?, ?)`,
    [referenceNumber, detailsJSON, date, status || "pending"],
    function (err) {
      if (err) {
        console.error("Error adding draft:", err.message);
        res.status(500).send("Error adding draft");
      } else {
        res.status(201).json({
          id: this.lastID,
          referenceNumber,
          details,
          date,
          status: status || "pending",
        });
      }
    }
  );
});

// Update a draft
app.put("/drafts/:id", (req, res) => {
  const { id } = req.params;
  const { referenceNumber, details, date, status } = req.body;

  const fields = [];
  const values = [];

  if (referenceNumber) {
    fields.push("reference_number = ?");
    values.push(referenceNumber);
  }
  if (details) {
    fields.push("details = ?");
    values.push(JSON.stringify(details));
  }
  if (date) {
    fields.push("date = ?");
    values.push(date);
  }
  if (status) {
    fields.push("status = ?");
    values.push(status);
  }

  if (fields.length === 0) {
    return res.status(400).send("No fields to update");
  }

  values.push(id);

  const query = `UPDATE drafts SET ${fields.join(", ")} WHERE id = ?`;

  db.run(query, values, function (err) {
    if (err) {
      console.error("Error updating draft:", err.message);
      res.status(500).send("Error updating draft");
    } else if (this.changes === 0) {
      res.status(404).send("Draft not found");
    } else {
      res.json({ id, referenceNumber, details, date, status });
    }
  });
});

// Delete a draft
app.delete("/drafts/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM drafts WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Error deleting draft:", err.message);
      res.status(500).send("Error deleting draft");
    } else if (this.changes === 0) {
      res.status(404).send("Draft not found");
    } else {
      res.status(204).send();
    }
  });
});

// ===================== Sales Endpoints =====================

// Add a sale or bulk sales
app.post("/sales", (req, res) => {
  const salesData = Array.isArray(req.body) ? req.body : [req.body];

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    let errorOccurred = false;

    salesData.forEach(({ product_id, quantity, reference_number }) => {
      db.get(
        "SELECT * FROM products WHERE id = ?",
        [product_id],
        (err, product) => {
          if (err || !product) {
            errorOccurred = true;
            return console.error(err ? err.message : "Product not found");
          }

          if (product.stock < quantity) {
            errorOccurred = true;
            return console.error(
              "Insufficient stock for product ID:",
              product_id
            );
          }

          const total_price = product.sp * quantity;

          db.run(
            "INSERT INTO sales (product_id,reference_number, quantity, total_price, date) VALUES (?, ?, ?, ?, ?)",
            [
              product_id,
              reference_number,
              quantity,
              total_price,
              new Date().toISOString(),
            ],
            (err) => {
              if (err) {
                errorOccurred = true;
                console.error(err.message);
              }
            }
          );

          db.run(
            "UPDATE products SET stock = stock - ? WHERE id = ?",
            [quantity, product_id],
            (err) => {
              if (err) {
                errorOccurred = true;
                console.error(err.message);
              }
            }
          );
        }
      );
    });

    if (errorOccurred) {
      db.run("ROLLBACK");
      res.status(400).send("Error processing sales");
    } else {
      db.run("COMMIT");
      res.status(201).send("Sales processed successfully");
    }
  });
});

// Get all sales
app.get("/sales", (req, res) => {
  db.all(
    `SELECT sales.id, products.name AS product_name, sales.quantity, sales.total_price, sales.date 
     FROM sales 
     JOIN products ON sales.product_id = products.id`,
    (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error fetching sales");
      } else {
        res.json(rows);
      }
    }
  );
});
// ===================== Suppliers Endpoints =====================

// Get all suppliers
app.get("/suppliers", (req, res) => {
  db.all("SELECT * FROM suppliers", (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching suppliers");
    } else {
      res.json(rows);
    }
  });
});

// Get a specific supplier by ID
app.get("/suppliers/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM suppliers WHERE contact_id = ?", [id], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error fetching supplier");
    } else if (!row) {
      res.status(404).send("Supplier not found");
    } else {
      res.json(row);
    }
  });
});

// Add a new supplier
app.post("/suppliers", (req, res) => {
  const {
    type,
    contact_id,
    business_name,
    name,
    email,
    tax_number,
    pay_term,
    opening_balance,
    advance_balance,
    address,
    mobile,
  } = req.body;

  const stmt = db.prepare(
    `INSERT INTO suppliers 
    (type, contact_id, business_name, name, email, tax_number, pay_term, opening_balance, advance_balance, added_on, address, mobile, total_purchase_due, total_purchase_return_due) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`
  );

  stmt.run(
    type,
    contact_id,
    business_name,
    name,
    email,
    tax_number,
    pay_term,
    opening_balance || 0,
    advance_balance || 0,
    new Date().toISOString(),
    address,
    mobile,
    function (err) {
      if (err) {
        console.error(err.message);
        res.status(500).send("Error adding supplier");
      } else {
        res.status(201).json({ id: this.lastID, ...req.body });
      }
    }
  );
});

// Update a supplier
app.put("/suppliers/:id", (req, res) => {
  const { id } = req.params;
  const {
    type,
    contact_id,
    business_name,
    name,
    email,
    tax_number,
    pay_term,
    opening_balance,
    advance_balance,
    address,
    mobile,
    active_status,
  } = req.body;

  const fields = [];
  const values = [];

  if (type) {
    fields.push("type = ?");
    values.push(type);
  }
  if (contact_id) {
    fields.push("contact_id = ?");
    values.push(contact_id);
  }
  if (business_name) {
    fields.push("business_name = ?");
    values.push(business_name);
  }
  if (name) {
    fields.push("name = ?");
    values.push(name);
  }
  if (email) {
    fields.push("email = ?");
    values.push(email);
  }
  if (tax_number) {
    fields.push("tax_number = ?");
    values.push(tax_number);
  }
  if (pay_term) {
    fields.push("pay_term = ?");
    values.push(pay_term);
  }
  if (opening_balance) {
    fields.push("opening_balance = ?");
    values.push(opening_balance);
  }
  if (advance_balance) {
    fields.push("advance_balance = ?");
    values.push(advance_balance);
  }
  if (address) {
    fields.push("address = ?");
    values.push(address);
  }
  if (mobile) {
    fields.push("mobile = ?");
    values.push(mobile);
  }
  if (active_status) {
    fields.push("active_status = ?");
    values.push(active_status);
  }

  values.push(id);

  const query = `UPDATE suppliers SET ${fields.join(
    ", "
  )} WHERE contact_id = ?`;

  db.run(query, values, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error updating supplier");
    } else if (this.changes === 0) {
      res.status(404).send("Supplier not found");
    } else {
      res.json({ id, ...req.body });
    }
  });
});

// Delete a supplier
app.delete("/suppliers/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM suppliers WHERE contact_id = ?", [id], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error deleting supplier");
    } else if (this.changes === 0) {
      res.status(404).send("Supplier not found");
    } else {
      res.status(204).send();
    }
  });
});
// Update supplier active status
app.patch("/suppliers/:id", (req, res) => {
  const { id } = req.params;
  const { active_status } = req.body;

  // Update the active_status field for the customer
  const query = "UPDATE suppliers SET active_status = ? WHERE contact_id = ?";

  db.run(query, [active_status, id], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error updating active status");
    } else if (this.changes === 0) {
      res.status(404).send("Supplier not found");
    } else {
      res.json({ id, active_status });
    }
  });
});
// ===================== Customers Endpoints =====================

// Get all customers
app.get("/customers", (req, res) => {
  db.all("SELECT * FROM customers", (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching customers");
    } else {
      res.json(rows);
    }
  });
});

// Get a specific customer by ID
app.get("/customers/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM customers WHERE contact_id = ?", [id], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error fetching customer");
    } else if (!row) {
      res.status(404).send("Customer not found");
    } else {
      res.json(row);
    }
  });
});

// Add a new customer
app.post("/customers", (req, res) => {
  const {
    contact_id,
    customer_type,
    business_name,
    name,
    email,
    tax_number,
    credit_limit,
    pay_term,
    opening_balance,
    advance_balance,
    address,
    mobile,
    customer_group,
  } = req.body;

  const stmt = db.prepare(
    `INSERT INTO customers 
    (contact_id, customer_type,business_name, name, email, tax_number, credit_limit, pay_term, opening_balance, advance_balance, added_on, address, mobile, customer_group, total_sale_due, total_sell_return_due) 
    VALUES (?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`
  );

  stmt.run(
    contact_id,
    customer_type,
    business_name,
    name,
    email,
    tax_number,
    credit_limit || 0,
    pay_term || 0,
    opening_balance || 0,
    advance_balance || 0,
    new Date().toISOString(),
    address,
    mobile,
    customer_group,
    function (err) {
      if (err) {
        console.error(err.message);
        res.status(500).send("Error adding customer");
      } else {
        res.status(201).json({ id: this.lastID, ...req.body });
      }
    }
  );
});

// Update a customer
app.put("/customers/:id", (req, res) => {
  const { id } = req.params;
  const {
    contact_id,
    customer_type,
    business_name,
    name,
    email,
    tax_number,
    credit_limit,
    pay_term,
    opening_balance,
    advance_balance,
    address,
    mobile,
    customer_group,
  } = req.body;

  const fields = [];
  const values = [];

  if (contact_id) {
    fields.push("contact_id = ?");
    values.push(contact_id);
  }
  if (business_name) {
    fields.push("business_name = ?");
    values.push(business_name);
  }
  if (name) {
    fields.push("name = ?");
    values.push(name);
  }
  if (email) {
    fields.push("email = ?");
    values.push(email);
  }
  if (tax_number) {
    fields.push("tax_number = ?");
    values.push(tax_number);
  }
  if (credit_limit) {
    fields.push("credit_limit = ?");
    values.push(credit_limit);
  }
  if (pay_term) {
    fields.push("pay_term = ?");
    values.push(pay_term);
  }
  if (opening_balance) {
    fields.push("opening_balance = ?");
    values.push(opening_balance);
  }
  if (advance_balance) {
    fields.push("advance_balance = ?");
    values.push(advance_balance);
  }
  if (address) {
    fields.push("address = ?");
    values.push(address);
  }
  if (mobile) {
    fields.push("mobile = ?");
    values.push(mobile);
  }
  if (customer_group) {
    fields.push("customer_group = ?");
    values.push(customer_group);
  }
  if (customer_type) {
    fields.push("customer_type = ?");
    values.push(customer_type);
  }

  values.push(id);

  const query = `UPDATE customers SET ${fields.join(
    ", "
  )} WHERE contact_id = ?`;

  db.run(query, values, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error updating customer");
    } else if (this.changes === 0) {
      res.status(404).send("Customer not found");
    } else {
      res.json({ id, ...req.body });
    }
  });
});

// Delete a customer
app.delete("/customers/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM customers WHERE contact_id = ?", [id], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error deleting customer");
    } else if (this.changes === 0) {
      res.status(404).send("Customer not found");
    } else {
      res.status(204).send();
    }
  });
});
// Update customer active status
app.patch("/customers/:id", (req, res) => {
  const { id } = req.params;
  const { active_status } = req.body;

  // Update the active_status field for the customer
  const query = "UPDATE customers SET active_status = ? WHERE contact_id = ?";

  db.run(query, [active_status, id], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error updating active status");
    } else if (this.changes === 0) {
      res.status(404).send("Customer not found");
    } else {
      res.json({ id, active_status });
    }
  });
});
// ===================== Customer Groups Endpoints =====================

// Get all customer groups
app.get("/customer_groups", (req, res) => {
  db.all("SELECT * FROM customer_groups", (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching customer groups");
    } else {
      res.json(rows);
    }
  });
});

// Get a specific customer group by ID
app.get("/customer_groups/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM customer_groups WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error fetching customer group");
    } else if (!row) {
      res.status(404).send("Customer group not found");
    } else {
      res.json(row);
    }
  });
});

// Add a new customer group
app.post("/customer_groups", (req, res) => {
  const {
    group_name,
    discount,
    discount_type,
    tax_type,
    tax_rate,
    tax_type_details,
    description,
    active_status,
  } = req.body;

  const stmt = db.prepare(
    `INSERT INTO customer_groups 
    (group_name, discount, discount_type, tax_type, tax_rate, tax_type_details, description, active_status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  stmt.run(
    group_name,
    discount || 0,
    discount_type || "percentage",
    tax_type || "VAT",
    tax_rate || 0,
    tax_type_details || "",
    description || "",
    active_status || 1,
    function (err) {
      if (err) {
        console.error(err.message);
        res.status(500).send("Error adding customer group");
      } else {
        res.status(201).json({ id: this.lastID, ...req.body });
      }
    }
  );
});

// Update a customer group
app.put("/customer_groups/:id", (req, res) => {
  const { id } = req.params;
  const {
    group_name,
    discount,
    discount_type,
    tax_type,
    tax_rate,
    tax_type_details,
    description,
    active_status,
  } = req.body;

  const fields = [];
  const values = [];

  if (group_name) {
    fields.push("group_name = ?");
    values.push(group_name);
  }
  if (discount !== undefined) {
    fields.push("discount = ?");
    values.push(discount);
  }
  if (discount_type) {
    fields.push("discount_type = ?");
    values.push(discount_type);
  }
  if (tax_type) {
    fields.push("tax_type = ?");
    values.push(tax_type);
  }
  if (tax_rate !== undefined) {
    fields.push("tax_rate = ?");
    values.push(tax_rate);
  }
  if (tax_type_details) {
    fields.push("tax_type_details = ?");
    values.push(tax_type_details);
  }
  if (description) {
    fields.push("description = ?");
    values.push(description);
  }
  if (active_status !== undefined) {
    fields.push("active_status = ?");
    values.push(active_status);
  }

  values.push(id);

  const query = `UPDATE customer_groups SET ${fields.join(", ")} WHERE id = ?`;

  db.run(query, values, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error updating customer group");
    } else if (this.changes === 0) {
      res.status(404).send("Customer group not found");
    } else {
      res.json({ id, ...req.body });
    }
  });
});

// Delete a customer group
app.delete("/customer_groups/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM customer_groups WHERE id = ?", [id], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error deleting customer group");
    } else if (this.changes === 0) {
      res.status(404).send("Customer group not found");
    } else {
      res.status(204).send();
    }
  });
});

// Update customer group active status
app.patch("/customer_groups/:id", (req, res) => {
  const { id } = req.params;
  const { active_status } = req.body;

  // Update the active_status field for the customer group
  const query = "UPDATE customer_groups SET active_status = ? WHERE id = ?";

  db.run(query, [active_status, id], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error updating active status");
    } else if (this.changes === 0) {
      res.status(404).send("Customer group not found");
    } else {
      res.json({ id, active_status });
    }
  });
});

// ===================== Server Initialization =====================
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing the database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
    process.exit(0);
  });
});
