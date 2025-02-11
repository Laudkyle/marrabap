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

      stmt.run(
        product.name,
        product.cp,
        product.sp,
        suppliers_id,
        function (err) {
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
                      console.error(
                        "Error inserting into inventory:",
                        err.message
                      );
                      return reject(err);
                    }
                    resolve();
                  }
                );
              })
            );
          }
        }
      );

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
        res
          .status(201)
          .send("Products and inventory entries added successfully.");
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
app.post("/inventory", (req, res) => {
  const { product_id, quantity_in_stock, cost_per_unit } = req.body;

  if (!product_id || !quantity_in_stock || !cost_per_unit) {
    return res.status(400).send("Missing required fields.");
  }

  const stmt = db.prepare(
    `INSERT INTO inventory (product_id, quantity_in_stock, cost_per_unit) 
     VALUES (?, ?, ?)`
  );

  stmt.run(product_id, quantity_in_stock, cost_per_unit, function (err) {
    if (err) {
      return res.status(500).send("Failed to add inventory.");
    }
    res
      .status(201)
      .json({ id: this.lastID, product_id, quantity_in_stock, cost_per_unit });
  });
});

// Read All Inventory Items
app.get("/inventory", (req, res) => {
  db.all("SELECT * FROM inventory", [], (err, rows) => {
    if (err) {
      return res.status(500).send("Failed to retrieve inventory.");
    }
    res.status(200).json(rows);
  });
});

// Read Single Inventory Item by ID
app.get("/inventory/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM inventory WHERE id = ?", [id], (err, row) => {
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
app.put("/inventory/:id", (req, res) => {
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

  stmt.run(product_id, quantity_in_stock, cost_per_unit, id, function (err) {
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
app.delete("/inventory/:id", (req, res) => {
  const { id } = req.params;

  const stmt = db.prepare("DELETE FROM inventory WHERE id = ?");

  stmt.run(id, function (err) {
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
  db.all("SELECT * FROM purchase_orders ORDER BY id DESC", (err, rows) => {
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
            function (err) {
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
          isLiability: false, // Asset account
        },
        // Accounts Payable credit (Liability account: credit increases)
        {
          journal_entry_id: journalEntryId,
          account_id: 5,
          debit: 0,
          credit: totalValue,
          isLiability: true, // Liability account
        },
      ];

      // Insert journal entry lines and update chart of accounts
      const processJournalLines = async () => {
        const linePromises = journalLines.map((line) => {
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
        const ledgerUpdates = journalLines.map((line) => {
          // For liability accounts, credits increase the balance and debits decrease it
          // For asset accounts, debits increase the balance and credits decrease it
          const netAmount = line.isLiability
            ? line.credit - line.debit // Liability accounts: credit increases, debit decreases
            : line.debit - line.credit; // Asset accounts: debit increases, credit decreases

          return new Promise((resolve, reject) => {
            db.run(
              `UPDATE chart_of_accounts
               SET balance = balance + ?
               WHERE id = ?`,
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
        new_status: order_status,
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
    res
      .status(500)
      .send("An error occurred while processing the purchase order.");
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
              console.error(
                "Error updating supplier's total_purchase_due:",
                err
              );
              return res
                .status(500)
                .send("Error updating supplier's total_purchase_due.");
            }

            res.send(
              "Purchase order deleted and supplier's total_purchase_due updated."
            );
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
  const { account_name, account_type, balance, parent_account_id } = req.body;

  if (!account_name || !account_type) {
    return res
      .status(400)
      .json({ error: "Account name and type are required." });
  }

  const query = `SELECT MAX(CAST(account_code AS INTEGER)) as max_code FROM chart_of_accounts WHERE account_type = ?`;

  db.get(query, [account_type], (err, row) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Failed to calculate account code." });
    }

    const maxCode = row?.max_code || 0;
    const nextCode = maxCode + 1;

    const insertQuery = `
      INSERT INTO chart_of_accounts (account_code, account_name, account_type, balance, parent_account_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [
        nextCode.toString(),
        account_name,
        account_type,
        balance || 0,
        parent_account_id || null,
      ],
      function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Failed to add account." });
        }

        const newAccountId = this.lastID;

        if (balance !== 0) {
          const referenceNumber = `OB-${Date.now()}`;
          const date = new Date().toISOString().split("T")[0];
          const description = `Opening balance for ${account_name}`;

          const journalEntryQuery = `
            INSERT INTO journal_entries (reference_number, date, description, status)
            VALUES (?, ?, ?, 'posted')
          `;

          db.run(
            journalEntryQuery,
            [referenceNumber, date, description],
            function (err) {
              if (err) {
                console.error(err);
                return res
                  .status(500)
                  .json({ error: "Failed to log journal entry." });
              }

              const journalEntryId = this.lastID;
              const journalLineQuery = `
              INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
              VALUES (?, ?, ?, ?)
            `;

              const isDebit = ["asset", "expense"].includes(
                account_type.toLowerCase()
              );

              let debit = isDebit ? Math.abs(balance) : 0;
              let credit = isDebit ? 0 : Math.abs(balance);

              // If balance is negative, swap debit and credit
              if (balance < 0) {
                [debit, credit] = [credit, debit];
              }

              db.run(
                journalLineQuery,
                [journalEntryId, newAccountId, debit, credit],
                (err) => {
                  if (err) {
                    console.error(err);
                    return res
                      .status(500)
                      .json({ error: "Failed to log journal entry line." });
                  }

                  // Update the chart_of_accounts table with the opening balance journal entry ID
                  const updateAccountQuery = `
                UPDATE chart_of_accounts SET opening_balance_journal_entry_id = ? WHERE id = ?
              `;
                  db.run(
                    updateAccountQuery,
                    [journalEntryId, newAccountId],
                    (err) => {
                      if (err) {
                        console.error(err);
                        return res.status(500).json({
                          error:
                            "Failed to update account with journal entry ID.",
                        });
                      }

                      res.status(201).json({
                        id: newAccountId,
                        account_code: nextCode.toString(),
                        account_name,
                        account_type,
                        balance: balance || 0,
                        parent_account_id: parent_account_id || null,
                        opening_balance_journal_entry_id: journalEntryId,
                      });
                    }
                  );
                }
              );
            }
          );
        } else {
          res.status(201).json({
            id: newAccountId,
            account_code: nextCode.toString(),
            account_name,
            account_type,
            balance: balance || 0,
            parent_account_id: parent_account_id || null,
          });
        }
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
app.put("/accounts/:id", (req, res) => {
  const { id } = req.params;
  const { account_name, account_type, balance, parent_account_id } = req.body;

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

  if (parent_account_id !== undefined) {
    updates.push("parent_account_id = ?");
    params.push(parent_account_id);
  }

  if (balance !== undefined) {
    updates.push("balance = ?");
    params.push(balance);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No fields provided to update." });
  }

  const updateQuery = `UPDATE chart_of_accounts SET ${updates.join(
    ", "
  )} WHERE id = ?`;
  params.push(id);

  // Fetch the original account data before the update
  db.get(
    "SELECT * FROM chart_of_accounts WHERE id = ?",
    [id],
    (err, account) => {
      if (err || !account) {
        console.error(err);
        return res.status(500).json({
          error: "Account not found or failed to fetch account details.",
        });
      }

      const originalBalance = account.balance;

      // Perform the update
      db.run(updateQuery, params, function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Failed to update account." });
        }

        // If balance is updated, create or update a journal entry
        if (balance !== undefined && balance !== originalBalance) {
          const journalEntry = {
            reference_number: `OPENBAL-${id}-${Date.now()}`,
            date: new Date().toISOString(),
            description: `Opening balance for account ID ${id}`,
            status: "posted",
          };

          let isDebit = ["asset", "expense"].includes(account.account_type);
          let debit = isDebit ? Math.abs(balance) : 0;
          let credit = isDebit ? 0 : Math.abs(balance);

          // Swap debit and credit if balance is negative
          if (balance < 0) {
            [debit, credit] = [credit, debit];
          }

          // Check if there's an existing journal entry for the opening balance
          db.get(
            "SELECT opening_balance_journal_entry_id FROM chart_of_accounts WHERE id = ?",
            [id],
            (err, result) => {
              if (err) {
                console.error("Failed to fetch existing journal entry:", err);
                return res
                  .status(500)
                  .json({ error: "Failed to fetch existing journal entry." });
              }

              const existingJournalEntryId =
                result?.opening_balance_journal_entry_id;

              if (existingJournalEntryId) {
                // Update the existing journal entry lines
                db.run(
                  `UPDATE journal_entry_lines SET debit = ?, credit = ? WHERE journal_entry_id = ? AND account_id = ?`,
                  [debit, credit, existingJournalEntryId, id],
                  (err) => {
                    if (err) {
                      console.error(
                        "Failed to update journal entry line:",
                        err
                      );
                      return res.status(500).json({
                        error: "Failed to update journal entry line.",
                      });
                    }

                    updateParentBalance(account.parent_account_id, (err) => {
                      if (err) {
                        console.error(
                          "Failed to update parent account balance:",
                          err
                        );
                        return res.status(500).json({
                          error: "Failed to update parent account balance.",
                        });
                      }

                      res.json({
                        id,
                        ...(account_name !== undefined && { account_name }),
                        ...(account_type !== undefined && { account_type }),
                        ...(balance !== undefined && { balance }),
                      });
                    });
                  }
                );
              } else {
                // Create a new journal entry and journal entry lines
                db.run(
                  `INSERT INTO journal_entries (reference_number, date, description, status) VALUES (?, ?, ?, ?)`,
                  [
                    journalEntry.reference_number,
                    journalEntry.date,
                    journalEntry.description,
                    journalEntry.status,
                  ],
                  function (err) {
                    if (err) {
                      console.error("Failed to create journal entry:", err);
                      return res
                        .status(500)
                        .json({ error: "Failed to create journal entry." });
                    }

                    const journalEntryId = this.lastID;

                    // Insert the journal entry line
                    db.run(
                      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)`,
                      [journalEntryId, id, debit, credit],
                      (err) => {
                        if (err) {
                          console.error(
                            "Failed to create journal entry line:",
                            err
                          );
                          return res.status(500).json({
                            error: "Failed to create journal entry line.",
                          });
                        }

                        // Save the journal entry ID in the account record
                        db.run(
                          `UPDATE chart_of_accounts SET opening_balance_journal_entry_id = ? WHERE id = ?`,
                          [journalEntryId, id],
                          (err) => {
                            if (err) {
                              console.error(
                                "Failed to update account with journal entry ID:",
                                err
                              );
                              return res.status(500).json({
                                error:
                                  "Failed to link journal entry to account.",
                              });
                            }

                            // Update parent balances
                            updateParentBalance(
                              account.parent_account_id,
                              (err) => {
                                if (err) {
                                  console.error(
                                    "Failed to update parent account balance:",
                                    err
                                  );
                                  return res.status(500).json({
                                    error:
                                      "Failed to update parent account balance.",
                                  });
                                }

                                res.json({
                                  id,
                                  ...(account_name !== undefined && {
                                    account_name,
                                  }),
                                  ...(account_type !== undefined && {
                                    account_type,
                                  }),
                                  ...(balance !== undefined && { balance }),
                                  journal_entry: journalEntry,
                                });
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            }
          );
        } else {
          // If no balance update, handle parent updates directly
          if (parent_account_id !== undefined) {
            updateParentBalance(parent_account_id, (err) => {
              if (err) {
                console.error("Failed to update parent account balance:", err);
                return res
                  .status(500)
                  .json({ error: "Failed to update parent account balance." });
              }
              res.json({
                id,
                ...(account_name !== undefined && { account_name }),
                ...(account_type !== undefined && { account_type }),
                ...(balance !== undefined && { balance }),
              });
            });
          } else {
            res.json({
              id,
              ...(account_name !== undefined && { account_name }),
              ...(account_type !== undefined && { account_type }),
              ...(balance !== undefined && { balance }),
            });
          }
        }
      });
    }
  );
});

// Recursive function to update parent account balances
const updateParentBalance = (parentId, callback) => {
  if (!parentId) return callback(null); // If no parent, stop here

  db.all(
    "SELECT SUM(balance) AS total_balance FROM chart_of_accounts WHERE parent_account_id = ?",
    [parentId],
    (err, result) => {
      if (err) return callback(err);

      const totalBalance = result[0]?.total_balance || 0;

      db.run(
        "UPDATE chart_of_accounts SET balance = ? WHERE id = ?",
        [totalBalance, parentId],
        (err) => {
          if (err) return callback(err);

          // Check if the parent itself has a parent and recursively update
          db.get(
            "SELECT parent_account_id FROM chart_of_accounts WHERE id = ?",
            [parentId],
            (err, parent) => {
              if (err) return callback(err);

              if (parent?.parent_account_id) {
                updateParentBalance(parent.parent_account_id, callback);
              } else {
                callback(null); // No more parents to update
              }
            }
          );
        }
      );
    }
  );
};

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
        db.run(
          updatePurchaseOrderQuery,
          [purchase_order_id, purchase_order_id],
          (err) => {
            if (err) {
              console.error("Error updating purchase order:", err.message);
            }
          }
        );
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
    res
      .status(201)
      .send({ id: this.lastID, message: "Payment method created." });
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
  db.run(
    query,
    [name, account_id, description, is_active, req.params.id],
    function (err) {
      if (err) {
        console.error("Error updating payment method:", err.message);
        return res.status(500).send("Failed to update payment method.");
      }
      if (this.changes === 0)
        return res.status(404).send("Payment method not found.");
      res.status(200).send("Payment method updated.");
    }
  );
});
app.delete("/payment-methods/:id", (req, res) => {
  const query = "DELETE FROM payment_methods WHERE id = ?";
  db.run(query, [req.params.id], function (err) {
    if (err) {
      console.error("Error deleting payment method:", err.message);
      return res.status(500).send("Failed to delete payment method.");
    }
    if (this.changes === 0)
      return res.status(404).send("Payment method not found.");
    res.status(200).send("Payment method deleted.");
  });
});

// ===================== Payments Endpoints =====================
app.post("/payments", (req, res) => {
  const {
    customerId,
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
    INSERT INTO payments (customer_id,reference_number, payment_date, amount_paid, payment_method, payment_reference)
    VALUES (?,?, ?, ?, ?, ?)
  `;
  const paymentParams = [
    customerId,
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
          JSON.stringify({
            customerId,
            reference_number,
            payment_date,
            amount_paid,
            payment_method,
            payment_reference,
          }),
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
        const reference_number = salesData[0].reference_number;
        const customer_id = salesData[0].customer_id;
        const payment_method = salesData[0].payment_method;

        const processSalePromises = salesData.map(
          ({
            product_id,
            quantity,
            selling_price,
            taxes, // Now an array of tax IDs
            discount_type,
            discount_amount,
            description,
          }) => {
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
                    console.error(
                      "Insufficient stock for product ID:",
                      product_id
                    );
                    return rejectSale("Insufficient stock");
                  }

                  const itemSubtotal = selling_price * quantity;
                  const discount =
                    discount_type === "percentage"
                      ? (itemSubtotal * discount_amount) / 100
                      : discount_amount;

                  const totalAfterDiscount = itemSubtotal - discount;
                  let totalTaxAmount = 0;

                  // Calculate total tax amount
                  const taxPromises = taxes.map((tax_id) => {
                    return new Promise((resolveTax, rejectTax) => {
                      db.get(
                        "SELECT * FROM taxes WHERE id = ?",
                        [tax_id],
                        (err, taxData) => {
                          if (err || !taxData) {
                            console.error(err ? err.message : "Tax not found");
                            return rejectTax("Tax not found");
                          }

                          let taxAmount = 0;

                          if (taxData.tax_type === "exclusive") {
                            taxAmount = (totalAfterDiscount * taxData.tax_rate) / 100;
                          } else if (taxData.tax_type === "inclusive") {
                            taxAmount = totalAfterDiscount - totalAfterDiscount / (1 + taxData.tax_rate / 100);
                          }

                          totalTaxAmount += taxAmount;
                          resolveTax({ tax_id, taxAmount });
                        }
                      );
                    });
                  });

                  Promise.all(taxPromises)
                    .then((calculatedTaxes) => {
                      const total_price = totalAfterDiscount + totalTaxAmount;
                      totalCartPrice += total_price;

                      db.run(
                        `INSERT INTO sales (customer_id, product_id, payment_method, reference_number, quantity, total_price, date, selling_price, discount_type, discount_amount, description) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                          customer_id,
                          product_id,
                          payment_method,
                          reference_number,
                          quantity,
                          total_price,
                          new Date().toISOString(),
                          selling_price,
                          discount_type,
                          discount_amount,
                          description,
                        ],
                        function (err) {
                          if (err) {
                            errorOccurred = true;
                            console.error("Error: ", err.message);
                            return rejectSale("Error inserting sale items");
                          }

                          const sale_id = this.lastID;

                          // Insert tax details into sales_taxes and sale_tax_amounts
                          const taxInsertPromises = calculatedTaxes.map(({ tax_id, taxAmount }) => {
                            return new Promise((resolveInsert, rejectInsert) => {
                              db.run(
                                "INSERT INTO sales_taxes (sale_id, tax_id) VALUES (?, ?)",
                                [sale_id, tax_id],
                                function (err) {
                                  if (err) {
                                    errorOccurred = true;
                                    console.error("Error inserting tax: ", err.message);
                                    return rejectInsert("Error inserting sales_taxes");
                                  }

                                  const sale_tax_id = this.lastID;
                                  db.run(
                                    "INSERT INTO sale_tax_amounts (sale_tax_id, tax_amount) VALUES (?, ?)",
                                    [sale_tax_id, taxAmount],
                                    (err) => {
                                      if (err) {
                                        errorOccurred = true;
                                        console.error("Error inserting tax amount: ", err.message);
                                        return rejectInsert("Error inserting sale_tax_amounts");
                                      }
                                      resolveInsert();
                                    }
                                  );
                                }
                              );
                            });
                          });

                          Promise.all(taxInsertPromises)
                            .then(() => {
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
                            })
                            .catch(rejectSale);
                        }
                      );
                    })
                    .catch(rejectSale);
                }
              );
            });
          }
        );

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

            if (!errorOccurred) {
              db.run(
                "INSERT INTO invoices (reference_number, customer_id, total_amount, amount_paid, status) VALUES (?, ?, ?, ?, ?)",
                [
                  reference_number,
                  customer_id,
                  totalCartPrice,
                  payment_method == "credit" ? 0 : totalCartPrice,
                  payment_method == "credit" ? "unpaid" : "paid",
                ],
                (err) => {
                  if (err) {
                    errorOccurred = true;
                    console.error("Invoice error: ", err.message);
                  }
                }
              );

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
                resolve(saleResponses);
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
    res.status(201).json({ message: "Sales processed successfully", sales: result });
  } catch (error) {
    console.error(error.message);
    res.status(400).json({ message: "Error processing sales", error: error.message });
  }
});

app.get("/sales", (req, res) => {
  db.all(
    `SELECT 
        sales.id, 
        sales.reference_number, 
        sales.customer_id, 
        sales.selling_price, 
        sales.discount_type, 
        sales.discount_amount, 
        sales.payment_method, 
        products.name AS product_name, 
        products.id AS product_id, 
        sales.quantity, 
        sales.total_price, 
        sales.return_status, 
        sales.date,
        COALESCE(
          GROUP_CONCAT(
            taxes.tax_name || ' (' || COALESCE(taxes.tax_rate, 0) || '%): ' || COALESCE(sale_tax_amounts.tax_amount, 0), ' | '
          ), ''
        ) AS applied_taxes
      FROM sales
      JOIN products ON sales.product_id = products.id
      LEFT JOIN sales_taxes ON sales.id = sales_taxes.sale_id
      LEFT JOIN taxes ON sales_taxes.tax_id = taxes.id
      LEFT JOIN sale_tax_amounts ON sales_taxes.id = sale_tax_amounts.sale_tax_id
      GROUP BY 
        sales.id, 
        sales.reference_number, 
        sales.customer_id, 
        sales.selling_price, 
        sales.discount_type, 
        sales.discount_amount, 
        sales.payment_method, 
        products.name, 
        sales.quantity, 
        sales.total_price, 
        sales.return_status, 
        sales.date
      ORDER BY sales.date DESC`,
    (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching sales", error: err.message });
      } else {
        res.json(rows);
      }
    }
  );
});

app.post("/sales-return", async (req, res) => {
  const returnData = req.body;

  // Ensure returnData is an array
  const returnsArray = Array.isArray(returnData) ? returnData : [returnData];

  if (!returnsArray.length) {
    return res.status(400).json({ message: "Invalid return data format." });
  }

  try {
    db.run("BEGIN TRANSACTION");

    const promises = returnsArray.map(async (item) => {
      const {
        sale_id,
        product_id,
        customer_id,
        reference_number,
        return_quantity,
        action, // "restock" or "dispose"
        payment_method,
        selling_price,
        discount_type,
        discount_amount,
        return_type, // "full" or "partial"
        status, // "pending" by default
        reason, // Optional reason for return
      } = item;

      if (!sale_id || !product_id || !customer_id || !reference_number || return_quantity <= 0) {
        throw new Error("Invalid return data");
      }

      // Fetch total quantity sold for this sale
      const totalQuantitySold = await new Promise((resolve, reject) => {
        db.get("SELECT quantity FROM sales WHERE id = ?", [sale_id], (err, row) => {
          if (err) return reject(err);
          if (!row) return reject(new Error("Sale not found"));
          resolve(row.quantity);
        });
      });

      // Fetch total tax amount for this sale
      const totalTax = await new Promise((resolve, reject) => {
        db.all(
          `SELECT sta.tax_amount
           FROM sales_taxes st
           JOIN sale_tax_amounts sta ON st.id = sta.sale_tax_id
           WHERE st.sale_id = ?`,
          [sale_id],
          (err, rows) => {
            if (err) return reject(err);
            const totalTaxAmount = rows.reduce((acc, row) => acc + row.tax_amount, 0);
            resolve(totalTaxAmount);
          }
        );
      });

      // Calculate tax applicable to the returned items
      const returnTax = (return_quantity / totalQuantitySold) * totalTax;

      // Calculate total refund
      const total_refund = (return_quantity * selling_price) + returnTax;

      // Insert return record
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO returns (
            sale_id, product_id, customer_id, reference_number, return_quantity, 
            action, return_date, selling_price, tax, discount_amount, discount_type, 
            payment_method, total_refund, return_type, status, reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sale_id,
            product_id,
            customer_id,
            reference_number,
            return_quantity,
            action,
            new Date().toISOString(),
            selling_price,
            returnTax,
            discount_amount,
            discount_type,
            payment_method,
            total_refund,
            return_type,
            status || "pending",
            reason || "No reason provided",
          ],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      // Update inventory if action is "restock"
      if (action === "restock") {
        await new Promise((resolve, reject) => {
          db.run(
            "UPDATE inventory SET quantity_in_stock = quantity_in_stock + ? WHERE product_id = ?",
            [return_quantity, product_id],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      }

      // Update sales quantity
      await new Promise((resolve, reject) => {
        db.get("SELECT quantity FROM sales WHERE id = ?", [sale_id], (err, row) => {
          if (err) return reject(err);
          if (!row) return reject(new Error("Sale not found"));

          const newQuantity = row.quantity - return_quantity;
          db.run("UPDATE sales SET quantity = ? WHERE id = ?", [newQuantity, sale_id], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      });

      return { product_id, return_quantity, total_refund };
    });

    const results = await Promise.all(promises);
    db.run("COMMIT");

    res.status(201).json({
      message: "Sales returns processed successfully",
      results,
    });
  } catch (error) {
    db.run("ROLLBACK");
    console.error("Error processing sales returns:", error);
    res.status(500).json({ message: "Error processing sales returns", error });
  }
});


// Get All Sales Returns
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

  db.run(
    `INSERT INTO suppliers 
      (type, contact_id, business_name, name, email, tax_number, pay_term, opening_balance, advance_balance, added_on, address, mobile, total_purchase_due, total_purchase_return_due) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
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
    ],
    function (err) {
      if (err) {
        console.error("Error adding supplier:", err.message);
        return res.status(500).send("Error adding supplier");
      }

      const supplierId = this.lastID;
      let entriesLogged = 0;
      const totalEntries =
        (opening_balance > 0 ? 1 : 0) + (advance_balance > 0 ? 1 : 0);

      const logJournalEntry = (balance, balanceType, accountId) => {
        const referenceNumber = `SUP-${balanceType}-${supplierId}-${Date.now()}`;
        const date = new Date().toISOString().split("T")[0];
        const description = `${
          balanceType === "OB" ? "Opening" : "Advance"
        } balance for supplier ${business_name || name}`;

        db.get(
          `SELECT account_type FROM chart_of_accounts WHERE id = ?`,
          [accountId],
          (err, row) => {
            if (err || !row) {
              console.error(
                `Error fetching account type for ${balanceType}:`,
                err || "Account not found"
              );
              return;
            }

            const accountType = row.account_type.toLowerCase();
            let debit = 0,
              credit = 0;
            if (accountType === "asset") {
              debit = balance; // Assets increase with debits
            } else if (accountType === "liability") {
              credit = balance; // Liabilities increase with credits
            }

            db.run(
              `INSERT INTO journal_entries (reference_number, date, description, status) VALUES (?, ?, ?, 'posted')`,
              [referenceNumber, date, description],
              function (err) {
                if (err) {
                  console.error(
                    `Failed to create journal entry for ${balanceType}:`,
                    err
                  );
                  return;
                }

                const journalEntryId = this.lastID;
                db.run(
                  `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)`,
                  [journalEntryId, accountId, debit, credit],
                  (err) => {
                    if (err) {
                      console.error(
                        `Failed to create journal entry line for ${balanceType}:`,
                        err
                      );
                    }

                    db.run(
                      `UPDATE chart_of_accounts SET opening_balance_journal_entry_id = ? WHERE id = ?`,
                      [journalEntryId, accountId],
                      (err) => {
                        if (err)
                          console.error(
                            `Failed to update chart_of_accounts for ${balanceType}:`,
                            err
                          );
                        entriesLogged++;
                        if (entriesLogged === totalEntries)
                          res.status(201).json({ id: supplierId, ...req.body });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      };

      if (opening_balance > 0) logJournalEntry(opening_balance, "OB", 5); // Accounts Payable
      if (advance_balance > 0) logJournalEntry(advance_balance, "ADV", 11); // Advance Payments

      if (totalEntries === 0)
        res.status(201).json({ id: supplierId, ...req.body });
    }
  );
});
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

  db.get(
    "SELECT opening_balance, advance_balance FROM suppliers WHERE id = ?",
    [id],
    (err, row) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send("Error retrieving supplier data.");
      }
      if (!row) return res.status(404).send("Supplier not found.");

      const fields = [];
      const values = [];

      if (type) fields.push("type = ?"), values.push(type);
      if (contact_id) fields.push("contact_id = ?"), values.push(contact_id);
      if (business_name)
        fields.push("business_name = ?"), values.push(business_name);
      if (name) fields.push("name = ?"), values.push(name);
      if (email) fields.push("email = ?"), values.push(email);
      if (tax_number) fields.push("tax_number = ?"), values.push(tax_number);
      if (pay_term) fields.push("pay_term = ?"), values.push(pay_term);
      if (opening_balance !== undefined)
        fields.push("opening_balance = ?"), values.push(opening_balance);
      if (advance_balance !== undefined)
        fields.push("advance_balance = ?"), values.push(advance_balance);
      if (address) fields.push("address = ?"), values.push(address);
      if (mobile) fields.push("mobile = ?"), values.push(mobile);
      if (total_purchase_due !== undefined)
        fields.push("total_purchase_due = ?"), values.push(total_purchase_due);
      if (total_purchase_return_due !== undefined)
        fields.push("total_purchase_return_due = ?"),
          values.push(total_purchase_return_due);
      if (active_status !== undefined)
        fields.push("active_status = ?"), values.push(active_status);

      values.push(id);
      if (fields.length === 0)
        return res.status(400).send("No fields to update.");

      db.run(
        `UPDATE suppliers SET ${fields.join(", ")} WHERE id = ?`,
        values,
        function (err) {
          if (err) {
            console.error("Error updating supplier:", err.message);
            return res.status(500).send("Error updating supplier");
          }

          let entriesLogged = 0;
          const totalEntries =
            (opening_balance > 0 ? 1 : 0) + (advance_balance > 0 ? 1 : 0);

          const logJournalEntry = (balance, balanceType, accountId) => {
            const referenceNumber = `SUP-${balanceType}-${id}-${Date.now()}`;
            const date = new Date().toISOString().split("T")[0];
            const description = `Updated ${
              balanceType === "OB" ? "Opening" : "Advance"
            } balance for supplier ${business_name || name}`;

            db.get(
              `SELECT account_type FROM chart_of_accounts WHERE id = ?`,
              [accountId],
              (err, row) => {
                if (err || !row) {
                  console.error(
                    `Error fetching account type for ${balanceType}:`,
                    err || "Account not found"
                  );
                  return;
                }

                const accountType = row.account_type.toLowerCase();
                let debit = 0,
                  credit = 0;
                if (accountType === "asset") debit = balance;
                else if (accountType === "liability") credit = balance;

                db.run(
                  `INSERT INTO journal_entries (reference_number, date, description, status) VALUES (?, ?, ?, 'posted')`,
                  [referenceNumber, date, description],
                  function (err) {
                    if (!err) {
                      const journalEntryId = this.lastID;
                      db.run(
                        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)`,
                        [journalEntryId, accountId, debit, credit],
                        () => {
                          db.run(
                            `UPDATE chart_of_accounts SET opening_balance_journal_entry_id = ? WHERE id = ?`,
                            [journalEntryId, accountId],
                            () => {
                              entriesLogged++;
                              if (entriesLogged === totalEntries)
                                res.status(200).json({ id, ...req.body });
                            }
                          );
                        }
                      );
                    }
                  }
                );
              }
            );
          };

          if (opening_balance > 0) logJournalEntry(opening_balance, "OB", 5);
          if (advance_balance > 0) logJournalEntry(advance_balance, "ADV", 11);

          if (totalEntries === 0) res.status(200).json({ id, ...req.body });
        }
      );
    }
  );
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
    (contact_id, customer_type, business_name, name, email, tax_number, credit_limit, pay_term, opening_balance, advance_balance, added_on, address, mobile, customer_group, total_sale_due, total_sell_return_due) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`
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
        return res.status(500).send("Error adding customer");
      }

      const customerId = this.lastID;
      let entriesLogged = 0;
      const totalEntries =
        (opening_balance > 0 ? 1 : 0) + (advance_balance > 0 ? 1 : 0);

      const logJournalEntry = (balance, balanceType, accountId) => {
        const referenceNumber = `CUS-${balanceType}-${customerId}-${Date.now()}`;
        const date = new Date().toISOString().split("T")[0];
        const description = `${
          balanceType === "OB" ? "Opening" : "Advance"
        } balance for customer ${business_name || name}`;

        // Get the account type from chart_of_accounts
        db.get(
          `SELECT account_type FROM chart_of_accounts WHERE id = ?`,
          [accountId],
          (err, row) => {
            if (err) {
              console.error(
                `Failed to fetch account type for ${balanceType}:`,
                err
              );
              return;
            }

            if (!row) {
              console.error(
                `Account ID ${accountId} not found in chart_of_accounts.`
              );
              return;
            }

            const accountType = row.account_type.toLowerCase(); // "asset" or "liability"

            // Determine debit or credit based on account type
            let debit = 0,
              credit = 0;
            if (accountType === "asset") {
              debit = balance; // Assets increase with debits
            } else if (accountType === "liability") {
              credit = balance; // Liabilities increase with credits
            }

            // Insert into journal_entries
            db.run(
              `INSERT INTO journal_entries (reference_number, date, description, status) VALUES (?, ?, ?, 'posted')`,
              [referenceNumber, date, description],
              function (err) {
                if (err) {
                  console.error(
                    `Failed to create journal entry for ${balanceType}:`,
                    err
                  );
                  return;
                }

                const journalEntryId = this.lastID;

                // Insert into journal_entry_lines
                db.run(
                  `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)`,
                  [journalEntryId, accountId, debit, credit],
                  (err) => {
                    if (err) {
                      console.error(
                        `Failed to create journal entry line for ${balanceType}:`,
                        err
                      );
                    }

                    // Update chart_of_accounts with opening_balance_journal_entry_id
                    db.run(
                      `UPDATE chart_of_accounts SET opening_balance_journal_entry_id = ? WHERE id = ?`,
                      [journalEntryId, accountId],
                      (err) => {
                        if (err) {
                          console.error(
                            `Failed to update chart_of_accounts for ${balanceType}:`,
                            err
                          );
                        }

                        entriesLogged++;
                        if (entriesLogged === totalEntries) {
                          res.status(201).json({ id: customerId, ...req.body });
                        }
                      }
                    );
                  }
                );
              }
            );
          }
        );
      };

      if (opening_balance > 0) logJournalEntry(opening_balance, "OB", 4); // Accounts Receivable (OB)
      if (advance_balance > 0) logJournalEntry(advance_balance, "ADV", 12); // Advance Payments (ADV)

      if (totalEntries === 0) {
        res.status(201).json({ id: customerId, ...req.body });
      }
    }
  );
});

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

  if (contact_id !== undefined) {
    fields.push("contact_id = ?");
    values.push(contact_id);
  }
  if (business_name !== undefined) {
    fields.push("business_name = ?");
    values.push(business_name);
  }
  if (name !== undefined) {
    fields.push("name = ?");
    values.push(name);
  }
  if (email !== undefined) {
    fields.push("email = ?");
    values.push(email);
  }
  if (tax_number !== undefined) {
    fields.push("tax_number = ?");
    values.push(tax_number);
  }
  if (credit_limit !== undefined) {
    fields.push("credit_limit = ?");
    values.push(credit_limit);
  }
  if (pay_term !== undefined) {
    fields.push("pay_term = ?");
    values.push(pay_term);
  }
  if (opening_balance !== undefined) {
    fields.push("opening_balance = ?");
    values.push(opening_balance);
  }
  if (advance_balance !== undefined) {
    fields.push("advance_balance = ?");
    values.push(advance_balance);
  }
  if (address !== undefined) {
    fields.push("address = ?");
    values.push(address);
  }
  if (mobile !== undefined) {
    fields.push("mobile = ?");
    values.push(mobile);
  }
  if (customer_group !== undefined) {
    fields.push("customer_group = ?");
    values.push(customer_group);
  }
  if (customer_type !== undefined) {
    fields.push("customer_type = ?");
    values.push(customer_type);
  }

  // Ensure fields are present before running update
  if (fields.length === 0) {
    return res.status(400).json({ error: "No fields to update." });
  }

  // Add ID at the end for WHERE clause
  values.push(id);

  const query = `UPDATE customers SET ${fields.join(
    ", "
  )} WHERE contact_id = ?`;

  db.run(query, values, function (err) {
    if (err) {
      console.error("Error updating customer:", err.message);
      return res.status(500).send("Error updating customer");
    }
    if (this.changes === 0) return res.status(404).send("Customer not found");

    let entriesLogged = 0;
    const totalEntries =
      (opening_balance > 0 ? 1 : 0) + (advance_balance > 0 ? 1 : 0);

    const logJournalEntry = (balance, balanceType, accountId) => {
      const referenceNumber = `CUS-${balanceType}-${id}-${Date.now()}`;
      const date = new Date().toISOString().split("T")[0];
      const description = `${
        balanceType === "OB" ? "Opening" : "Advance"
      } balance for customer ${business_name || name}`;

      // Get the account type from chart_of_accounts
      db.get(
        `SELECT account_type FROM chart_of_accounts WHERE id = ?`,
        [accountId],
        (err, row) => {
          if (err) {
            console.error(
              `Failed to fetch account type for ${balanceType}:`,
              err
            );
            return;
          }

          if (!row) {
            console.error(
              `Account ID ${accountId} not found in chart_of_accounts.`
            );
            return;
          }

          const accountType = row.account_type.toLowerCase(); // "asset" or "liability"

          // Determine debit or credit based on account type
          let debit = 0,
            credit = 0;
          if (accountType === "asset") {
            debit = balance; // Assets increase with debits
          } else if (accountType === "liability") {
            credit = balance; // Liabilities increase with credits
          }

          // Insert into journal_entries
          db.run(
            `INSERT INTO journal_entries (reference_number, date, description, status) VALUES (?, ?, ?, 'posted')`,
            [referenceNumber, date, description],
            function (err) {
              if (err) {
                console.error(
                  `Failed to create journal entry for ${balanceType}:`,
                  err
                );
                return;
              }

              const journalEntryId = this.lastID;

              // Insert into journal_entry_lines
              db.run(
                `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)`,
                [journalEntryId, accountId, debit, credit],
                (err) => {
                  if (err) {
                    console.error(
                      `Failed to create journal entry line for ${balanceType}:`,
                      err
                    );
                  }

                  // Update chart_of_accounts with opening_balance_journal_entry_id
                  db.run(
                    `UPDATE chart_of_accounts SET opening_balance_journal_entry_id = ? WHERE id = ?`,
                    [journalEntryId, accountId],
                    (err) => {
                      if (err) {
                        console.error(
                          `Failed to update chart_of_accounts for ${balanceType}:`,
                          err
                        );
                      }

                      entriesLogged++;
                      if (entriesLogged === totalEntries) {
                        res.status(200).json({ id, ...req.body });
                      }
                    }
                  );
                }
              );
            }
          );
        }
      );
    };

    if (opening_balance > 0) logJournalEntry(opening_balance, "OB", 4); // Accounts Receivable (OB)
    if (advance_balance > 0) logJournalEntry(advance_balance, "ADV", 12); // Advance Payments (ADV)

    if (totalEntries === 0) {
      res.status(200).json({ id, ...req.body });
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
// ===================== Adjsutments Endpoints =====================
// Helper function to create journal entry
const createJournalEntry = (adjustment) => {
  return new Promise((resolve, reject) => {
    const { 
      id, 
      account_id, 
      adjustment_type, 
      amount, 
      reason, 
      date, 
      entry_type,
      reference_number 
    } = adjustment;
    
    // Handle different account mappings based on adjustment type
    const getAccountMapping = (type) => {
      const mappings = {
        'correction': { contra_account: 7001 },
        'reconciliation': { contra_account: 7002 },
        'depreciation': { contra_account: 7003 },
        'accrual': { contra_account: 7004 },
        'prepaid': { contra_account: 7005 },
        'deferral': { contra_account: 7006 },
        'write-off': { contra_account: 7007 },
        'tax': { contra_account: 7008 }
      };
      return mappings[type] || { contra_account: 7000 }; // Default contra account
    };

    const { contra_account } = getAccountMapping(adjustment_type);
    const debit_account_id = entry_type === 'debit' ? account_id : contra_account;
    const credit_account_id = entry_type === 'credit' ? account_id : contra_account;
    db.run(
      `INSERT INTO journal_entries (
        reference_number, 
        date, 
        description, 
        status,
        adjustment_type
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        reference_number,
        date,
        reason,
        'posted',
        adjustment_type      
      ],
      function (err) {
        if (err) return reject(err);
        const journal_entry_id = this.lastID;

        // Create debit entry
        db.run(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, 
            account_id, 
            debit, 
            credit,
            entry_type
          ) VALUES (?, ?, ?, ?, ?)`,
          [journal_entry_id, debit_account_id, amount, 0, 'debit'],
          function (err) {
            if (err) return reject(err);

            // Create credit entry
            db.run(
              `INSERT INTO journal_entry_lines (
                journal_entry_id, 
                account_id, 
                debit, 
                credit,
                entry_type
              ) VALUES (?, ?, ?, ?, ?)`,
              [journal_entry_id, credit_account_id, 0, amount, 'credit'],
              function (err) {
                if (err) return reject(err);

                db.run(
                  `UPDATE adjustments SET journal_entry_id = ? WHERE id = ?`,
                  [journal_entry_id, id]
                );
                resolve(journal_entry_id);
              }
            );
          }
        );
      }
    );
  });
};

// CREATE ADJUSTMENT
app.post("/adjustments", (req, res) => {
  const {
    account_id,
    adjustment_type,
    amount,
    reason,
    date,
    entry_type,
    document_reference,
    created_by,
    affected_periods
  } = req.body;

  const reference_number = `ADJ-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  db.run(
    `INSERT INTO adjustments (
      account_id,
      adjustment_type,
      amount,
      reason,
      date,
      entry_type,
      reference_number,
      status,
      document_reference,
      created_by,
      created_at,
      affected_period_year,
      affected_period_quarter,
      affected_period_month
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account_id,
      adjustment_type,
      amount,
      reason,
      date,
      entry_type,
      reference_number,
      'posted',
      document_reference,
      created_by,
      new Date().toISOString(),
      affected_periods.fiscal_year,
      affected_periods.fiscal_quarter,
      affected_periods.fiscal_month
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const adjustment = {
        id: this.lastID,
        ...req.body,
        reference_number,
        status: 'posted'
      };

      createJournalEntry(adjustment)
        .then(() => res.json({ 
          message: "Adjustment created successfully", 
          adjustment 
        }))
        .catch((error) => res.status(500).json({ error }));
    }
  );
});

// READ ADJUSTMENTS
app.get("/adjustments", (req, res) => {
  const { startDate, endDate, type, account, status } = req.query;
  
  let query = `
    SELECT 
      a.*,
      acc.account_name,
      acc.account_code
    FROM adjustments a
    LEFT JOIN chart_of_accounts acc ON a.account_id = acc.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (startDate && endDate) {
    query += ` AND date BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }
  
  if (type) {
    query += ` AND adjustment_type = ?`;
    params.push(type);
  }
  
  if (account) {
    query += ` AND account_id = ?`;
    params.push(account);
  }
  
  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }
  
  query += ` ORDER BY date DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// UPDATE ADJUSTMENT
app.put("/adjustments/:id", (req, res) => {
  const { id } = req.params;
  const {
    account_id,
    adjustment_type,
    amount,
    reason,
    date,
    entry_type,
    document_reference,
    status
  } = req.body;

  db.get(`SELECT * FROM adjustments WHERE id = ?`, [id], (err, oldAdjustment) => {
    if (err || !oldAdjustment) return res.status(404).json({ error: "Adjustment not found" });

    db.run(
      `UPDATE adjustments 
       SET account_id = ?,
           adjustment_type = ?,
           amount = ?,
           reason = ?,
           date = ?,
           entry_type = ?,
           document_reference = ?,
           status = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        account_id,
        adjustment_type,
        amount,
        reason,
        date,
        entry_type,
        document_reference,
        status,
        new Date().toISOString(),
        id
      ],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Delete old journal entry
        db.run(`DELETE FROM journal_entries WHERE id = ?`, [oldAdjustment.journal_entry_id], (err) => {
          if (err) return res.status(500).json({ error: err.message });

          const updatedAdjustment = {
            id,
            ...req.body,
            reference_number: oldAdjustment.reference_number
          };

          createJournalEntry(updatedAdjustment)
            .then(() => res.json({ 
              message: "Adjustment updated successfully",
              adjustment: updatedAdjustment
            }))
            .catch((error) => res.status(500).json({ error }));
        });
      }
    );
  });
});

// DELETE ADJUSTMENT
app.delete("/adjustments/:id", (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM adjustments WHERE id = ?`, [id], (err, adjustment) => {
    if (err || !adjustment) return res.status(404).json({ error: "Adjustment not found" });

    db.run(`DELETE FROM journal_entries WHERE id = ?`, [adjustment.journal_entry_id], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.run(`DELETE FROM adjustments WHERE id = ?`, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
          message: "Adjustment and related journal entry deleted successfully" 
        });
      });
    });
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
app.post("/taxes", async (req, res) => {
  const { tax_name, tax_rate, tax_type, account_code } = req.body;

  // Validate required fields
  if (!tax_name || tax_rate === undefined || !tax_type || !account_code) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate tax_type
  if (!["inclusive", "exclusive"].includes(tax_type)) {
    return res
      .status(400)
      .json({ error: "Invalid tax type. Must be 'inclusive' or 'exclusive'" });
  }

  // Validate tax_rate is non-negative
  if (tax_rate < 0) {
    return res.status(400).json({ error: "Tax rate cannot be negative" });
  }

  try {
    // First check if the account exists
    const accountExists = await new Promise((resolve, reject) => {
      db.get(
        "SELECT account_code FROM chart_of_accounts WHERE account_code = ?",
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
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
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
          account_code,
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// READ - Get all taxes
app.get("/taxes", (req, res) => {
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
app.get("/taxes/:id", (req, res) => {
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
app.put("/taxes/:id", async (req, res) => {
  const { id } = req.params;
  const { tax_name, tax_rate, tax_type, account_code } = req.body;

  // Validate required fields
  if (!tax_name || tax_rate === undefined || !tax_type || !account_code) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate tax_type
  if (!["inclusive", "exclusive"].includes(tax_type)) {
    return res
      .status(400)
      .json({ error: "Invalid tax type. Must be 'inclusive' or 'exclusive'" });
  }

  // Validate tax_rate is non-negative
  if (tax_rate < 0) {
    return res.status(400).json({ error: "Tax rate cannot be negative" });
  }

  try {
    // Check if the account exists
    const accountExists = await new Promise((resolve, reject) => {
      db.get(
        "SELECT account_code FROM chart_of_accounts WHERE account_code = ?",
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
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
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
          account_code,
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE - Delete a tax
app.delete("/taxes/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM taxes WHERE id = ?", [id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete tax" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Tax not found" });
    }

    res.json({ message: "Tax deleted successfully" });
  });
});

// ==================== CREATE EXPENSE ====================
app.post("/expenses", (req, res) => {
  const {
    expense_date,
    amount,
    expense_account_id,
    description,
    payment_method_id,
    payment_method,
  } = req.body;

  // Step 1: Create a journal entry for the expense
  const reference_number = `EXP${Date.now()}`;
  const date = expense_date;
  const journal_entry_description = description || "Expense entry";

  db.run(
    `INSERT INTO journal_entries (reference_number, date, description, status) VALUES (?, ?, ?, 'posted')`,
    [reference_number, date, journal_entry_description],
    function (err) {
      if (err) {
        console.error("Error creating journal entry:", err.message);
        return res.status(500).send("Error creating journal entry");
      }

      const journal_entry_id = this.lastID;

      // Step 2: Create journal entry lines
      // Debit the expense account
      db.run(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)`,
        [journal_entry_id, expense_account_id, amount, 0],
        function (err) {
          if (err) {
            console.error("Error creating journal entry line:", err.message);
            return res.status(500).send("Error creating journal entry line");
          }

          // Step 3: Handle credit based on payment method
          if (payment_method === "credit") {
            // Credit "Accounts Payable" for credit expenses
            const accountsPayableId = 5; // Replace with the actual account ID for "Accounts Payable"
            db.run(
              `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)`,
              [journal_entry_id, accountsPayableId, 0, amount],
              function (err) {
                if (err) {
                  console.error(
                    "Error creating Accounts Payable journal entry line:",
                    err.message
                  );
                  return res
                    .status(500)
                    .send("Error creating Accounts Payable journal entry line");
                }

                // Create the expense record
                createExpenseRecord(
                  expense_date,
                  amount,
                  expense_account_id,
                  description,
                  journal_entry_id,
                  payment_method,
                  res
                );
              }
            );
          } else {
            // Credit the selected payment method for non-credit expenses
            db.run(
              `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)`,
              [journal_entry_id, payment_method_id, 0, amount],
              function (err) {
                if (err) {
                  console.error(
                    "Error creating payment method journal entry line:",
                    err.message
                  );
                  return res
                    .status(500)
                    .send("Error creating payment method journal entry line");
                }

                // Create the expense record
                createExpenseRecord(
                  expense_date,
                  amount,
                  expense_account_id,
                  description,
                  journal_entry_id,
                  payment_method_id,
                  res
                );
              }
            );
          }
        }
      );
    }
  );
});

function createExpenseRecord(
  expense_date,
  amount,
  expense_account_id,
  description,
  journal_entry_id,
  payment_method, // <-- Added payment_method
  res
) {
  db.run(
    `INSERT INTO expenses (expense_date, amount, expense_account_id, description, journal_entry_id) 
     VALUES (?, ?, ?, ?, ?)`,
    [expense_date, amount, expense_account_id, description, journal_entry_id],
    function (err) {
      if (err) {
        console.error("Error creating expense:", err.message);
        return res.status(500).send("Error creating expense");
      }

      const expense_id = this.lastID; // Get the inserted expense ID
      createExpenseInvoice(expense_id, amount, payment_method, res); // <-- Pass payment_method
    }
  );
}

// Function to create the expense invoice
function createExpenseInvoice(expense_id, total_amount, payment_method, res) {
  const reference_number = `EXP-INV-${Date.now()}`;
  const issue_date = new Date().toISOString().split("T")[0];

  // Determine invoice status based on payment method
  const status = payment_method === "credit" ? "unpaid" : "paid";

  db.run(
    `INSERT INTO expense_invoices (expense_id, reference_number, issue_date, total_amount, amount_paid, status) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      expense_id,
      reference_number,
      issue_date,
      total_amount,
      status === "paid" ? total_amount : 0,
      status,
    ], // <-- Set amount_paid if paid
    function (err) {
      if (err) {
        console.error("Error creating expense invoice:", err.message);
        return res.status(500).send("Error creating expense invoice");
      }

      res.status(201).json({
        message: "Expense and Invoice created successfully",
        expense_id: expense_id,
        invoice_id: this.lastID,
        invoice_status: status,
      });
    }
  );
}

// ==================== READ EXPENSES ====================
app.get("/expenses", (req, res) => {
  const query = `
    SELECT e.*, ei.status, ei.balance_due
    FROM expenses e
    LEFT JOIN expense_invoices ei ON e.id = ei.id
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching expenses:", err.message);
      return res.status(500).send("Error fetching expenses");
    }

    res.json(rows);
  });
});

// ==================== READ SINGLE EXPENSE ====================
app.get("/expenses/:id", (req, res) => {
  const { id } = req.params;
  const query = `SELECT * FROM expenses WHERE id = ?`;

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error("Error fetching expense:", err.message);
      return res.status(500).send("Error fetching expense");
    }

    if (!row) {
      return res.status(404).send("Expense not found");
    }

    res.json(row);
  });
});

app.put("/expenses/pay/:id", (req, res) => {
  const { id } = req.params;
  const { payment_method_id, payAmount } = req.body;

  // Fetch expense details
  db.get(
    `SELECT e.*, ei.id AS invoice_id, ei.total_amount, ei.amount_paid, ei.balance_due
     FROM expenses e
     LEFT JOIN expense_invoices ei ON e.id = ei.id
     WHERE e.id = ?`,
    [id],
    (err, expense) => {
      if (err) {
        console.error("Error fetching expense:", err.message);
        return res.status(500).send("Error fetching expense");
      }
      if (!expense) {
        return res.status(404).send("Expense not found");
      }

      // Ensure payment amount does not exceed balance due
      if (payAmount > expense.balance_due) {
        return res.status(400).send("Payment amount exceeds balance due");
      }

      // Step 1: Create a new Journal Entry for the payment
      const reference_number = `PAY${Date.now()}`;
      const date = new Date().toISOString().split("T")[0];
      const journal_entry_description = `Payment for Expense #${id}`;

      db.run(
        `INSERT INTO journal_entries (reference_number, date, description, status) 
         VALUES (?, ?, ?, 'posted')`,
        [reference_number, date, journal_entry_description],
        function (err) {
          if (err) {
            console.error("Error creating payment journal entry:", err.message);
            return res.status(500).send("Error creating journal entry");
          }

          const journal_entry_id = this.lastID;

          // Step 2: Create Journal Entry Lines
          const paymentAccountId = payment_method_id; // Cash/Bank Account
          const accountsPayableId = 5; // Replace with actual "Accounts Payable" account ID

          // Debit: Reduce cash/bank balance
          db.run(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) 
             VALUES (?, ?, ?, ?)`,
            [journal_entry_id, paymentAccountId, 0, payAmount],
            function (err) {
              if (err) {
                console.error("Error creating debit journal entry line:", err.message);
                return res.status(500).send("Error creating journal entry line");
              }

              // Credit: Reduce liability
              db.run(
                `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) 
                 VALUES (?, ?, ?, ?)`,
                [journal_entry_id, accountsPayableId, payAmount, 0],
                function (err) {
                  if (err) {
                    console.error("Error creating credit journal entry line:", err.message);
                    return res.status(500).send("Error creating journal entry line");
                  }

                  // Step 3: Update Payment Records
                  const newAmountPaid = parseFloat(expense.amount_paid) + parseFloat(payAmount);

                  const newBalanceDue = parseFloat(expense.total_amount) - parseFloat(newAmountPaid);
                  const newStatus = newBalanceDue === 0 ? "paid" : "partial";

                  db.run(
                    `UPDATE expense_invoices 
                     SET amount_paid = ?, status = ? 
                     WHERE id = ?`,
                    [newAmountPaid, newStatus, expense.invoice_id],
                    function (err) {
                      if (err) {
                        console.error("Error updating expense status:", err.message);
                        return res.status(500).send("Error updating expense status");
                      }

                      res.status(200).json({
                        message: `Expense marked as ${newStatus}, journal entry created successfully!`,
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});
// ==================== UPDATE EXPENSE ====================
app.put("/expenses/:id", (req, res) => {
  const { id } = req.params;
  const {
    expense_date,
    amount,
    expense_account_id,
    payment_method,
    payment_method_id,
    description,
  } = req.body;
  // Step 1: Get journal_entry_id associated with the expense
  db.get(
    `SELECT journal_entry_id, id AS invoice_id FROM expenses WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        console.error("Error fetching journal entry ID:", err.message);
        return res.status(500).send("Error fetching journal entry ID");
      }

      if (!row) {
        return res.status(404).send("Expense not found");
      }

      const journal_entry_id = row.journal_entry_id;
      const invoice_id = row.invoice_id;
      
      // Step 2: Update the journal entry (date, description)
      db.run(
        `UPDATE journal_entries SET date = ?, description = ? WHERE id = ?`,
        [expense_date, description, journal_entry_id],
        function (err) {
          if (err) {
            console.error("Error updating journal entry:", err.message);
            return res.status(500).send("Error updating journal entry");
          }

          // Step 3: Update journal entry lines (debit & credit)
          updateJournalEntryLines(
            journal_entry_id,
            expense_account_id,
            amount,
            payment_method,
            payment_method_id,
            res,
            () => {
              // Step 4: Update the expense record
              db.run(
                `UPDATE expenses 
                 SET expense_date = ?, amount = ?, expense_account_id = ?, payment_method = ?, description = ? 
                 WHERE id = ?`,
                [
                  expense_date,
                  amount,
                  expense_account_id,
                  payment_method,
                  description,
                  id,
                ],
                function (err) {
                  if (err) {
                    console.error("Error updating expense:", err.message);
                    return res.status(500).send("Error updating expense");
                  }

                  // Step 5: Update the expense invoice (if applicable)
                  updateExpenseInvoice(invoice_id, amount, res, () => {
                    res.status(200).json({ message: "Expense updated successfully" });
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Function to update journal entry lines
function updateJournalEntryLines(
  journal_entry_id,
  expense_account_id,
  amount,
  payment_method,
  payment_method_id,
  res,
  callback
) {
  db.serialize(() => {
    // Update Debit Entry (Expense Account)
    db.run(
      `UPDATE journal_entry_lines 
       SET account_id = ?, debit = ?, credit = 0 
       WHERE journal_entry_id = ? AND debit > 0`,
      [expense_account_id, amount, journal_entry_id],
      function (err) {
        if (err) {
          console.error(
            "Error updating expense journal entry line:",
            err.message
          );
          return res
            .status(500)
            .send("Error updating expense journal entry line");
        }

        // Update Credit Entry (Payment Method or Accounts Payable)
        const creditAccountId =
          payment_method === "credit" ? 5 : payment_method_id; // 5 = Accounts Payable
        db.run(
          `UPDATE journal_entry_lines 
           SET account_id = ?, debit = 0, credit = ? 
           WHERE journal_entry_id = ? AND credit > 0`,
          [creditAccountId, amount, journal_entry_id],
          function (err) {
            if (err) {
              console.error(
                "Error updating payment journal entry line:",
                err.message
              );
              return res
                .status(500)
                .send("Error updating payment journal entry line");
            }

            callback(); // Proceed with updating expense record
          }
        );
      }
    );
  });
}

// Function to update the expense_invoice
function updateExpenseInvoice(invoice_id, amount, res, callback) {
  // Fetch current invoice data
  db.get(
    `SELECT total_amount, amount_paid, balance_due FROM expense_invoices WHERE expense_id = ?`,
    [invoice_id],
    (err, invoice) => {
      if (err) {
        console.error("Error fetching expense invoice:", err.message);
        return res.status(500).send("Error fetching expense invoice");
      }

      if (!invoice) {
        return res.status(404).send("Invoice not found");
      }
      // Update invoice with new amount_paid and balance_due
      db.run(
        `UPDATE expense_invoices
         SET total_amount = ?
         WHERE expense_id = ?`,
        [amount, invoice_id],
        function (err) {
          if (err) {
            console.error("Error updating expense invoice:", err.message);
            return res.status(500).send("Error updating expense invoice");
          }

          callback(); // Proceed with final response
        }
      );
    }
  );
}


app.patch("/expenses/payment/:id", (req, res) => {
  const { id } = req.params;
  const { payment_method_id, amount } = req.body;

  // Step 1: Update the journal entry's status to "posted"
  const updateJournalStatusQuery = `
    UPDATE journal_entries 
    SET status = 'posted' 
    WHERE id = (SELECT journal_entry_id FROM expenses WHERE id = ?)
  `;

  db.run(updateJournalStatusQuery, [id], function (err) {
    if (err) {
      console.error("Error updating journal status:", err.message);
      return res.status(500).send("Error updating journal status");
    }

    // Step 2: Insert debit and credit lines for the payment
    // 2.1: Get the expense details (expense account id, payment method account id)
    const getExpenseDetailsQuery = `
      SELECT expense_account_id, payment_method FROM expenses WHERE id = ?
    `;

    db.get(getExpenseDetailsQuery, [id], (err, row) => {
      if (err) {
        console.error("Error fetching expense details:", err.message);
        return res.status(500).send("Error fetching expense details");
      }

      const { expense_account_id, payment_method } = row;

      // Step 2.2: Create the debit and credit journal entries for the payment
      const insertDebitQuery = `
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
        VALUES ((SELECT journal_entry_id FROM expenses WHERE id = ?), ?, ?, 0)
      `;

      const insertCreditQuery = `
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
        VALUES ((SELECT journal_entry_id FROM expenses WHERE id = ?), ?, 0, ?)
      `;

      // Debit the expense account
      db.run(
        insertDebitQuery,
        [id, expense_account_id, amount],
        function (err) {
          if (err) {
            console.error("Error inserting debit journal line:", err.message);
            return res.status(500).send("Error inserting debit journal line");
          }

          // Credit the payment method account
          db.run(
            insertCreditQuery,
            [id, payment_method, amount],
            function (err) {
              if (err) {
                console.error(
                  "Error inserting credit journal line:",
                  err.message
                );
                return res
                  .status(500)
                  .send("Error inserting credit journal line");
              }

              res.status(200).json({
                message: "Payment recorded successfully and journal updated",
              });
            }
          );
        }
      );
    });
  });
});

// ==================== DELETE EXPENSE ====================
app.delete("/expenses/:id", (req, res) => {
  const { id } = req.params;

  // Step 1: Get journal entry ID for the expense
  db.get(`SELECT journal_entry_id FROM expenses WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error("Error fetching journal entry ID:", err.message);
      return res.status(500).send("Error fetching journal entry ID");
    }

    if (!row) {
      return res.status(404).send("Expense not found");
    }

    const journal_entry_id = row.journal_entry_id;
    const reversal_reference = `REV${Date.now()}`;
    const reversal_date = new Date().toISOString().split("T")[0];

    // Step 2: Fetch existing journal entry lines
    db.all(`SELECT account_id, debit, credit FROM journal_entry_lines WHERE journal_entry_id = ?`, 
      [journal_entry_id], 
      (err, lines) => {
        if (err) {
          console.error("Error fetching journal entry lines:", err.message);
          return res.status(500).send("Error fetching journal entry lines");
        }

        if (!lines || lines.length === 0) {
          return res.status(404).send("No journal entry lines found for expense.");
        }

        // Step 3: Insert a new reversing journal entry
        db.run(
          `INSERT INTO journal_entries (reference_number, date, description, status) VALUES (?, ?, ?, 'posted')`,
          [reversal_reference, reversal_date, `Reversal for Expense #${id}`],
          function (err) {
            if (err) {
              console.error("Error creating reversing journal entry:", err.message);
              return res.status(500).send("Error creating reversing journal entry");
            }

            const reversal_entry_id = this.lastID;

            // Step 4: Insert reversing journal entry lines
            let insertQueries = lines.map(line => {
              return new Promise((resolve, reject) => {
                db.run(
                  `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)`,
                  [reversal_entry_id, line.account_id, line.credit, line.debit], // Reversing debit & credit
                  function (err) {
                    if (err) {
                      console.error("Error inserting reversing journal entry line:", err.message);
                      reject(err);
                    } else {
                      resolve();
                    }
                  }
                );
              });
            });

            Promise.all(insertQueries)
              .then(() => {
                // Step 5: Proceed with deleting original journal entry and expense
                deleteExpenseAndInvoice(journal_entry_id, id, res);
              })
              .catch(err => {
                console.error("Error inserting reversing journal entry lines:", err.message);
                res.status(500).send("Error inserting reversing journal entry lines");
              });
          }
        );
      }
    );
  });
});

// Function to delete the journal entry, invoice, and expense
function deleteExpenseAndInvoice(journal_entry_id, expense_id, res) {
  db.serialize(() => {
    // Delete Journal Entry Lines
    db.run(`DELETE FROM journal_entry_lines WHERE journal_entry_id = ?`, [journal_entry_id], function (err) {
      if (err) {
        console.error("Error deleting journal entry lines:", err.message);
        return res.status(500).send("Error deleting journal entry lines");
      }

      // Delete Journal Entry
      db.run(`DELETE FROM journal_entries WHERE id = ?`, [journal_entry_id], function (err) {
        if (err) {
          console.error("Error deleting journal entry:", err.message);
          return res.status(500).send("Error deleting journal entry");
        }

        // Delete Expense Invoice
        db.run(`DELETE FROM expense_invoices WHERE id = ?`, [expense_id], function (err) {
          if (err) {
            console.error("Error deleting expense invoice:", err.message);
            return res.status(500).send("Error deleting expense invoice");
          }

          // Delete Expense Record
          db.run(`DELETE FROM expenses WHERE id = ?`, [expense_id], function (err) {
            if (err) {
              console.error("Error deleting expense:", err.message);
              return res.status(500).send("Error deleting expense");
            }

            res.status(200).json({
              message: "Expense deleted successfully, and reversal entry recorded.",
            });
          });
        });
      });
    });
  });
}

// 🔹 Get All Invoices
app.get("/expense-invoices", (req, res) => {
  db.all("SELECT * FROM expense_invoices", [], (err, rows) => {
    if (err) {
      console.error("Error fetching invoices:", err.message);
      return res.status(500).json({ error: "Failed to fetch invoices" });
    }
    res.json(rows);
  });
});

// 🔹 Get Single Invoice by ID
app.get("/expense-invoices/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM expense_invoices WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error fetching invoice:", err.message);
      return res.status(500).json({ error: "Failed to fetch invoice" });
    }
    if (!row) return res.status(404).json({ error: "Invoice not found" });
    res.json(row);
  });
});

// 🔹 Create New Invoice
app.post("/expense-invoices", (req, res) => {
  const { expense_id, total_amount } = req.body;
  if (!expense_id || !total_amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const reference_number = `EXP${Date.now()}`;
  const issue_date = new Date().toISOString().split("T")[0];

  db.run(
    `INSERT INTO expense_invoices (expense_id, reference_number, issue_date, total_amount, amount_paid, status) 
     VALUES (?, ?, ?, ?, 0, 'unpaid')`,
    [expense_id, reference_number, issue_date, total_amount],
    function (err) {
      if (err) {
        console.error("Error creating invoice:", err.message);
        return res.status(500).json({ error: "Failed to create invoice" });
      }
      res.status(201).json({ message: "Invoice created", id: this.lastID });
    }
  );
});

// 🔹 Update Invoice (Payment)
app.put("/expense-invoices/:id", (req, res) => {
  const { id } = req.params;
  const { amount_paid } = req.body;

  if (amount_paid === undefined) {
    return res.status(400).json({ error: "Amount paid is required" });
  }

  db.run(
    `UPDATE expense_invoices 
     SET amount_paid = ?, 
         status = CASE 
                    WHEN total_amount = amount_paid THEN 'paid'
                    WHEN amount_paid > 0 THEN 'partial'
                    ELSE 'unpaid'
                  END
     WHERE id = ?`,
    [amount_paid, id],
    function (err) {
      if (err) {
        console.error("Error updating invoice:", err.message);
        return res.status(500).json({ error: "Failed to update invoice" });
      }
      res.json({ message: "Invoice updated successfully" });
    }
  );
});

// 🔹 Delete Invoice
app.delete("/expense-invoices/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM expense_invoices WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Error deleting invoice:", err.message);
      return res.status(500).json({ error: "Failed to delete invoice" });
    }
    res.json({ message: "Invoice deleted successfully" });
  });
});

// ===================== income statement =====================
app.get("/reports/income-statement", (req, res) => {
  const { date } = req.query; // Get date from query parameter

  if (!date) {
    return res.status(400).send("Date is required.");
  }

  try {
    // Query for revenue accounts with the selected date
    const revenueQuery = `
      SELECT coa.account_name, SUM(jel.credit - jel.debit) AS amount
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_type = 'revenue'
      AND je.date <= ?  -- Filter based on the date
      GROUP BY coa.account_name
    `;

    // Query for expense accounts with the selected date
    const expenseQuery = `
      SELECT coa.account_name, SUM(jel.debit - jel.credit) AS amount
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_type = 'expense'
      AND je.date <= ?  -- Filter based on the date
      GROUP BY coa.account_name
    `;

    // Run both queries
    db.all(revenueQuery, [date], (err, revenue) => {
      if (err) {
        console.error("Error fetching revenue data:", err);
        return res.status(500).send("Failed to fetch revenue data.");
      }

      db.all(expenseQuery, [date], (err, expenses) => {
        if (err) {
          console.error("Error fetching expense data:", err);
          return res.status(500).send("Failed to fetch expense data.");
        }

        // Calculate totals
        const totalRevenue = revenue.reduce(
          (sum, item) => sum + item.amount,
          0
        );
        const totalExpenses = expenses.reduce(
          (sum, item) => sum + item.amount,
          0
        );
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
  const { date } = req.query; // Extract the date from the query parameters

  // Validate the date
  if (!date) {
    return res.status(400).send("Date is required.");
  }

  // Convert the date to a format suitable for SQL query (assuming the date is in 'YYYY-MM-DD' format)
  const dateFormatted = new Date(date).toISOString().split("T")[0]; // Format as 'YYYY-MM-DD'

  try {
    // Define queries with date filters using journal_entry.date
    const queries = {
      currentAssetsQuery: `
        SELECT coa.account_name, SUM(jel.debit - jel.credit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.account_type = 'asset' AND coa.is_current = TRUE
        AND je.date <= ?
        GROUP BY coa.account_name
      `,
      nonCurrentAssetsQuery: `
        SELECT coa.account_name, SUM(jel.debit - jel.credit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.account_type = 'asset' AND coa.is_current = FALSE
        AND je.date <= ?
        GROUP BY coa.account_name
      `,
      currentLiabilitiesQuery: `
        SELECT coa.account_name, SUM(jel.credit - jel.debit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.account_type = 'liability' AND coa.is_current = TRUE
        AND je.date <= ?
        GROUP BY coa.account_name
      `,
      nonCurrentLiabilitiesQuery: `
        SELECT coa.account_name, SUM(jel.credit - jel.debit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.account_type = 'liability' AND coa.is_current = FALSE
        AND je.date <= ?
        GROUP BY coa.account_name
      `,
      equityQuery: `
        SELECT coa.account_name, SUM(jel.credit - jel.debit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.account_type = 'equity' AND coa.is_current = TRUE
        AND je.date <= ?
        GROUP BY coa.account_name
      `,
      revenueQuery: `
        SELECT coa.account_name, SUM(jel.credit - jel.debit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.account_type = 'revenue' 
        AND je.date <= ?
        GROUP BY coa.account_name
      `,
      expenseQuery: `
        SELECT coa.account_name, SUM(jel.debit - jel.credit) AS amount
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
        INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.account_type = 'expense' 
        AND je.date <= ?
        GROUP BY coa.account_name
      `,
    };

    // Prepare statements for each query, passing the date
    const currentAssetsStmt = db.prepare(queries.currentAssetsQuery);
    const nonCurrentAssetsStmt = db.prepare(queries.nonCurrentAssetsQuery);
    const currentLiabilitiesStmt = db.prepare(queries.currentLiabilitiesQuery);
    const nonCurrentLiabilitiesStmt = db.prepare(
      queries.nonCurrentLiabilitiesQuery
    );
    const equityStmt = db.prepare(queries.equityQuery);
    const revenueStmt = db.prepare(queries.revenueQuery);
    const expenseStmt = db.prepare(queries.expenseQuery);

    // Run queries in parallel using stmt.all()
    const [
      currentAssets,
      nonCurrentAssets,
      currentLiabilities,
      nonCurrentLiabilities,
      equity,
      revenue,
      expense,
    ] = await Promise.all([
      new Promise((resolve, reject) => {
        currentAssetsStmt.all([dateFormatted], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        nonCurrentAssetsStmt.all([dateFormatted], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        currentLiabilitiesStmt.all([dateFormatted], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        nonCurrentLiabilitiesStmt.all([dateFormatted], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        equityStmt.all([dateFormatted], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        revenueStmt.all([dateFormatted], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        expenseStmt.all([dateFormatted], (err, rows) => {
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
      revenue,
      expense,
    });
  } catch (error) {
    console.error("Error generating balance sheet:", error.message);
    res.status(500).send("Failed to generate balance sheet.");
  }
});

app.get("/reports/trial-balance", (req, res) => {
  try {
    // Query to calculate total debits and credits for each account
    const query = `
 SELECT
  c.id,
  c.account_name,
  c.parent_account_id,
  SUM(jel.debit) AS debit,
  SUM(jel.credit) AS credit
FROM
  chart_of_accounts c
LEFT JOIN
  journal_entry_lines jel ON jel.account_id = c.id
GROUP BY
  c.id, c.account_name, c.parent_account_id
ORDER BY
  COALESCE(c.parent_account_id, c.id), c.id;
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("Error fetching trial balance:", err.message);
        return res.status(500).send("Error fetching trial balance.");
      }

      res.json(rows);
    });
  } catch (error) {
    console.error("Error generating trial balance:", error.message);
    res.status(500).send("Failed to generate trial balance.");
  }
});

// API endpoint to fetch chart of accounts with balances
app.get("/chart-of-accounts", (req, res) => {
  try {
    const query = `
      WITH RECURSIVE AccountHierarchy AS (
        -- Base case: Start with all accounts
        SELECT 
          coa.id,
          coa.account_name,
          coa.account_code,
          coa.account_type,
          coa.parent_account_id,
          SUM(jel.debit) AS total_debit,
          SUM(jel.credit) AS total_credit
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        GROUP BY coa.id

        UNION ALL

        -- Recursive case: Add child accounts to their parent
        SELECT 
          parent.id,
          parent.account_name,
          parent.account_code,
          parent.account_type,
          parent.parent_account_id,
          child.total_debit,
          child.total_credit
        FROM AccountHierarchy child
        JOIN chart_of_accounts parent ON child.parent_account_id = parent.id
      )
      SELECT 
        id,
        account_name,
        account_code,
        account_type,
        parent_account_id,
        SUM(total_debit) AS total_debit,
        SUM(total_credit) AS total_credit
      FROM AccountHierarchy
      GROUP BY id, account_name, account_code, account_type, parent_account_id
      ORDER BY COALESCE(parent_account_id, id), id;
    `;

    db.all(query, [], (err, accounts) => {
      if (err) {
        console.error(
          "Error fetching chart of accounts with balances:",
          err.message
        );
        return res.status(500).send("Error fetching chart of accounts.");
      }

      // Adjust balance calculation based on account type
      const accountsWithBalances = accounts.map((account) => {
        let balance = 0;

        // Adjust balance calculation based on account type
        switch (account.account_type) {
          case "asset":
          case "expense":
            balance = account.total_debit - account.total_credit;
            break;
          case "liability":
          case "income":
          case "equity": // Added equity handling
            balance = account.total_credit - account.total_debit;
            break;
          default:
            balance = 0;
        }

        return { ...account, balance };
      });

      res.json(accountsWithBalances);
    });
  } catch (error) {
    console.error(
      "Error fetching chart of accounts with balances:",
      error.message
    );
    res.status(500).send("Failed to fetch chart of accounts.");
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
