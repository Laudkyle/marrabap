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
const uploadsDir = path.join(__dirname, "public", "uploads", "images");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Ensure `uploads/documents` directory exists
const documentsDir = path.join(__dirname, "public", "uploads", "documents");
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir);
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
app.use((req, res, next) => {
  res.setTimeout(60000, () => {
    // Set timeout to 60 seconds
    res.status(408).send("Request timeout");
  });
  next();
});
// Serve static files from the `uploads` directory
app.use("/uploads", express.static(uploadsDir));
app.use("/uploads/documents", express.static(documentsDir));

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

// Configure Multer for file uploads specifically for documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsDir); // Save documents to the 'uploads/documents' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with extension
  },
});

const documentUpload = multer({ storage: documentStorage });

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

app.post("/products/bulk", (req, res) => {
  const { suppliers_id, products } = req.body;

  // Validate input
  if (!suppliers_id) {
    return res.status(400).send("Supplier ID is required.");
  }

  if (!Array.isArray(products) || products.length === 0) {
    return res
      .status(400)
      .send("Products array is required and cannot be empty.");
  }

  const invalidProduct = products.find(
    (product) =>
      !product.name ||
      isNaN(product.cp) ||
      isNaN(product.sp) ||
      product.cp < 0 ||
      product.sp < 0
  );

  if (invalidProduct) {
    return res
      .status(400)
      .send(
        "Each product must have a name, cp, and sp with non-negative values."
      );
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    let errorOccurred = false;

    products.forEach((product) => {
      const stmt = db.prepare(
        "INSERT INTO products (name, cp, sp, suppliers_id) VALUES (?, ?, ?, ?)"
      );

      stmt.run(product.name, product.cp, product.sp, suppliers_id, (err) => {
        if (err) {
          console.error("Error inserting product:", err.message);
          errorOccurred = true;
        }
      });

      stmt.finalize();
    });

    if (errorOccurred) {
      db.run("ROLLBACK");
      return res
        .status(500)
        .send("Failed to add products. Transaction rolled back.");
    }

    db.run("COMMIT");
    res.status(201).send("Products added successfully.");
  });
});
// Add a new product
app.post("/products", upload.single("image"), (req, res) => {
  const { name, cp, sp, suppliers_id } = req.body;
  const imagePath = req.file ? `/uploads/images/${req.file.filename}` : null;

  // Validation: Ensure required fields are provided and constraints are respected
  if (!name || cp < 0 || sp < 0 || !suppliers_id) {
    return res
      .status(400)
      .send("Invalid product data. Please check your inputs.");
  }

  const stmt = db.prepare(
    "INSERT INTO products (name, cp, sp, image, suppliers_id) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(name, cp, sp, imagePath, suppliers_id, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error adding product");
    } else {
      res.status(201).json({
        id: this.lastID,
        name,
        cp,
        sp,
        image: imagePath,
        suppliers_id,
      });
    }
  });
});

// Update a product
app.put("/products/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { name, cp, sp, suppliers_id } = req.body;
  const imagePath = req.file ? `/uploads/images/${req.file.filename}` : null;

  const fields = [];
  const values = [];

  // Dynamically add fields for update based on input
  if (name) {
    fields.push("name = ?");
    values.push(name);
  }
  if (cp >= 0) {
    fields.push("cp = ?");
    values.push(cp);
  }
  if (sp >= 0) {
    fields.push("sp = ?");
    values.push(sp);
  }
  if (suppliers_id) {
    fields.push("suppliers_id = ?");
    values.push(suppliers_id);
  }
  if (imagePath) {
    fields.push("image = ?");
    values.push(imagePath);
  }

  if (fields.length === 0) {
    return res.status(400).send("No valid fields provided for update.");
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
      res.json({
        id,
        name,
        cp,
        sp,
        image: imagePath,
        suppliers_id,
      });
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

// ===================== Pos Products Endpoints =====================
// Add a product to POS
app.post("/pos_products", (req, res) => {
  const { product_id } = req.body;

  // Validate product_id
  if (!product_id) {
    return res.status(400).send("Product ID is required");
  }

  // Fetch product from the main products table
  const query = `
    SELECT id, name, sp AS price, stock 
    FROM products 
    WHERE id = ?
  `;

  db.get(query, [product_id], (err, product) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Error fetching product");
    }

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Insert product into pos_products
    const insertQuery = `
      INSERT INTO pos_products (product_id, name, stock, price)
      VALUES (?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [product.id, product.name, product.stock, product.price],
      function (err) {
        if (err) {
          console.error(err.message);
          return res.status(500).send("Error adding product to POS");
        }

        res.status(201).json({
          product_id: product.id,
          name: product.name,
          stock: product.stock,
          price: product.price,
        });
      }
    );
  });
});

// Update POS product
app.put("/pos_products/:product_id", (req, res) => {
  const { product_id } = req.params;
  const { stock, price } = req.body;

  const fields = [];
  const values = [];

  if (stock !== undefined) {
    fields.push("stock = ?");
    values.push(stock);
  }
  if (price !== undefined) {
    fields.push("price = ?");
    values.push(price);
  }

  if (fields.length === 0) {
    return res.status(400).send("No valid fields to update");
  }

  values.push(product_id);

  const query = `UPDATE pos_products SET ${fields.join(
    ", "
  )} WHERE product_id = ?`;

  db.run(query, values, function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Error updating POS product");
    }

    if (this.changes === 0) {
      return res.status(404).send("POS product not found");
    }

    res.status(200).send("POS product updated successfully");
  });
});

// Delete a POS product
app.delete("/pos_products/:product_id", (req, res) => {
  const { product_id } = req.params;

  const query = "DELETE FROM pos_products WHERE product_id = ?";

  db.run(query, [product_id], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Error deleting POS product");
    }

    if (this.changes === 0) {
      return res.status(404).send("POS product not found");
    }

    res.status(204).send();
  });
});

// Bulk sync products to POS
app.post("/pos_products/sync", (req, res) => {
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    let errorOccurred = false;

    // Fetch all products from the main products table
    db.all(
      "SELECT id, name, sp AS price, stock FROM products",
      (err, products) => {
        if (err) {
          console.error(err.message);
          errorOccurred = true;
          return;
        }

        // Insert products into pos_products
        products.forEach((product) => {
          const query = `
            INSERT INTO pos_products (product_id, name, stock, price)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(product_id) DO UPDATE SET
              name = excluded.name,
              stock = excluded.stock,
              price = excluded.price
          `;

          db.run(
            query,
            [product.id, product.name, product.stock, product.price],
            (err) => {
              if (err) {
                console.error("Error syncing product to POS:", err.message);
                errorOccurred = true;
              }
            }
          );
        });
      }
    );

    // Commit or rollback based on error state
    if (errorOccurred) {
      db.run("ROLLBACK");
      res.status(500).send("Error syncing products to POS");
    } else {
      db.run("COMMIT");
      res.status(200).send("Products synced to POS successfully");
    }
  });
});

// ===================== Purchase order Endpoints =====================
app.post("/purchase_orders", (req, res) => {
  const { reference_number, supplier_id, total_amount, status, items } =
    req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).send("Product details are required");
  }

  // Prepare the temporary table with product details
  db.serialize(() => {
    // Begin a transaction
    db.run("BEGIN TRANSACTION");

    // Insert items into the temporary table
    const stmt = db.prepare(
      "INSERT INTO temp_purchase_order_items (product_id, quantity, unit_price) VALUES (?, ?, ?)"
    );

    items.forEach((item) => {
      const { product_id, quantity, unit_price } = item;

      stmt.run(product_id, quantity, unit_price, (err) => {
        if (err) {
          console.error("Error inserting item into temp table:", err.message);
        }
      });
    });

    stmt.finalize();

    // Insert the purchase order itself
    const purchaseOrderStmt = db.prepare(
      "INSERT INTO purchase_orders (reference_number, supplier_id, total_amount, order_status,payment_status) VALUES (?, ?, ?, ?,?)"
    );

    purchaseOrderStmt.run(
      reference_number,
      supplier_id,
      total_amount,
      status || "pending",
      "unpaid",
      function (err) {
        if (err) {
          console.error(err.message);
          db.run("ROLLBACK");
          res.status(500).send("Error creating purchase order");
        } else {
          // After inserting the purchase order, the trigger will populate the purchase_order_details table
          const purchase_order_id = this.lastID;

          // Commit the transaction
          db.run("COMMIT");
          res.status(201).json({
            id: purchase_order_id,
            reference_number,
            supplier_id,
            total_amount,
            order_status: status || "pending",
            payment_status: "unpaid",
          });
        }
      }
    );
  });
});

// Get all purchase orders
app.get("/purchase_orders", (req, res) => {
  db.all("SELECT * FROM purchase_orders", (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching purchase orders");
    } else {
      res.json(rows);
    }
  });
});

// Get a single purchase order by ID
app.get("/purchase_orders/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM purchase_orders WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching purchase order");
    } else if (!row) {
      res.status(404).send("Purchase order not found");
    } else {
      res.json(row);
    }
  });
});

// Update status of a purchase order by ID
app.patch("/purchase_orders/:id/order_status", (req, res) => {
  const { id } = req.params;
  const { order_status } = req.body; // Get the new status from the request body
  const user_id = 1; //
  console.log("order status:", order_status);

  // Check if the status is valid
  if (!["pending", "received", "cancelled"].includes(order_status)) {
    return res.status(400).send("Invalid status.");
  }

  db.get(
    `SELECT order_status FROM purchase_orders WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error fetching purchase order.");
      }

      if (!row) {
        return res.status(404).send("Purchase order not found.");
      }

      const oldStatus = row.order_status;

      // Log the action in the audit_trails table
      const changes = JSON.stringify({
        old_status: oldStatus,
        new_status: order_status,
      });

      // Insert a log entry into audit_trails
      db.run(
        `INSERT INTO audit_trails (user_id, table_name, record_id, action, changes) VALUES (?, ?, ?, ?, ?)`,
        [user_id, "purchase_orders", id, "update", changes],
        function (err) {
          if (err) {
            console.error("Error logging to audit_trails:", err);
          }
        }
      );

      // Update the purchase order status
      db.run(
        `UPDATE purchase_orders SET order_status = ? WHERE id = ?`,
        [order_status, id],
        function (err) {
          if (err) {
            console.error(err);
            return res.status(500).send("Error updating status.");
          }

          if (this.changes === 0) {
            return res.status(404).send("Purchase order not found.");
          }

          res.send("Status updated successfully.");
        }
      );
    }
  );
});

// Update a purchase order
app.put("/purchase_orders/:id", (req, res) => {
  const { id } = req.params;
  const { reference_number, supplier_id, total_amount } = req.body;
  const query =
    "UPDATE purchase_orders SET reference_number = ?, supplier_id = ?, total_amount = ? WHERE id = ?";
  db.run(
    query,
    [reference_number, supplier_id, total_amount, id],
    function (err) {
      if (err) {
        console.error(err.message);
        res.status(500).send("Error updating purchase order");
      } else if (this.changes === 0) {
        res.status(404).send("Purchase order not found");
      } else {
        res.json({
          id,
          reference_number,
          supplier_id,
          total_amount,
        });
      }
    }
  );
});

// Delete a purchase order
app.delete("/purchase_orders/:id", async (req, res) => {
  const { id } = req.params;

  // Get the purchase order details before deleting
  db.get(
    `SELECT supplier_id, total_amount FROM purchase_orders WHERE id = ?`,
    [id],
    (err, purchaseOrder) => {
      if (err) {
        console.error("Error fetching purchase order:", err);
        return res.status(500).send("Error deleting purchase order.");
      }

      if (!purchaseOrder) {
        return res.status(404).send("Purchase order not found.");
      }

      const { supplier_id, total_amount } = purchaseOrder;

      // Delete the purchase order
      db.run(`DELETE FROM purchase_orders WHERE id = ?`, [id], (err) => {
        if (err) {
          console.error("Error deleting purchase order:", err);
          return res.status(500).send("Error deleting purchase order.");
        }

        // Update the supplier's total_purchase_due
        db.run(
          `UPDATE suppliers SET total_purchase_due = total_purchase_due - ? WHERE id = ?`,
          [total_amount, supplier_id],
          (err) => {
            if (err) {
              console.error("Error updating supplier's total_purchase_due:", err);
              return res.status(500).send("Error updating supplier's total_purchase_due.");
            }

            res.send("Purchase order deleted and supplier's total_purchase_due updated.");
          }
        );
      });
    }
  );
});


// Get purchase order details by purchase order ID
app.get("/purchase_orders/:id/details", (req, res) => {
  const { id } = req.params;

  db.all(
    `SELECT pod.id, pod.product_id, p.name, pod.quantity, pod.unit_price
     FROM purchase_order_details pod
     JOIN products p ON pod.product_id = p.id
     WHERE pod.purchase_order_id = ?`,
    [id],
    (err, rows) => {
      if (err) {
        console.error(err.message);
        res.status(500).send("Error fetching purchase order details");
      } else {
        res.json(rows);
      }
    }
  );
});

// Delete purchase order detail
app.delete(
  "/purchase_orders_with_details/:purchase_order_id/details/:detail_id",
  (req, res) => {
    const { purchase_order_id, detail_id } = req.params;

    const query = `DELETE FROM purchase_order_details
                 WHERE product_id = ? AND purchase_order_id = ?`;

    db.run(query, [detail_id, purchase_order_id], function (err) {
      if (err) {
        console.error(err.message);
        res.status(500).send("Error deleting purchase order detail");
      } else if (this.changes === 0) {
        res.status(404).send("Purchase order detail not found");
      } else {
        res.status(200).send("Purchase order detail deleted successfully");
      }
    });
  }
);

app.put(
  "/purchase_orders_with_details/:purchase_order_id/details/:detail_id",
  (req, res) => {
    const { purchase_order_id, detail_id } = req.params;
    const { quantity, unit_price } = req.body; // Assuming user_id is provided in the request
    user_id = 1;
    const query = `UPDATE purchase_order_details
                   SET quantity = ?, unit_price = ?
                   WHERE product_id = ? AND purchase_order_id = ?`;

    db.run(
      query,
      [quantity, unit_price, detail_id, purchase_order_id],
      function (err) {
        if (err) {
          console.error(err.message);
          res.status(500).send("Error updating purchase order details");
        } else if (this.changes === 0) {
          res.status(404).send("Purchase order detail not found");
        } else {
          // Log the audit trail after successful update
          const auditTrailQuery = `INSERT INTO audit_trails (
            user_id,
            table_name,
            record_id,
            action,
            changes
          ) VALUES (?, ?, ?, ?, ?)`;

          const changes = JSON.stringify({
            updated_fields: {
              quantity,
              unit_price,
            },
          });

          db.run(
            auditTrailQuery,
            [
              user_id, // ID of the user making the change
              "purchase_order_details", // Affected table
              detail_id, // Record ID (product_id in this case)
              "update", // Action type
              changes, // Change details in JSON
            ],
            (auditErr) => {
              if (auditErr) {
                console.error("Error logging audit trail:", auditErr.message);
                res.status(500).send("Error logging audit trail");
              } else {
                res.json({
                  purchase_order_id,
                  detail_id,
                  quantity,
                  unit_price,
                });
              }
            }
          );
        }
      }
    );
  }
);

// Add a new purchase order detail
app.post(
  "/purchase_orders_with_details/:purchase_order_id/details",
  (req, res) => {
    const { purchase_order_id } = req.params;
    const { product_id, quantity, unit_price } = req.body;

    // Ensure all required fields are provided
    if (!product_id || !quantity || !unit_price) {
      return res
        .status(400)
        .send("Product ID, quantity, and unit price are required");
    }

    const query = `INSERT INTO purchase_order_details (purchase_order_id, product_id, quantity, unit_price)
                 VALUES (?, ?, ?, ?)`;

    db.run(
      query,
      [purchase_order_id, product_id, quantity, unit_price],
      function (err) {
        if (err) {
          console.error(err.message);
          res.status(500).send("Error adding purchase order detail");
        } else {
          res.status(201).json({
            purchase_order_id,
            product_id,
            quantity,
            unit_price,
            id: this.lastID, // Return the ID of the inserted row if applicable
          });
        }
      }
    );
  }
);

// ===================== Draft Endpoints =====================

// Get all drafts
app.get("/drafts", (req, res) => {
  db.all("SELECT * FROM drafts ORDER BY date DESC", (err, rows) => {
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
// ===================== Invoice Endpoints =====================

// Create invoice (POST request)
app.post("/invoices", (req, res) => {
  const {
    reference_number,
    customer_id,
    total_amount,
    amount_paid = 0,
    due_date = null,
    status = "unpaid",
  } = req.body;

  const sql = `
    INSERT INTO invoices (reference_number, customer_id, total_amount, amount_paid, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      reference_number,
      customer_id,
      total_amount,
      amount_paid,
      due_date,
      status,
    ],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.status(201).json({ id: this.lastID });
      }
    }
  );
});

// Get all invoices (GET request)
app.get("/invoices", (req, res) => {
  const sql = "SELECT * FROM invoices";

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(200).json(rows);
    }
  });
});

// Get a single invoice by reference_number (GET request)
app.get("/invoices/:reference_number", (req, res) => {
  const { reference_number } = req.params;

  const sql = "SELECT * FROM invoices WHERE reference_number = ?";

  db.get(sql, [reference_number], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ message: "Invoice not found" });
    } else {
      res.status(200).json(row);
    }
  });
});
// Get invoices by customer and status (unpaid or partial)
app.get("/invoices/customer/:customer_id", (req, res) => {
  const { customer_id } = req.params;
  const sql =
    'SELECT * FROM invoices WHERE customer_id = ? AND (status = "unpaid" OR status = "partial")';

  db.all(sql, [customer_id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(200).json(rows);
    }
  });
});

// Update an invoice (PUT request)
app.put("/invoices/:reference_number", (req, res) => {
  const { reference_number } = req.params;
  const { total_amount, amount_paid, due_date, status } = req.body;

  const sql = `
    UPDATE invoices
    SET total_amount = ?, amount_paid = ?, due_date = ?, status = ?
    WHERE reference_number = ?
  `;

  db.run(
    sql,
    [total_amount, amount_paid, due_date, status, reference_number],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ message: "Invoice not found" });
      } else {
        res.status(200).json({ message: "Invoice updated successfully" });
      }
    }
  );
});

// Delete an invoice (DELETE request)
app.delete("/invoices/:reference_number", (req, res) => {
  const { reference_number } = req.params;

  const sql = "DELETE FROM invoices WHERE reference_number = ?";

  db.run(sql, [reference_number], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ message: "Invoice not found" });
    } else {
      res.status(200).json({ message: "Invoice deleted successfully" });
    }
  });
});

// ===================== Payments Endpoints =====================
// CREATE: Add a new payment
app.post("/payments", (req, res) => {
  const {
    reference_number,
    payment_date,
    amount_paid,
    payment_method,
    payment_reference,
  } = req.body;

  if (!reference_number || !amount_paid) {
    return res
      .status(400)
      .send("Reference number and amount paid are required.");
  }

  const query = `
    INSERT INTO payments (reference_number, payment_date, amount_paid, payment_method, payment_reference)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [
    reference_number,
    payment_date || new Date().toISOString(),
    amount_paid,
    payment_method || null,
    payment_reference || null,
  ];

  db.run(query, params, function (err) {
    if (err) {
      console.error("Error adding payment:", err.message);
      return res.status(500).send("Failed to add payment.");
    }
    res.status(201).send({ id: this.lastID });
  });
});

// READ: Get all payments
app.get("/payments", (req, res) => {
  const query = "SELECT * FROM payments";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error retrieving payments:", err.message);
      return res.status(500).send("Failed to retrieve payments.");
    }
    res.status(200).json(rows);
  });
});

// READ: Get a specific payment by ID
app.get("/payments/:id", (req, res) => {
  const query = "SELECT * FROM payments WHERE id = ?";
  const params = [req.params.id];

  db.get(query, params, (err, row) => {
    if (err) {
      console.error("Error retrieving payment:", err.message);
      return res.status(500).send("Failed to retrieve payment.");
    }
    if (!row) {
      return res.status(404).send("Payment not found.");
    }
    res.status(200).json(row);
  });
});

// UPDATE: Update a payment
app.put("/payments/:id", (req, res) => {
  const {
    reference_number,
    payment_date,
    amount_paid,
    payment_method,
    payment_reference,
  } = req.body;

  const query = `
    UPDATE payments
    SET reference_number = ?, payment_date = ?, amount_paid = ?, payment_method = ?, payment_reference = ?
    WHERE id = ?
  `;
  const params = [
    reference_number,
    payment_date,
    amount_paid,
    payment_method,
    payment_reference,
    req.params.id,
  ];

  db.run(query, params, function (err) {
    if (err) {
      console.error("Error updating payment:", err.message);
      return res.status(500).send("Failed to update payment.");
    }
    if (this.changes === 0) {
      return res.status(404).send("Payment not found.");
    }
    res.status(200).send("Payment updated successfully.");
  });
});

// DELETE: Delete a payment
app.delete("/payments/:id", (req, res) => {
  const query = "DELETE FROM payments WHERE id = ?";
  const params = [req.params.id];

  db.run(query, params, function (err) {
    if (err) {
      console.error("Error deleting payment:", err.message);
      return res.status(500).send("Failed to delete payment.");
    }
    if (this.changes === 0) {
      return res.status(404).send("Payment not found.");
    }
    res.status(200).send("Payment deleted successfully.");
  });
});

// ===================== Sales Endpoints =====================
app.post("/sales", async (req, res) => {
  const salesData = Array.isArray(req.body) ? req.body : [req.body];
  const dbPromise = new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) return reject(new Error("Failed to start transaction"));

        let errorOccurred = false;
        let totalCartPrice = 0;
        const saleResponses = [];
        const reference_number = salesData[0].reference_number; // Assuming reference_number is the same for all items in the cart
        const customer_id = salesData[0].customer_id; // Assuming customer_id is the same for all items in the cart
        const payment_method = salesData[0].payment_method; // Assuming payment_method is the same for all items in the cart

        // Process each sale item in the cart
        const processSalePromises = salesData.map(
          ({ product_id, quantity }) => {
            return new Promise((resolveSale, rejectSale) => {
              db.get(
                "SELECT * FROM products WHERE id = ?",
                [product_id],
                (err, product) => {
                  if (err || !product) {
                    errorOccurred = true;
                    console.error(err ? err.message : "Product not found");
                    return rejectSale("Product not found");
                  }

                  if (product.stock < quantity) {
                    errorOccurred = true;
                    console.error(
                      "Insufficient stock for product ID:",
                      product_id
                    );
                    return rejectSale("Insufficient stock");
                  }

                  const total_price = product.sp * quantity;
                  totalCartPrice += total_price; // Sum total price for the cart

                  // Insert the sale record for each item
                  db.run(
                    "INSERT INTO sales (customer_id, product_id, payment_method, reference_number, quantity, total_price, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                      customer_id,
                      product_id,
                      payment_method,
                      reference_number,
                      quantity,
                      total_price,
                      new Date().toISOString(),
                    ],
                    (err) => {
                      if (err) {
                        errorOccurred = true;
                        console.error("Error: ", err.message);
                        return rejectSale("Error inserting sale items");
                      }
                      resolveSale({
                        customer_id,
                        product_id,
                        quantity,
                        total_price,
                      });
                    }
                  );
                }
              );
            });
          }
        );

        // Wait for all sales items in the cart to be processed
        Promise.allSettled(processSalePromises)
          .then((results) => {
            results.forEach((result, index) => {
              if (result.status === "fulfilled") {
                saleResponses.push(result.value);
              } else {
                errorOccurred = true;
                console.error(`Sale ${index + 1} failed:`, result.reason);
              }
            });

            // After processing all items, insert the total price for the cart
            if (!errorOccurred) {
              db.run(
                "INSERT INTO invoices (reference_number, customer_id, total_amount, amount_paid, status) VALUES (?, ?, ?, ?, ?)",
                [
                  reference_number, // Reference number for the cart
                  customer_id, // Customer ID
                  totalCartPrice, // Total price for the cart
                  payment_method == "credit" ? 0 : totalCartPrice, // Amount paid: 0 for credit, full amount for cash
                  payment_method == "credit" ? "unpaid" : "paid", // Status: 'unpaid' for credit, 'paid' for cash
                ],
                (err) => {
                  if (err) {
                    errorOccurred = true;
                    console.error("Invoice error: ", err.message);
                  }
                }
              );
            }

            // If any error occurred, rollback transaction
            if (errorOccurred) {
              db.run("ROLLBACK", (rollbackErr) => {
                if (rollbackErr) {
                  return reject(new Error("Failed to rollback transaction"));
                }
                reject(new Error("Error processing sales"));
              });
            } else {
              db.run("COMMIT", (err) => {
                if (err) {
                  return reject(new Error("Failed to commit transaction"));
                }
                resolve(saleResponses); // Return successful sale data
              });
            }
          })
          .catch((err) => {
            db.run("ROLLBACK", (rollbackErr) => {
              if (rollbackErr) {
                return reject(new Error("Failed to rollback transaction"));
              }
              reject(new Error(err));
            });
          });
      });
    });
  });

  try {
    const result = await dbPromise;

    // Respond with a JSON object containing the success data
    res.status(201).json({
      message: "Sales processed successfully",
      sales: result, // Include details of each sale processed
    });
  } catch (error) {
    console.error(error.message);

    // Respond with an error message and status code
    res.status(400).json({
      message: "Error processing sales",
      error: error.message,
    });
  }
});

// Get all sales
app.get("/sales", (req, res) => {
  db.all(
    `SELECT sales.id,sales.reference_number, products.name AS product_name, sales.quantity, sales.total_price, sales.date 
     FROM sales 
     JOIN products ON sales.product_id = products.id ORDER BY sales.date DESC`,
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

app.post("/sales/return", async (req, res) => {
  const { sale_id, reference_number, return_quantity, action } = req.body;

  // Validate input
  if (!sale_id || !reference_number || !return_quantity || !action) {
    return res.status(400).json({
      message:
        "Invalid input. Provide sale_id, reference_number, return_quantity, and action.",
    });
  }

  if (!["restock", "dispose"].includes(action)) {
    return res.status(400).json({
      message: "Invalid action. Action must be 'restock' or 'dispose'.",
    });
  }

  try {
    // Insert return record; trigger will handle the rest
    db.run(
      "INSERT INTO returns (sale_id, reference_number, return_quantity, action, return_date) VALUES (?, ?, ?, ?, ?)",
      [
        sale_id,
        reference_number,
        return_quantity,
        action,
        new Date().toISOString(),
      ],
      (err) => {
        if (err) {
          console.error("Error logging return:", err.message);
          return res.status(500).json({ message: "Error logging return." });
        }

        return res.status(200).json({
          message: "Return processed successfully.",
          sale_id,
          reference_number,
          return_quantity,
          action,
        });
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Get All Returns
app.get("/sales/returns", async (req, res) => {
  try {
    db.all("SELECT * FROM returns", (err, rows) => {
      if (err) {
        console.error("Error fetching returns:", err.message);
        return res.status(500).json({ message: "Internal server error." });
      }

      return res.status(200).json(rows);
    });
  } catch (error) {
    console.error("Unexpected error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Get Single Return by ID
app.get("/sales/returns/:id", async (req, res) => {
  const { id } = req.params;

  try {
    db.get("SELECT * FROM returns WHERE id = ?", [id], (err, row) => {
      if (err) {
        console.error("Error fetching return:", err.message);
        return res.status(500).json({ message: "Internal server error." });
      }

      if (!row) {
        return res.status(404).json({ message: "Return not found." });
      }

      return res.status(200).json(row);
    });
  } catch (error) {
    console.error("Unexpected error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
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
    total_purchase_due,
    total_purchase_return_due,
    active_status,
  } = req.body;

  const fields = [];
  const values = [];

  // Validate and add fields to the update statement
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
  if (opening_balance !== undefined) {
    if (opening_balance < 0) {
      return res.status(400).send("Opening balance must be non-negative.");
    }
    fields.push("opening_balance = ?");
    values.push(opening_balance);
  }
  if (advance_balance !== undefined) {
    if (advance_balance < 0) {
      return res.status(400).send("Advance balance must be non-negative.");
    }
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
  if (total_purchase_due !== undefined) {
    if (total_purchase_due < 0) {
      return res.status(400).send("Total purchase due must be non-negative.");
    }
    fields.push("total_purchase_due = ?");
    values.push(total_purchase_due);
  }
  if (total_purchase_return_due !== undefined) {
    if (total_purchase_return_due < 0) {
      return res.status(400).send("Total purchase return due must be non-negative.");
    }
    fields.push("total_purchase_return_due = ?");
    values.push(total_purchase_return_due);
  }
  if (active_status !== undefined) {
    if (![0, 1].includes(active_status)) {
      return res.status(400).send("Active status must be 0 or 1.");
    }
    fields.push("active_status = ?");
    values.push(active_status);
  }

  // Add the supplier ID to the values array
  values.push(id);

  // Construct the query
  const query = `UPDATE suppliers SET ${fields.join(
    ", "
  )} WHERE id = ?`;

  // Execute the query
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

// Get all purchase orders for a specific supplier
app.get("/suppliers/purchase_orders/:supplierId", (req, res) => {
  const { supplierId } = req.params;

  const query = `
    SELECT * 
    FROM purchase_orders 
    WHERE supplier_id = ?
  `;

  db.all(query, [supplierId], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error fetching purchase orders for supplier.");
    } else if (rows.length === 0) {
      res.status(404).send("No purchase orders found for this supplier.");
    } else {
      res.json(rows);
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

// ===================== Documents Endpoints =====================

// CREATE: Add multiple or single documents
app.post("/documents", documentUpload.array("files"), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  const { transaction_type, reference_number } = req.body;
  const uploadedDocuments = [];

  try {
    await Promise.all(
      req.files.map((file) => {
        return new Promise((resolve, reject) => {
          const filePath = `/uploads/documents/${file.filename}`;
          const query = `INSERT INTO documents (transaction_type, reference_number, document_name, file_path) VALUES (?, ?, ?, ?)`;
          db.run(
            query,
            [transaction_type, reference_number, file.originalname, filePath],
            function (err) {
              if (err) return reject(err);
              uploadedDocuments.push({
                id: this.lastID,
                transaction_type,
                reference_number,
                document_name: file.originalname,
                file_path: filePath,
              });
              resolve();
            }
          );
        });
      })
    );

    return res.status(201).json(uploadedDocuments);
  } catch (error) {
    console.error("Error during document upload:", error.message);
    return res.status(500).json({ message: "Error during document upload" });
  }
});

// READ: Get all documents
app.get("/documents", (req, res) => {
  const query = `SELECT * FROM documents`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(rows);
  });
});

// READ: Get a document by ID
app.get("/documents/:id", (req, res) => {
  const { id } = req.params;
  const query = `SELECT * FROM documents WHERE id = ?`;
  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.status(200).json(row);
  });
});

// DELETE: Delete a document by ID
app.delete("/documents/:id", (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM documents WHERE id = ?`;
  db.run(query, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.status(200).json({ message: "Document deleted successfully" });
  });
});

app.get("/documents/by-reference/:referenceNumber", (req, res) => {
  const { referenceNumber } = req.params;
  const query = `SELECT * FROM documents WHERE reference_number = ?`;

  db.all(query, [referenceNumber], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(rows);
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
