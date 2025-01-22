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
// Get all products with quantity in stock from inventory
app.get("/products", (req, res) => {
  const query = `
    SELECT 
      products.id, 
      products.name, 
      products.cp, 
      products.sp, 
      products.image, 
      products.suppliers_id,
      IFNULL(SUM(inventory.quantity_in_stock), 0) AS quantity_in_stock
    FROM products
    LEFT JOIN inventory ON products.id = inventory.product_id
    GROUP BY products.id
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching products");
    } else {
      res.json(rows);
    }
  });
});

// Get a specific product by ID with quantity in stock from inventory
app.get("/products/:id", (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      products.id, 
      products.name, 
      products.cp, 
      products.sp, 
      products.image, 
      products.suppliers_id,
      IFNULL(SUM(inventory.quantity_in_stock), 0) AS quantity_in_stock
    FROM products
    LEFT JOIN inventory ON products.id = inventory.product_id
    WHERE products.id = ?
    GROUP BY products.id
  `;
  
  db.get(query, [id], (err, row) => {
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

    const inventoryInserts = [];

    products.forEach((product) => {
      const stmt = db.prepare(
        "INSERT INTO products (name, cp, sp, suppliers_id) VALUES (?, ?, ?, ?)"
      );

      stmt.run(product.name, product.cp, product.sp, suppliers_id, function (err) {
        if (err) {
          console.error("Error inserting product:", err.message);
          errorOccurred = true;
        } else {
          const productId = this.lastID;

          // Prepare inventory entry for the newly added product
          inventoryInserts.push(
            new Promise((resolve, reject) => {
              db.run(
                "INSERT INTO inventory (product_id, quantity_in_stock, cost_per_unit) VALUES (?, ?, ?)",
                [productId, 0, product.cp],
                (err) => {
                  if (err) {
                    console.error("Error inserting into inventory:", err.message);
                    return reject(err);
                  }
                  resolve();
                }
              );
            })
          );
        }
      });

      stmt.finalize();
    });

    // Wait for all inventory entries to be created
    Promise.all(inventoryInserts)
      .then(() => {
        if (errorOccurred) {
          db.run("ROLLBACK");
          return res
            .status(500)
            .send("Failed to add products. Transaction rolled back.");
        }

        db.run("COMMIT");
        res.status(201).send("Products and inventory entries added successfully.");
      })
      .catch((err) => {
        console.error("Error during inventory insertion:", err.message);
        db.run("ROLLBACK");
        res
          .status(500)
          .send("Failed to add inventory entries. Transaction rolled back.");
      });
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

// ===================== Inventoty Endpoints =====================
/// Create Inventory
app.post('/inventory', (req, res) => {
  const { product_id, quantity_in_stock, cost_per_unit } = req.body;

  if (!product_id || !quantity_in_stock || !cost_per_unit) {
    return res.status(400).send("Missing required fields.");
  }

  const stmt = db.prepare(
    `INSERT INTO inventory (product_id, quantity_in_stock, cost_per_unit) 
     VALUES (?, ?, ?)`
  );

  stmt.run(product_id, quantity_in_stock, cost_per_unit, function(err) {
    if (err) {
      return res.status(500).send("Failed to add inventory.");
    }
    res.status(201).json({ id: this.lastID, product_id, quantity_in_stock, cost_per_unit });
  });
});

// Read All Inventory Items
app.get('/inventory', (req, res) => {
  db.all('SELECT * FROM inventory', [], (err, rows) => {
    if (err) {
      return res.status(500).send("Failed to retrieve inventory.");
    }
    res.status(200).json(rows);
  });
});

// Read Single Inventory Item by ID
app.get('/inventory/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM inventory WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).send("Failed to retrieve inventory item.");
    }
    if (!row) {
      return res.status(404).send("Inventory item not found.");
    }
    res.status(200).json(row);
  });
});

// Update Inventory
app.put('/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { product_id, quantity_in_stock, cost_per_unit } = req.body;

  if (!product_id || !quantity_in_stock || !cost_per_unit) {
    return res.status(400).send("Missing required fields.");
  }

  const stmt = db.prepare(
    `UPDATE inventory 
     SET product_id = ?, quantity_in_stock = ?, cost_per_unit = ? 
     WHERE id = ?`
  );

  stmt.run(product_id, quantity_in_stock, cost_per_unit, id, function(err) {
    if (err) {
      return res.status(500).send("Failed to update inventory.");
    }
    if (this.changes === 0) {
      return res.status(404).send("Inventory item not found.");
    }
    res.status(200).send("Inventory item updated successfully.");
  });
});

// Delete Inventory Item
app.delete('/inventory/:id', (req, res) => {
  const { id } = req.params;

  const stmt = db.prepare('DELETE FROM inventory WHERE id = ?');
  
  stmt.run(id, function(err) {
    if (err) {
      return res.status(500).send("Failed to delete inventory item.");
    }
    if (this.changes === 0) {
      return res.status(404).send("Inventory item not found.");
    }
    res.status(200).send("Inventory item deleted successfully.");
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

app.patch("/purchase_orders/:id/order_status", async (req, res) => {
  const { id } = req.params;
  const { order_status, reference_number } = req.body;
  const user_id = 1; // Replace with actual logged-in user ID

  if (!["pending", "received", "cancelled"].includes(order_status)) {
    return res.status(400).send("Invalid status.");
  }

  try {
    // Use promises for the initial status check
    const getPurchaseOrder = () => {
      return new Promise((resolve, reject) => {
        db.get(
          `SELECT order_status FROM purchase_orders WHERE id = ?`,
          [id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    };

    const row = await getPurchaseOrder();
    
    if (!row) {
      return res.status(404).send("Purchase order not found.");
    }

    const oldStatus = row.order_status;

    if (oldStatus === order_status) {
      return res.status(400).send("Status is already updated.");
    }

    // If status is being set to "received"
    if (order_status === "received") {
      // Wrap db.all in a promise
      const getOrderDetails = () => {
        return new Promise((resolve, reject) => {
          db.all(
            `SELECT product_id, quantity, unit_price FROM purchase_order_details WHERE purchase_order_id = ?`,
            [id],
            (err, items) => {
              if (err) reject(err);
              else resolve(items);
            }
          );
        });
      };

      const items = await getOrderDetails();

      if (items.length === 0) {
        return res.status(404).send("No items found for this purchase order.");
      }

      // Process items and calculate totals
      const inventoryUpdates = [];
      const movementInserts = [];
      let totalValue = 0;

      // Process purchase order items
      items.forEach(({ product_id, quantity, unit_price }) => {
        const lineValue = quantity * unit_price;
        totalValue += lineValue;

        inventoryUpdates.push(
          new Promise((resolve, reject) => {
            db.run(
              `UPDATE inventory SET quantity_in_stock = quantity_in_stock + ?, cost_per_unit = ?
               WHERE product_id = ?`,
              [quantity, unit_price, product_id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          })
        );

        movementInserts.push(
          new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO inventory_movements (product_id, movement_type, quantity, cost, reference_number)
               VALUES (?, 'purchase', ?, ?, ?)`,
              [product_id, quantity, unit_price, reference_number],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          })
        );
      });

      // Wait for all inventory updates and movements to complete
      await Promise.all([...inventoryUpdates, ...movementInserts]);

      // Create journal entry with proper error handling
      const createJournalEntry = () => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO journal_entries (reference_number, date, description, status)
             VALUES (?, date('now'), ?, 'posted')`,
            [reference_number, `Purchase order #${id} received`],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      };

      const journalEntryId = await createJournalEntry();

      // Prepare journal lines
      const journalLines = [
        // Inventory debit (Asset account: debit increases)
        {
          journal_entry_id: journalEntryId,
          account_id: 3,
          debit: totalValue,
          credit: 0,
          isLiability: false  // Asset account
        },
        // Accounts Payable credit (Liability account: credit increases)
        {
          journal_entry_id: journalEntryId,
          account_id: 5,
          debit: 0,
          credit: totalValue,
          isLiability: true  // Liability account
        }
      ];

      // Insert journal entry lines and update chart of accounts
      const processJournalLines = async () => {
        const linePromises = journalLines.map(line => {
          return new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
               VALUES (?, ?, ?, ?)`,
              [line.journal_entry_id, line.account_id, line.debit, line.credit],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });

        // Add ledger updates for chart of accounts with correct sign conventions
        const ledgerUpdates = journalLines.map(line => {
          // For liability accounts, credits increase the balance and debits decrease it
          // For asset accounts, debits increase the balance and credits decrease it
          const netAmount = line.isLiability
            ? (line.credit - line.debit)  // Liability accounts: credit increases, debit decreases
            : (line.debit - line.credit); // Asset accounts: debit increases, credit decreases

          return new Promise((resolve, reject) => {
            db.run(
              `UPDATE chart_of_accounts
               SET balance = balance + ?
               WHERE account_code = ?`,
              [netAmount, line.account_id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });

        // Execute all journal line inserts and ledger updates
        await Promise.all([...linePromises, ...ledgerUpdates]);
      };

      await processJournalLines();

      // Update purchase order status
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE purchase_orders SET order_status = ? WHERE id = ?`,
          [order_status, id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Log to audit trail
      const changes = JSON.stringify({
        old_status: oldStatus,
        new_status: order_status
      });

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO audit_trails (user_id, table_name, record_id, action, changes)
           VALUES (?, ?, ?, ?, ?)`,
          [user_id, "purchase_orders", id, "update", changes],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.send("Status updated and records updated successfully.");
    } else {
      // For non-received statuses, just update the status
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE purchase_orders SET order_status = ? WHERE id = ?`,
          [order_status, id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.send("Status updated successfully.");
    }
  } catch (error) {
    console.error("Error processing purchase order:", error);
    res.status(500).send("An error occurred while processing the purchase order.");
  }
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

// ===================== Accounts Endpoints =====================
// Get all accounts
app.get("/accounts", (req, res) => {
  db.all("SELECT * FROM chart_of_accounts", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post("/accounts", (req, res) => {
  const { account_name, account_type, balance } = req.body;

  if (!account_name || !account_type) {
    return res.status(400).json({ error: "Account name and type are required." });
  }

  // Get the next account code by finding the highest existing code and incrementing
  const query = `SELECT MAX(CAST(account_code AS INTEGER)) as max_code FROM chart_of_accounts WHERE account_type = ?`;

  db.get(query, [account_type], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to calculate account code." });
    }

    // Generate next account code
    const maxCode = row.max_code || 0;
    const nextCode = maxCode + 10; // Increment by 10 for organizational purposes

    // Insert the new account
    const insertQuery = `
      INSERT INTO chart_of_accounts (account_code, account_name, account_type, balance)
      VALUES (?, ?, ?, ?)
    `;
    db.run(
      insertQuery,
      [nextCode.toString(), account_name, account_type, balance || 0],
      function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Failed to add account." });
        }

        // Respond with the new account
        res.status(201).json({
          id: this.lastID,
          account_code: nextCode.toString(),
          account_name,
          account_type,
          balance: balance || 0,
        });
      }
    );
  });
});



// Delete an account
app.delete("/accounts/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM chart_of_accounts WHERE id = ?", id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(204).end();
    }
  });
});

// Update an account by ID
app.put("/accounts/:id", (req, res) => {
  const { id } = req.params;
  const { account_name, account_type, balance } = req.body;

  // Prepare the update fields dynamically
  const updates = [];
  const params = [];

  if (account_name !== undefined) {
    updates.push("account_name = ?");
    params.push(account_name);
  }

  if (account_type !== undefined) {
    updates.push("account_type = ?");
    params.push(account_type);
  }

  if (balance !== undefined) {
    updates.push("balance = ?");
    params.push(balance);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No fields provided to update." });
  }

  const updateQuery = `UPDATE chart_of_accounts SET ${updates.join(", ")} WHERE id = ?`;
  params.push(id);

  db.run(updateQuery, params, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to update account." });
    }

    res.json({ 
      id, 
      ...(account_name !== undefined && { account_name }), 
      ...(account_type !== undefined && { account_type }), 
      ...(balance !== undefined && { balance })
    });
  });
});

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

// ===================== Supplier Payments Endpoints =====================
app.post("/supplier_payments", (req, res) => {
  const {
    supplier_id,
    purchase_order_id,
    amount_paid,
    payment_method,
    payment_reference,
  } = req.body;

  if (!supplier_id || !amount_paid || !payment_method) {
    return res
      .status(400)
      .send("Supplier ID, amount paid, and payment method are required.");
  }

  // Step 1: Check the balance of the selected payment method's account
  const getAccountBalanceQuery = `
    SELECT c.id AS account_id, c.balance 
    FROM payment_methods p 
    JOIN chart_of_accounts c ON p.account_id = c.id 
    WHERE p.name = ? AND p.is_active = 1
  `;

  db.get(getAccountBalanceQuery, [payment_method], (err, account) => {
    if (err) {
      console.error("Error fetching account balance:", err.message);
      return res.status(500).send("Failed to fetch account balance.");
    }

    if (!account) {
      return res.status(400).send("Invalid or inactive payment method.");
    }

    if (account.balance < amount_paid) {
      return res
        .status(400)
        .send(
          `Insufficient balance in the selected payment method (${payment_method}). Available balance: ${account.balance}`
        );
    }

    // Step 2: Insert the supplier payment into the database
    const insertPaymentQuery = `
      INSERT INTO supplier_payments (supplier_id, purchase_order_id, amount_paid, payment_method, payment_reference)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      supplier_id,
      purchase_order_id || null,
      amount_paid,
      payment_method || null,
      payment_reference || null,
    ];

    db.run(insertPaymentQuery, params, function (err) {
      if (err) {
        console.error("Error adding supplier payment:", err.message);
        return res.status(500).send("Failed to add supplier payment.");
      }

      const paymentId = this.lastID;

      // Step 3: Deduct the amount from the account's balance
      const updateAccountBalanceQuery = `
        UPDATE chart_of_accounts
        SET balance = balance - ?
        WHERE id = ?
      `;
      db.run(updateAccountBalanceQuery, [amount_paid, account.account_id], (err) => {
        if (err) {
          console.error("Error updating account balance:", err.message);
        }
      });

      // Step 4: Update the purchase order's payment status if applicable
      if (purchase_order_id) {
        const updatePurchaseOrderQuery = `
          UPDATE purchase_orders
          SET payment_status = CASE 
            WHEN (SELECT SUM(amount_paid) FROM supplier_payments WHERE purchase_order_id = ?) >= total_amount 
            THEN 'paid' 
            ELSE 'partial' 
          END
          WHERE id = ?
        `;
        db.run(updatePurchaseOrderQuery, [purchase_order_id, purchase_order_id], (err) => {
          if (err) {
            console.error("Error updating purchase order:", err.message);
          }
        });
      }

      // Step 5: Send success response
      res.status(201).send({ id: paymentId });
    });
  });
});


// READ: Get all supplier payments
app.get("/supplier_payments", (req, res) => {
  const query = "SELECT * FROM supplier_payments";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error retrieving supplier payments:", err.message);
      return res.status(500).send("Failed to retrieve supplier payments.");
    }
    res.status(200).json(rows);
  });
});
// READ: Get a specific supplier payment by ID
app.get("/supplier_payments/:id", (req, res) => {
  const query = "SELECT * FROM supplier_payments WHERE id = ?";
  const params = [req.params.id];

  db.get(query, params, (err, row) => {
    if (err) {
      console.error("Error retrieving supplier payment:", err.message);
      return res.status(500).send("Failed to retrieve supplier payment.");
    }
    if (!row) {
      return res.status(404).send("Supplier payment not found.");
    }
    res.status(200).json(row);
  });
});
// UPDATE: Update a supplier payment
app.put("/supplier_payments/:id", (req, res) => {
  const {
    supplier_id,
    purchase_order_id,
    amount_paid,
    payment_method,
    payment_reference,
  } = req.body;

  const query = `
    UPDATE supplier_payments
    SET supplier_id = ?, purchase_order_id = ?, amount_paid = ?, payment_method = ?, payment_reference = ?
    WHERE id = ?
  `;
  const params = [
    supplier_id,
    purchase_order_id,
    amount_paid,
    payment_method,
    payment_reference,
    req.params.id,
  ];

  db.run(query, params, function (err) {
    if (err) {
      console.error("Error updating supplier payment:", err.message);
      return res.status(500).send("Failed to update supplier payment.");
    }
    if (this.changes === 0) {
      return res.status(404).send("Supplier payment not found.");
    }
    res.status(200).send("Supplier payment updated successfully.");
  });
});
// DELETE: Delete a supplier payment
app.delete("/supplier_payments/:id", (req, res) => {
  const query = "DELETE FROM supplier_payments WHERE id = ?";
  const params = [req.params.id];

  db.run(query, params, function (err) {
    if (err) {
      console.error("Error deleting supplier payment:", err.message);
      return res.status(500).send("Failed to delete supplier payment.");
    }
    if (this.changes === 0) {
      return res.status(404).send("Supplier payment not found.");
    }
    res.status(200).send("Supplier payment deleted successfully.");
  });
});

// ===================== Payments Methods Endpoints =====================
app.post("/payment-methods", (req, res) => {
  const { name, account_id, description } = req.body;

  if (!name || !account_id) {
    return res.status(400).send("Name and account_id are required.");
  }

  const query = `
    INSERT INTO payment_methods (name, account_id, description)
    VALUES (?, ?, ?)
  `;
  db.run(query, [name, account_id, description || null], function (err) {
    if (err) {
      console.error("Error adding payment method:", err.message);
      return res.status(500).send("Failed to add payment method.");
    }
    res.status(201).send({ id: this.lastID, message: "Payment method created." });
  });
});
app.get("/payment-methods", (req, res) => {
  const query = `
    SELECT 
      pm.id, 
      pm.name, 
      pm.description, 
      pm.is_active, 
      pm.created_at, 
      pm.updated_at, 
      ca.account_name AS linked_account 
    FROM payment_methods pm
    JOIN chart_of_accounts ca ON pm.account_id = ca.id
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error retrieving payment methods:", err.message);
      return res.status(500).send("Failed to retrieve payment methods.");
    }
    res.status(200).json(rows);
  });
});
app.get("/payment-methods/:id", (req, res) => {
  const query = `
    SELECT 
      pm.id, 
      pm.name, 
      pm.description, 
      pm.is_active, 
      pm.created_at, 
      pm.updated_at, 
      ca.account_name AS linked_account 
    FROM payment_methods pm
    JOIN chart_of_accounts ca ON pm.account_id = ca.id
    WHERE pm.id = ?
  `;
  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      console.error("Error retrieving payment method:", err.message);
      return res.status(500).send("Failed to retrieve payment method.");
    }
    if (!row) return res.status(404).send("Payment method not found.");
    res.status(200).json(row);
  });
});
app.put("/payment-methods/:id", (req, res) => {
  const { name, account_id, description, is_active } = req.body;

  if (!name && !account_id && !description && is_active == null) {
    return res.status(400).send("Nothing to update.");
  }

  const query = `
    UPDATE payment_methods
    SET 
      name = COALESCE(?, name),
      account_id = COALESCE(?, account_id),
      description = COALESCE(?, description),
      is_active = COALESCE(?, is_active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  db.run(query, [name, account_id, description, is_active, req.params.id], function (err) {
    if (err) {
      console.error("Error updating payment method:", err.message);
      return res.status(500).send("Failed to update payment method.");
    }
    if (this.changes === 0) return res.status(404).send("Payment method not found.");
    res.status(200).send("Payment method updated.");
  });
});
app.delete("/payment-methods/:id", (req, res) => {
  const query = "DELETE FROM payment_methods WHERE id = ?";
  db.run(query, [req.params.id], function (err) {
    if (err) {
      console.error("Error deleting payment method:", err.message);
      return res.status(500).send("Failed to delete payment method.");
    }
    if (this.changes === 0) return res.status(404).send("Payment method not found.");
    res.status(200).send("Payment method deleted.");
  });
});

// ===================== Payments Endpoints =====================
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

  // Insert the payment
  const paymentQuery = `
    INSERT INTO payments (reference_number, payment_date, amount_paid, payment_method, payment_reference)
    VALUES (?, ?, ?, ?, ?)
  `;
  const paymentParams = [
    reference_number,
    payment_date || new Date().toISOString(),
    amount_paid,
    payment_method || null,
    payment_reference || null,
  ];

  db.run(paymentQuery, paymentParams, function (err) {
    if (err) {
      console.error("Error adding payment:", err.message);
      return res.status(500).send("Failed to add payment.");
    }

    const paymentId = this.lastID;

    // Insert into journal_entries
    const journalEntryQuery = `
      INSERT INTO journal_entries (reference_number, date, description, status)
      VALUES (?, ?, ?, 'posted')
    `;
    const journalEntryParams = [
      reference_number,
      payment_date || new Date().toISOString(),
      `Payment received (${payment_method || "unknown"})`,
    ];

    db.run(journalEntryQuery, journalEntryParams, function (err) {
      if (err) {
        console.error("Error adding journal entry:", err.message);
        return res.status(500).send("Failed to add journal entry.");
      }

      const journalEntryId = this.lastID;

      // Insert into journal_entry_lines
      const journalEntryLinesQuery = `
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
        VALUES (?, ?, ?, ?), (?, ?, ?, ?)
      `;
      const cashOrBankAccountId =
        payment_method === "cash" ? 1 : payment_method === "credit" ? 2 : null;
      const journalEntryLinesParams = [
        journalEntryId,
        cashOrBankAccountId, // Cash or Bank Account
        parseFloat(amount_paid), // Debit
        0, // No credit

        journalEntryId,
        4, // Accounts Receivable
        0, // No debit
        parseFloat(amount_paid), // Credit
      ];

      db.run(journalEntryLinesQuery, journalEntryLinesParams, function (err) {
        if (err) {
          console.error("Error adding journal entry lines:", err.message);
          return res.status(500).send("Failed to add journal entry lines.");
        }

        // Insert into audit_trails
        const auditTrailQuery = `
          INSERT INTO audit_trails (user_id, table_name, record_id, action, changes)
          VALUES (?, ?, ?, ?, ?)
        `;
        const auditTrailParams = [
          1, // Assuming `req.user` contains the logged-in user's details
          "payments",
          paymentId,
          "insert",
          JSON.stringify({ reference_number, payment_date, amount_paid, payment_method, payment_reference }),
        ];

        db.run(auditTrailQuery, auditTrailParams, function (err) {
          if (err) {
            console.error("Error adding to audit trail:", err.message);
            return res.status(500).send("Failed to record audit trail.");
          }

          // Successfully processed payment
          res.status(201).send({ id: paymentId });
        });
      });
    });
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
          ({ product_id, quantity, selling_price, tax, discount_type, discount_amount, description }) => {
            return new Promise((resolveSale, rejectSale) => {
              db.get(
                "SELECT * FROM inventory WHERE product_id = ?",
                [product_id],
                (err, inventory) => {
                  if (err || !inventory) {
                    errorOccurred = true;
                    console.error(err ? err.message : "Inventory not found");
                    return rejectSale("Inventory not found");
                  }

                  if (inventory.quantity_in_stock < quantity) {
                    errorOccurred = true;
                    console.error("Insufficient stock for product ID:", product_id);
                    return rejectSale("Insufficient stock");
                  }

                  const total_price = selling_price * quantity - discount_amount; // Discount applied to the total price
                  totalCartPrice += total_price; // Sum total price for the cart

                  // Insert the sale record for each item
                  db.run(
                    "INSERT INTO sales (customer_id, product_id, payment_method, reference_number, quantity, total_price, date, selling_price, tax, discount_type, discount_amount, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                      customer_id,
                      product_id,
                      payment_method,
                      reference_number,
                      quantity,
                      total_price,
                      new Date().toISOString(),
                      selling_price,
                      tax,
                      discount_type,
                      discount_amount,
                      description,
                    ],
                    (err) => {
                      if (err) {
                        errorOccurred = true;
                        console.error("Error: ", err.message);
                        return rejectSale("Error inserting sale items");
                      }

                      // Update the inventory stock after sale
                      db.run(
                        "UPDATE inventory SET quantity_in_stock = quantity_in_stock - ? WHERE product_id = ?",
                        [quantity, product_id],
                        (err) => {
                          if (err) {
                            errorOccurred = true;
                            console.error("Error updating inventory: ", err.message);
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

              // Update the customer's total_sale_due for credit sales
              if (payment_method === "credit") {
                db.run(
                  "UPDATE customers SET total_sale_due = total_sale_due + ? WHERE id = ?",
                  [totalCartPrice, customer_id],
                  (err) => {
                    if (err) {
                      errorOccurred = true;
                      console.error("Error updating customer's total_sale_due: ", err.message);
                    }
                  }
                );
              }
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
// CREATE - Add a new tax
app.post('/taxes', async (req, res) => {
  const { tax_name, tax_rate, tax_type, account_code } = req.body;

  // Validate required fields
  if (!tax_name || tax_rate === undefined || !tax_type || !account_code) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate tax_type
  if (!['inclusive', 'exclusive'].includes(tax_type)) {
    return res.status(400).json({ error: "Invalid tax type. Must be 'inclusive' or 'exclusive'" });
  }

  // Validate tax_rate is non-negative
  if (tax_rate < 0) {
    return res.status(400).json({ error: "Tax rate cannot be negative" });
  }

  try {
    // First check if the account exists
    const accountExists = await new Promise((resolve, reject) => {
      db.get(
        'SELECT account_code FROM chart_of_accounts WHERE account_code = ?',
        [account_code],
        (err, row) => {
          if (err) reject(err);
          resolve(row !== undefined);
        }
      );
    });

    if (!accountExists) {
      return res.status(400).json({ error: "Invalid account_code" });
    }

    // Insert the new tax record
    db.run(
      `INSERT INTO taxes (tax_name, tax_rate, tax_type, account_id)
       SELECT ?, ?, ?, id
       FROM chart_of_accounts
       WHERE account_code = ?`,
      [tax_name, tax_rate, tax_type, account_code],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: "Tax name already exists" });
          }
          console.error(err);
          return res.status(500).json({ error: "Failed to create tax" });
        }
        
        res.status(201).json({
          id: this.lastID,
          tax_name,
          tax_rate,
          tax_type,
          account_code
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// READ - Get all taxes
app.get('/taxes', (req, res) => {
  db.all(
    `SELECT t.id, t.tax_name, t.tax_rate, t.tax_type, coa.account_code, coa.account_name, coa.account_type
     FROM taxes t
     JOIN chart_of_accounts coa ON t.account_id = coa.id
     ORDER BY t.tax_name`,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch taxes" });
      }
      res.json(rows);
    }
  );
});

// READ - Get a single tax by ID
app.get('/taxes/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(
    `SELECT t.id, t.tax_name, t.tax_rate, t.tax_type, coa.account_code, coa.account_name, coa.account_type
     FROM taxes t
     JOIN chart_of_accounts coa ON t.account_id = coa.id
     WHERE t.id = ?`,
    [id],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch tax" });
      }
      if (!row) {
        return res.status(404).json({ error: "Tax not found" });
      }
      res.json(row);
    }
  );
});

// UPDATE - Update a tax
app.put('/taxes/:id', async (req, res) => {
  const { id } = req.params;
  const { tax_name, tax_rate, tax_type, account_code } = req.body;

  // Validate required fields
  if (!tax_name || tax_rate === undefined || !tax_type || !account_code) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate tax_type
  if (!['inclusive', 'exclusive'].includes(tax_type)) {
    return res.status(400).json({ error: "Invalid tax type. Must be 'inclusive' or 'exclusive'" });
  }

  // Validate tax_rate is non-negative
  if (tax_rate < 0) {
    return res.status(400).json({ error: "Tax rate cannot be negative" });
  }

  try {
    // Check if the account exists
    const accountExists = await new Promise((resolve, reject) => {
      db.get(
        'SELECT account_code FROM chart_of_accounts WHERE account_code = ?',
        [account_code],
        (err, row) => {
          if (err) reject(err);
          resolve(row !== undefined);
        }
      );
    });

    if (!accountExists) {
      return res.status(400).json({ error: "Invalid account_code" });
    }

    // Update the tax record
    db.run(
      `UPDATE taxes
       SET tax_name = ?,
           tax_rate = ?,
           tax_type = ?,
           account_id = (SELECT id FROM chart_of_accounts WHERE account_code = ?)
       WHERE id = ?`,
      [tax_name, tax_rate, tax_type, account_code, id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: "Tax name already exists" });
          }
          console.error(err);
          return res.status(500).json({ error: "Failed to update tax" });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: "Tax not found" });
        }
        
        res.json({
          id: parseInt(id),
          tax_name,
          tax_rate,
          tax_type,
          account_code
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE - Delete a tax
app.delete('/taxes/:id', (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM taxes WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to delete tax" });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: "Tax not found" });
      }
      
      res.json({ message: "Tax deleted successfully" });
    }
  );
});


// ===================== income statement =====================
app.get("/reports/income-statement", (req, res) => {
  try {
    // Query for revenue accounts
    const revenueQuery = `
      SELECT coa.account_name, SUM(jel.credit - jel.debit) AS amount
      FROM journal_entry_lines jel
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_type = 'revenue'
      GROUP BY coa.account_name
    `;

    // Query for expense accounts
    const expenseQuery = `
      SELECT coa.account_name, SUM(jel.debit - jel.credit) AS amount
      FROM journal_entry_lines jel
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_type = 'expense'
      GROUP BY coa.account_name
    `;

    // Run both queries
    db.all(revenueQuery, [], (err, revenue) => {
      if (err) throw err;

      db.all(expenseQuery, [], (err, expenses) => {
        if (err) throw err;

        // Calculate totals
        const totalRevenue = revenue.reduce((sum, item) => sum + item.amount, 0);
        const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
        const netIncome = totalRevenue - totalExpenses;

        // Respond with the income statement data
        res.json({
          revenue,
          expenses,
          totalRevenue,
          totalExpenses,
          netIncome,
        });
      });
    });
  } catch (error) {
    console.error("Error generating income statement:", error.message);
    res.status(500).send("Failed to generate income statement.");
  }
});
app.get("/reports/balance-sheet", async (req, res) => {
  try {
    // Define queries
    const queries = {
      currentAssetsQuery: `
        SELECT coa.account_name, SUM(jel.debit - jel.credit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE coa.account_type = 'asset'
        GROUP BY coa.account_name
      `,
      nonCurrentAssetsQuery: `
        SELECT coa.account_name, SUM(jel.debit - jel.credit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE coa.account_type = 'asset'
        GROUP BY coa.account_name
      `,
      currentLiabilitiesQuery: `
        SELECT coa.account_name, SUM(jel.credit - jel.debit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE coa.account_type = 'liability'
        GROUP BY coa.account_name
      `,
      nonCurrentLiabilitiesQuery: `
        SELECT coa.account_name, SUM(jel.credit - jel.debit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE coa.account_type = 'liability'
        GROUP BY coa.account_name
      `,
      equityQuery: `
        SELECT coa.account_name, SUM(jel.credit - jel.debit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE coa.account_type = 'equity'
        GROUP BY coa.account_name
      `,
    };

    // Prepare statements for each query
    const currentAssetsStmt = db.prepare(queries.currentAssetsQuery);
    const nonCurrentAssetsStmt = db.prepare(queries.nonCurrentAssetsQuery);
    const currentLiabilitiesStmt = db.prepare(queries.currentLiabilitiesQuery);
    const nonCurrentLiabilitiesStmt = db.prepare(queries.nonCurrentLiabilitiesQuery);
    const equityStmt = db.prepare(queries.equityQuery);

    // Run queries in parallel using stmt.all()
    const [currentAssets, nonCurrentAssets, currentLiabilities, nonCurrentLiabilities, equity] = await Promise.all([
      new Promise((resolve, reject) => {
        currentAssetsStmt.all([], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        nonCurrentAssetsStmt.all([], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        currentLiabilitiesStmt.all([], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        nonCurrentLiabilitiesStmt.all([], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        equityStmt.all([], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }),
    ]);

    // Structure the response
    res.json({
      currentAssets,
      nonCurrentAssets,
      currentLiabilities,
      nonCurrentLiabilities,
      equity,
    });
  } catch (error) {
    console.error("Error generating balance sheet:", error.message);
    res.status(500).send("Failed to generate balance sheet.");
  }
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
