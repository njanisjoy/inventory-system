const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;

const JWT_SECRET = "inventory-system-secret-2026";

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "inventory_system",
  password: "qwerty015",
  port: 5432
});

app.use(express.json());

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Anda tidak memiliki izin untuk melakukan tindakan ini"
      });
    }

    next();
  };
}


// ======================================================
// MIDDLEWARE: CEK LOGIN
// ======================================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Token tidak ditemukan"
    });
  }

  jwt.verify(token, JWT_SECRET, (error, user) => {
    if (error) {
      return res.status(403).json({
        message: "Token tidak valid atau sudah expired"
      });
    }

    req.user = user;
    next();
  });
}


// ======================================================
// MIDDLEWARE: CEK ROLE
// ======================================================

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        message: "User belum login"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Kamu tidak memiliki izin untuk melakukan tindakan ini"
      });
    }

    next();
  };
}


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
  res.send("Inventory System Berjalan!");
});


// ======================================================
// PRODUCTS
// ======================================================

// ======================================================
// GET PRODUCTS
// SEMUA USER YANG SUDAH LOGIN BOLEH MELIHAT
// ======================================================

app.get(
  "/api/units",
  authenticateToken,
  authorizeRoles("admin_utama", "admin_2", "admin_3", "gudang"),
  async (req, res) => {

    try {

      const result = await pool.query(`
        SELECT
          id,
          name,
          symbol,
          created_at,
          updated_at
        FROM units
        ORDER BY id;
      `);

      res.json(result.rows);

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal mengambil data satuan",
        error: error.message
      });
    }
  }
);


// ======================================================
// CREATE PRODUCT
// ADMIN UTAMA SAJA
// ======================================================

app.post(
  "/api/units",
  authenticateToken,
  authorizeRoles("admin_utama"),
  async (req, res) => {

    const { name, symbol } = req.body;

    // ==========================================
    // 1. VALIDASI INPUT
    // ==========================================

    if (!name || !symbol) {
      return res.status(400).json({
        message: "name dan symbol wajib diisi"
      });
    }

    const cleanName = name.trim();
    const cleanSymbol = symbol.trim().toUpperCase();

    if (!cleanName || !cleanSymbol) {
      return res.status(400).json({
        message: "name dan symbol tidak boleh kosong"
      });
    }

    try {

      // ==========================================
      // 2. CEK DUPLICATE SYMBOL
      // ==========================================

      const duplicateResult = await pool.query(
        `
        SELECT id
        FROM units
        WHERE UPPER(symbol) = $1;
        `,
        [cleanSymbol]
      );

      if (duplicateResult.rows.length > 0) {
        return res.status(400).json({
          message: "Satuan dengan symbol tersebut sudah ada"
        });
      }

      // ==========================================
      // 3. INSERT UNIT
      // ==========================================

      const result = await pool.query(
        `
        INSERT INTO units (
          name,
          symbol,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *;
        `,
        [
          cleanName,
          cleanSymbol
        ]
      );

      // ==========================================
      // 4. RESPONSE
      // ==========================================

      res.status(201).json({
        message: "Satuan berhasil ditambahkan",
        unit: result.rows[0]
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal menambahkan satuan",
        error: error.message
      });
    }
  }
);

// ======================================================
// UPDATE PRODUCT
// ADMIN UTAMA SAJA
// ======================================================

app.put(
  "/api/products/:id",
  authenticateToken,
  authorizeRoles("admin_utama"),
  async (req, res) => {

    const productId = req.params.id;

    const {
      name,
      category_id,
      unit_id,
      default_location_id,
      minimum_stock,
      description
    } = req.body;

    // ==========================================
    // 1. VALIDASI INPUT DASAR
    // ==========================================

    if (
      !name ||
      !category_id ||
      !unit_id
    ) {
      return res.status(400).json({
        message:
          "name, category_id, dan unit_id wajib diisi"
      });
    }

    const parsedMinimumStock = Number(minimum_stock);

    if (
      !Number.isFinite(parsedMinimumStock) ||
      parsedMinimumStock < 0
    ) {
      return res.status(400).json({
        message:
          "minimum_stock harus berupa angka 0 atau lebih"
      });
    }

    try {

      // ==========================================
      // 2. CEK PRODUCT
      // ==========================================

      const productResult = await pool.query(
        `
        SELECT
          id,
          code,
          name
        FROM products
        WHERE id = $1;
        `,
        [productId]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          message: "Barang tidak ditemukan"
        });
      }

      const product = productResult.rows[0];

      // ==========================================
      // 3. VALIDASI CATEGORY
      // ==========================================

      const categoryResult = await pool.query(
        `
        SELECT id, name
        FROM categories
        WHERE id = $1;
        `,
        [category_id]
      );

      if (categoryResult.rows.length === 0) {
        return res.status(404).json({
          message: "Kategori tidak ditemukan"
        });
      }

      // ==========================================
      // 4. VALIDASI UNIT
      // ==========================================

      const unitResult = await pool.query(
        `
        SELECT id, name, symbol
        FROM units
        WHERE id = $1;
        `,
        [unit_id]
      );

      if (unitResult.rows.length === 0) {
        return res.status(404).json({
          message: "Satuan tidak ditemukan"
        });
      }

      // ==========================================
      // 5. VALIDASI LOCATION JIKA DIISI
      // ==========================================

      if (default_location_id) {

        const locationResult = await pool.query(
          `
          SELECT id, name, type
          FROM locations
          WHERE id = $1;
          `,
          [default_location_id]
        );

        if (locationResult.rows.length === 0) {
          return res.status(404).json({
            message: "Lokasi tidak ditemukan"
          });
        }
      }

      // ==========================================
      // 6. UPDATE PRODUCT
      // ==========================================

      const result = await pool.query(
        `
        UPDATE products
        SET
          name = $1,
          category_id = $2,
          unit_id = $3,
          default_location_id = $4,
          minimum_stock = $5,
          description = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *;
        `,
        [
          name.trim(),
          category_id,
          unit_id,
          default_location_id || null,
          parsedMinimumStock,
          description?.trim() || null,
          productId
        ]
      );

      // ==========================================
      // 7. RESPONSE
      // ==========================================

      res.json({
        message: "Barang berhasil diperbarui",
        product: result.rows[0]
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal memperbarui barang",
        error: error.message
      });
    }
  }
);


// ======================================================
// UPDATE UNIT
// ADMIN UTAMA SAJA
// ======================================================

app.put(
  "/api/units/:id",
  authenticateToken,
  authorizeRoles("admin_utama"),
  async (req, res) => {

    const unitId = req.params.id;

    const { name, symbol } = req.body;

    // ==========================================
    // 1. VALIDASI INPUT
    // ==========================================

    if (!name || !symbol) {
      return res.status(400).json({
        message: "name dan symbol wajib diisi"
      });
    }

    const cleanName = name.trim();
    const cleanSymbol = symbol.trim().toUpperCase();

    if (!cleanName || !cleanSymbol) {
      return res.status(400).json({
        message: "name dan symbol tidak boleh kosong"
      });
    }

    try {

      // ==========================================
      // 2. CEK UNIT
      // ==========================================

      const unitResult = await pool.query(
        `
        SELECT id, name, symbol
        FROM units
        WHERE id = $1;
        `,
        [unitId]
      );

      if (unitResult.rows.length === 0) {
        return res.status(404).json({
          message: "Satuan tidak ditemukan"
        });
      }

      // ==========================================
      // 3. CEK DUPLICATE SYMBOL
      // KECUALI UNIT YANG SEDANG DIEDIT
      // ==========================================

      const duplicateResult = await pool.query(
        `
        SELECT id
        FROM units
        WHERE UPPER(symbol) = $1
          AND id <> $2;
        `,
        [cleanSymbol, unitId]
      );

      if (duplicateResult.rows.length > 0) {
        return res.status(400).json({
          message: "Satuan dengan symbol tersebut sudah ada"
        });
      }

      // ==========================================
      // 4. UPDATE
      // ==========================================

      const result = await pool.query(
        `
        UPDATE units
        SET
          name = $1,
          symbol = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *;
        `,
        [
          cleanName,
          cleanSymbol,
          unitId
        ]
      );

      // ==========================================
      // 5. RESPONSE
      // ==========================================

      res.json({
        message: "Satuan berhasil diperbarui",
        unit: result.rows[0]
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal memperbarui satuan",
        error: error.message
      });
    }
  }
);

// ======================================================
// CATEGORIES
// ======================================================
// ======================================================
// CREATE CATEGORY
// ADMIN UTAMA SAJA
// ======================================================

app.post(
  "/api/categories",
  authenticateToken,
  authorizeRoles("admin_utama"),
  async (req, res) => {

    const { name, description } = req.body;

    // ==========================================
    // 1. VALIDASI INPUT
    // ==========================================

    if (!name) {
      return res.status(400).json({
        message: "name wajib diisi"
      });
    }

    const cleanName = name.trim();

    if (!cleanName) {
      return res.status(400).json({
        message: "name tidak boleh kosong"
      });
    }

    try {

      // ==========================================
      // 2. CEK DUPLICATE NAME
      // ==========================================

      const duplicateResult = await pool.query(
        `
        SELECT id
        FROM categories
        WHERE LOWER(name) = LOWER($1);
        `,
        [cleanName]
      );

      if (duplicateResult.rows.length > 0) {
        return res.status(400).json({
          message: "Kategori dengan nama tersebut sudah ada"
        });
      }

      // ==========================================
      // 3. INSERT CATEGORY
      // ==========================================

      const result = await pool.query(
        `
        INSERT INTO categories (
          name,
          description,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *;
        `,
        [
          cleanName,
          description?.trim() || null
        ]
      );

      // ==========================================
      // 4. RESPONSE
      // ==========================================

      res.status(201).json({
        message: "Kategori berhasil ditambahkan",
        category: result.rows[0]
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal menambahkan kategori",
        error: error.message
      });
    }
  }
);

// ======================================================
// UPDATE CATEGORY
// ADMIN UTAMA SAJA
// ======================================================

app.put(
  "/api/categories/:id",
  authenticateToken,
  authorizeRoles("admin_utama"),
  async (req, res) => {

    const categoryId = req.params.id;

    const {
      name,
      description
    } = req.body;

    // ==========================================
    // 1. VALIDASI INPUT
    // ==========================================

    if (!name) {
      return res.status(400).json({
        message: "name wajib diisi"
      });
    }

    const cleanName = name.trim();

    if (!cleanName) {
      return res.status(400).json({
        message: "name tidak boleh kosong"
      });
    }

    try {

      // ==========================================
      // 2. CEK CATEGORY
      // ==========================================

      const categoryResult = await pool.query(
        `
        SELECT
          id,
          name,
          description
        FROM categories
        WHERE id = $1;
        `,
        [categoryId]
      );

      if (categoryResult.rows.length === 0) {
        return res.status(404).json({
          message: "Kategori tidak ditemukan"
        });
      }

      // ==========================================
      // 3. CEK DUPLICATE NAME
      // ==========================================

      const duplicateResult = await pool.query(
        `
        SELECT id
        FROM categories
        WHERE LOWER(name) = LOWER($1)
          AND id <> $2;
        `,
        [cleanName, categoryId]
      );

      if (duplicateResult.rows.length > 0) {
        return res.status(400).json({
          message: "Kategori dengan nama tersebut sudah ada"
        });
      }

      // ==========================================
      // 4. UPDATE CATEGORY
      // ==========================================

      const result = await pool.query(
        `
        UPDATE categories
        SET
          name = $1,
          description = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *;
        `,
        [
          cleanName,
          description?.trim() || null,
          categoryId
        ]
      );

      // ==========================================
      // 5. RESPONSE
      // ==========================================

      res.json({
        message: "Kategori berhasil diperbarui",
        category: result.rows[0]
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal memperbarui kategori",
        error: error.message
      });
    }
  }
);

// ======================================================
// GET CATEGORIES
// SEMUA USER YANG SUDAH LOGIN BOLEH MELIHAT
// ======================================================

app.get(
  "/api/categories",
  authenticateToken,
  authorizeRoles("admin_utama", "admin_2", "admin_3", "gudang"),
  async (req, res) => {

    try {

      const result = await pool.query(`
        SELECT
          id,
          name,
          description,
          created_at,
          updated_at
        FROM categories
        ORDER BY id;
      `);

      res.json(result.rows);

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal mengambil data kategori",
        error: error.message
      });
    }
  }
);

// ======================================================
// LOCATIONS
// ======================================================

// ======================================================
// GET LOCATIONS
// SEMUA USER YANG SUDAH LOGIN BOLEH MELIHAT
// ======================================================

app.get(
  "/api/locations",
  authenticateToken,
  authorizeRoles("admin_utama", "admin_2", "admin_3", "gudang"),
  async (req, res) => {

    try {

      const result = await pool.query(`
        SELECT
          id,
          name,
          type,
          description,
          created_at,
          updated_at
        FROM locations
        ORDER BY id;
      `);

      res.json(result.rows);

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal mengambil data lokasi",
        error: error.message
      });
    }
  }
);

// ======================================================
// CREATE LOCATION
// ADMIN UTAMA SAJA
// ======================================================

app.post(
  "/api/locations",
  authenticateToken,
  authorizeRoles("admin_utama"),
  async (req, res) => {

    const {
      name,
      type,
      description
    } = req.body;

    // ==========================================
    // 1. VALIDASI INPUT
    // ==========================================

    if (!name || !type) {
      return res.status(400).json({
        message: "name dan type wajib diisi"
      });
    }

    const cleanName = name.trim();
    const cleanType = type.trim().toLowerCase();

    if (!cleanName || !cleanType) {
      return res.status(400).json({
        message: "name dan type tidak boleh kosong"
      });
    }

    try {

      // ==========================================
      // 2. CEK DUPLICATE LOCATION
      // ==========================================

      const duplicateResult = await pool.query(
        `
        SELECT id
        FROM locations
        WHERE LOWER(name) = LOWER($1);
        `,
        [cleanName]
      );

      if (duplicateResult.rows.length > 0) {
        return res.status(400).json({
          message: "Lokasi dengan nama tersebut sudah ada"
        });
      }

      // ==========================================
      // 3. INSERT LOCATION
      // ==========================================

      const result = await pool.query(
        `
        INSERT INTO locations (
          name,
          type,
          description,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *;
        `,
        [
          cleanName,
          cleanType,
          description?.trim() || null
        ]
      );

      // ==========================================
      // 4. RESPONSE
      // ==========================================

      res.status(201).json({
        message: "Lokasi berhasil ditambahkan",
        location: result.rows[0]
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal menambahkan lokasi",
        error: error.message
      });
    }
  }
);

// ======================================================
// UPDATE LOCATION
// ADMIN UTAMA SAJA
// ======================================================

app.put(
  "/api/locations/:id",
  authenticateToken,
  authorizeRoles("admin_utama"),
  async (req, res) => {

    const locationId = req.params.id;

    const {
      name,
      type,
      description
    } = req.body;

    // ==========================================
    // 1. VALIDASI INPUT
    // ==========================================

    if (!name || !type) {
      return res.status(400).json({
        message: "name dan type wajib diisi"
      });
    }

    const cleanName = name.trim();
    const cleanType = type.trim().toLowerCase();

    if (!cleanName || !cleanType) {
      return res.status(400).json({
        message: "name dan type tidak boleh kosong"
      });
    }

    try {

      // ==========================================
      // 2. CEK LOCATION
      // ==========================================

      const locationResult = await pool.query(
        `
        SELECT
          id,
          name,
          type,
          description
        FROM locations
        WHERE id = $1;
        `,
        [locationId]
      );

      if (locationResult.rows.length === 0) {
        return res.status(404).json({
          message: "Lokasi tidak ditemukan"
        });
      }

      // ==========================================
      // 3. CEK DUPLICATE NAME
      // ==========================================

      const duplicateResult = await pool.query(
        `
        SELECT id
        FROM locations
        WHERE LOWER(name) = LOWER($1)
          AND id <> $2;
        `,
        [cleanName, locationId]
      );

      if (duplicateResult.rows.length > 0) {
        return res.status(400).json({
          message: "Lokasi dengan nama tersebut sudah ada"
        });
      }

      // ==========================================
      // 4. UPDATE LOCATION
      // ==========================================

      const result = await pool.query(
        `
        UPDATE locations
        SET
          name = $1,
          type = $2,
          description = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *;
        `,
        [
          cleanName,
          cleanType,
          description?.trim() || null,
          locationId
        ]
      );

      // ==========================================
      // 5. RESPONSE
      // ==========================================

      res.json({
        message: "Lokasi berhasil diperbarui",
        location: result.rows[0]
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal memperbarui lokasi",
        error: error.message
      });
    }
  }
);


// ======================================================
// SUPPLIERS
// ======================================================

// ======================================================
// GET SUPPLIERS
// SEMUA USER YANG SUDAH LOGIN BOLEH MELIHAT
// ======================================================

app.get(
  "/api/suppliers",
  authenticateToken,
  authorizeRoles("admin_utama", "admin_2", "admin_3", "gudang"),
  async (req, res) => {

    try {

      const result = await pool.query(`
        SELECT
          id,
          name,
          contact,
          address,
          pic_name,
          pic_phone,
          notes,
          created_at,
          updated_at
        FROM suppliers
        ORDER BY id;
      `);

      res.json(result.rows);

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal mengambil data supplier",
        error: error.message
      });
    }
  }
);

// ======================================================
// CREATE SUPPLIER
// ADMIN UTAMA SAJA
// ======================================================

app.post(
  "/api/suppliers",
  authenticateToken,
  authorizeRoles("admin_utama"),
  async (req, res) => {

    const {
      name,
      contact,
      address,
      pic_name,
      pic_phone,
      notes
    } = req.body;

    // ==========================================
    // 1. VALIDASI INPUT
    // ==========================================

    if (!name) {
      return res.status(400).json({
        message: "name wajib diisi"
      });
    }

    const cleanName = name.trim();

    if (!cleanName) {
      return res.status(400).json({
        message: "name tidak boleh kosong"
      });
    }

    try {

      // ==========================================
      // 2. CEK DUPLICATE SUPPLIER
      // ==========================================

      const duplicateResult = await pool.query(
        `
        SELECT id
        FROM suppliers
        WHERE LOWER(name) = LOWER($1);
        `,
        [cleanName]
      );

      if (duplicateResult.rows.length > 0) {
        return res.status(400).json({
          message: "Supplier dengan nama tersebut sudah ada"
        });
      }

      // ==========================================
      // 3. INSERT SUPPLIER
      // ==========================================

      const result = await pool.query(
        `
        INSERT INTO suppliers (
          name,
          contact,
          address,
          pic_name,
          pic_phone,
          notes,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *;
        `,
        [
          cleanName,
          contact?.trim() || null,
          address?.trim() || null,
          pic_name?.trim() || null,
          pic_phone?.trim() || null,
          notes?.trim() || null
        ]
      );

      // ==========================================
      // 4. RESPONSE
      // ==========================================

      res.status(201).json({
        message: "Supplier berhasil ditambahkan",
        supplier: result.rows[0]
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal menambahkan supplier",
        error: error.message
      });
    }
  }
);

// ======================================================
// UPDATE SUPPLIER
// ADMIN UTAMA SAJA
// ======================================================

app.put(
  "/api/suppliers/:id",
  authenticateToken,
  authorizeRoles("admin_utama"),
  async (req, res) => {

    const supplierId = req.params.id;

    const {
      name,
      contact,
      address,
      pic_name,
      pic_phone,
      notes
    } = req.body;

    // ==========================================
    // 1. VALIDASI INPUT
    // ==========================================

    if (!name) {
      return res.status(400).json({
        message: "name wajib diisi"
      });
    }

    const cleanName = name.trim();

    if (!cleanName) {
      return res.status(400).json({
        message: "name tidak boleh kosong"
      });
    }

    try {

      // ==========================================
      // 2. CEK SUPPLIER
      // ==========================================

      const supplierResult = await pool.query(
        `
        SELECT
          id,
          name,
          contact,
          address,
          pic_name,
          pic_phone,
          notes
        FROM suppliers
        WHERE id = $1;
        `,
        [supplierId]
      );

      if (supplierResult.rows.length === 0) {
        return res.status(404).json({
          message: "Supplier tidak ditemukan"
        });
      }

      // ==========================================
      // 3. CEK DUPLICATE NAME
      // ==========================================

      const duplicateResult = await pool.query(
        `
        SELECT id
        FROM suppliers
        WHERE LOWER(name) = LOWER($1)
          AND id <> $2;
        `,
        [cleanName, supplierId]
      );

      if (duplicateResult.rows.length > 0) {
        return res.status(400).json({
          message: "Supplier dengan nama tersebut sudah ada"
        });
      }

      // ==========================================
      // 4. UPDATE SUPPLIER
      // ==========================================

      const result = await pool.query(
        `
        UPDATE suppliers
        SET
          name = $1,
          contact = $2,
          address = $3,
          pic_name = $4,
          pic_phone = $5,
          notes = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *;
        `,
        [
          cleanName,
          contact?.trim() || null,
          address?.trim() || null,
          pic_name?.trim() || null,
          pic_phone?.trim() || null,
          notes?.trim() || null,
          supplierId
        ]
      );

      // ==========================================
      // 5. RESPONSE
      // ==========================================

      res.json({
        message: "Supplier berhasil diperbarui",
        supplier: result.rows[0]
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal memperbarui supplier",
        error: error.message
      });
    }
  }
);


// ======================================================
// STOCK
// ======================================================

app.get(
  "/api/stock/transactions",
  authenticateToken,
  authorizeRoles(
    "admin_utama",
    "admin_2",
    "admin_3",
    "gudang"
  ),
  async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        product_id,
        code,
        name,
        unit,
        current_stock,
        minimum_stock,
        stock_status
      FROM stock_status
      ORDER BY name;
    `);

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data stok",
      error: error.message
    });
  }
});


// ======================================================
// STOCK TRANSACTIONS
// ======================================================

app.get(
  "/api/stock",
  authenticateToken,
  authorizeRoles(
    "admin_utama",
    "admin_2",
    "admin_3",
    "gudang"
  ),
  async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        st.id,
        st.product_id,
        p.code,
        p.name,
        st.direction,
        st.transaction_type,
        st.quantity,
        st.transaction_date,
        st.sender,
        st.destination,
        st.invoice_number,
        st.notes,
        u.name AS created_by
      FROM stock_transactions st
      JOIN products p
        ON p.id = st.product_id
      LEFT JOIN users u
        ON u.id = st.created_by
      ORDER BY
        st.transaction_date DESC,
        st.id DESC;
    `);

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil riwayat transaksi",
      error: error.message
    });
  }
});


// ======================================================
// LOGIN
// ======================================================

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: "Username dan password wajib diisi"
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, name, username, password_hash, role
      FROM users
      WHERE username = $1;
      `,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Username atau password salah"
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Username atau password salah"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      {
        expiresIn: "8h"
      }
    );

    res.json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Terjadi kesalahan saat login",
      error: error.message
    });
  }
});

app.get("/api/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name, username, role
      FROM users
      WHERE id = $1;
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    res.json({
      user: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data user",
      error: error.message
    });
  }
});

// ======================================================
// CURRENT USER
// ======================================================



// ======================================================
// STOCK IN
// BARANG MASUK
// ======================================================

app.post(
  "/api/stock/in",
  authenticateToken,
  authorizeRoles("admin_utama", "admin_2", "admin_3"),
  async (req, res) => {

    const {
      product_id,
      quantity,
      supplier_id,
      invoice_number,
      notes
    } = req.body;

    // ==========================================
    // 1. VALIDASI INPUT
    // ==========================================

      const parsedQuantity = Number(quantity);

    if (
      !Number.isInteger(parsedProductId) ||
      parsedProductId <= 0
    ) {
      return res.status(400).json({
        message: "product_id harus berupa ID yang valid"
      });
    }

    try {

      // ==========================================
      // 2. CEK PRODUK
      // ==========================================

      const productResult = await pool.query(
        `
        SELECT
          id,
          code,
          name
        FROM products
        WHERE id = $1;
        `,
        [parsedProductId]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          message: "Produk tidak ditemukan"
        });
      }

      const product = productResult.rows[0];

      // ==========================================
      // 3. CEK SUPPLIER
      // ==========================================

      let parsedSupplierId = null;

      if (
        supplier_id !== undefined &&
        supplier_id !== null &&
        supplier_id !== ""
      ) {

        parsedSupplierId = Number(supplier_id);

        if (
          !Number.isInteger(parsedSupplierId) ||
          parsedSupplierId <= 0
        ) {
          return res.status(400).json({
            message: "supplier_id harus berupa ID yang valid"
          });
        }

        const supplierResult = await pool.query(
          `
          SELECT id, name
          FROM suppliers
          WHERE id = $1;
          `,
          [parsedSupplierId]
        );

        if (supplierResult.rows.length === 0) {
          return res.status(404).json({
            message: "Supplier tidak ditemukan"
          });
        }
      }

      // ==========================================
      // 4. INSERT STOCK TRANSACTION
      // ==========================================

      const result = await pool.query(
        `
        INSERT INTO stock_transactions (
          product_id,
          direction,
          transaction_type,
          quantity,
          transaction_date,
          supplier_id,
          invoice_number,
          notes,
          created_by
        )
        VALUES (
          $1,
          'IN',
          'PURCHASE',
          $2,
          CURRENT_TIMESTAMP,
          $3,
          $4,
          $5,
          $6
        )
        RETURNING *;
        `,
        [
          product.id,
          parsedQuantity,
          parsedSupplierId,
          invoice_number?.trim() || null,
          notes?.trim() || null,
          req.user.id
        ]
      );

      // ==========================================
      // 5. RESPONSE
      // ==========================================

      res.status(201).json({
        message: "Barang berhasil masuk ke stok",
        transaction: result.rows[0]
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Gagal mencatat barang masuk",
        error: error.message
      });
    }
  }
);

// ======================================================
// MATERIAL ISSUE
// BARANG MENTAH KELUAR
// ======================================================


app.post(
  "/api/outbound-orders/:id/ship",
  authenticateToken,
  authorizeRoles("admin_utama"),
  async (req, res) => {
    const orderId = req.params.id;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Lock outbound order
      const orderResult = await client.query(
        `
        SELECT *
        FROM outbound_orders
        WHERE id = $1
        FOR UPDATE;
        `,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error("Outbound order tidak ditemukan");
      }

      const order = orderResult.rows[0];

      // 2. Order yang sudah SHIPPED tidak boleh dikirim lagi
      if (order.status === "SHIPPED") {
        throw new Error(
          "Outbound order ini sudah dikirim"
        );
      }

      // 3. Order yang CANCELLED tidak boleh dikirim
      if (order.status === "CANCELLED") {
        throw new Error(
          "Outbound order yang sudah dibatalkan tidak dapat dikirim"
        );
      }

      // 4. Ambil semua item
      const itemsResult = await client.query(
        `
        SELECT
          ooi.id,
          ooi.product_id,
          ooi.quantity,
          p.code,
          p.name,
          c.name AS category
        FROM outbound_order_items ooi
        JOIN products p
          ON p.id = ooi.product_id
        JOIN categories c
          ON c.id = p.category_id
        WHERE ooi.outbound_order_id = $1
        ORDER BY ooi.id;
        `,
        [orderId]
      );

      if (itemsResult.rows.length === 0) {
        throw new Error(
          "Outbound order tidak memiliki barang"
        );
      }

      // 5. Validasi semua item SEBELUM mengurangi stok
      for (const item of itemsResult.rows) {
        const quantity = Number(item.quantity);

        if (
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            `Quantity ${item.code} tidak valid`
          );
        }

        // Outbound hanya boleh Barang Jadi
        if (item.category !== "Barang Jadi") {
          throw new Error(
            `${item.code} bukan kategori Barang Jadi`
          );
        }

        // Lock product
        const productLock = await client.query(
          `
          SELECT id
          FROM products
          WHERE id = $1
          FOR UPDATE;
          `,
          [item.product_id]
        );

        if (productLock.rows.length === 0) {
          throw new Error(
            `Produk ${item.code} tidak ditemukan`
          );
        }

        // Hitung stok langsung dari source of truth
        const stockResult = await client.query(
          `
          SELECT
            COALESCE(
              SUM(
                CASE
                  WHEN direction = 'IN' THEN quantity
                  WHEN direction = 'OUT' THEN -quantity
                  ELSE 0
                END
              ),
              0
            ) AS current_stock
          FROM stock_transactions
          WHERE product_id = $1;
          `,
          [item.product_id]
        );

        const currentStock = Number(
          stockResult.rows[0].current_stock
        );

        if (quantity > currentStock) {
          throw new Error(
            `Stok ${item.code} tidak mencukupi. ` +
            `Tersedia: ${currentStock}, ` +
            `Diminta: ${quantity}`
          );
        }
      }

      // 6. Semua validasi lolos.
      // Sekarang buat transaksi OUT
      for (const item of itemsResult.rows) {
        await client.query(
          `
          INSERT INTO stock_transactions (
            product_id,
            direction,
            transaction_type,
            quantity,
            transaction_date,
            destination,
            invoice_number,
            notes,
            created_by
          )
          VALUES (
            $1,
            'OUT',
            'OUTBOUND',
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          );
          `,
          [
            item.product_id,
            item.quantity,
            order.transaction_date,
            order.destination,
            order.invoice_number,
            `Pengiriman ${order.customer_name}`,
            req.user.id
          ]
        );
      }

      // 7. Tandai order sebagai SHIPPED
      await client.query(
        `
        UPDATE outbound_orders
        SET
          status = 'SHIPPED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1;
        `,
        [orderId]
      );

      await client.query("COMMIT");

      res.json({
        message: "Outbound order berhasil dikirim",
        order_id: order.id,
        invoice_number: order.invoice_number,
        status: "SHIPPED"
      });

    } catch (error) {
      await client.query("ROLLBACK");

      console.error(error);

      res.status(400).json({
        message: "Gagal mengirim outbound order",
        error: error.message
      });

    } finally {
      client.release();
    }
  }
);

app.get(
  "/api/outbound-orders",
  authenticateToken,
  authorizeRoles("admin_utama", "admin_2", "admin_3"),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          oo.id,
          oo.invoice_number,
          oo.customer_name,
          oo.transaction_date,
          oo.destination,
          oo.status,
          oo.notes,
          oo.created_by,
          u.name AS created_by_name,
          oo.created_at,
          oo.updated_at
        FROM outbound_orders oo
        LEFT JOIN users u ON u.id = oo.created_by
        ORDER BY oo.id DESC;
      `);

      res.json(result.rows);

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Gagal mengambil daftar invoice",
        error: error.message
      });
    }
  }
);

app.get(
  "/api/outbound-orders/:id",
  authenticateToken,
  authorizeRoles("admin_utama", "admin_2", "admin_3"),
  async (req, res) => {
    const orderId = req.params.id;

    try {
      const orderResult = await pool.query(
        `
        SELECT
          oo.id,
          oo.invoice_number,
          oo.customer_name,
          oo.transaction_date,
          oo.destination,
          oo.status,
          oo.notes,
          oo.created_by,
          u.name AS created_by_name,
          oo.created_at,
          oo.updated_at
        FROM outbound_orders oo
        LEFT JOIN users u ON u.id = oo.created_by
        WHERE oo.id = $1;
        `,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          message: "Outbound order tidak ditemukan"
        });
      }

      const itemsResult = await pool.query(
        `
        SELECT
          ooi.id,
          ooi.product_id,
          p.code,
          p.name,
          ooi.quantity,
          ooi.notes
        FROM outbound_order_items ooi
        JOIN products p ON p.id = ooi.product_id
        WHERE ooi.outbound_order_id = $1
        ORDER BY ooi.id;
        `,
        [orderId]
      );

      res.json({
        order: orderResult.rows[0],
        items: itemsResult.rows
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Gagal mengambil detail invoice",
        error: error.message
      });
    }
  }
);

app.put(
  "/api/outbound-orders/:id",
  authenticateToken,
  authorizeRoles("admin_utama", "admin_2", "admin_3"),
  async (req, res) => {

    const orderId = req.params.id;

    const {
      invoice_number,
      customer_name,
      transaction_date,
      destination,
      notes,
      items
    } = req.body;

    // ==========================================
    // 1. VALIDASI HEADER
    // ==========================================

    if (
      !invoice_number ||
      !customer_name ||
      !transaction_date ||
      !destination ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Data invoice dan minimal satu barang wajib diisi"
      });
    }

    const client = await pool.connect();

    try {

      await client.query("BEGIN");

      // ==========================================
      // 2. LOCK ORDER
      // ==========================================

      const orderResult = await client.query(
        `
        SELECT
          id,
          invoice_number,
          status
        FROM outbound_orders
        WHERE id = $1
        FOR UPDATE;
        `,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Outbound order tidak ditemukan"
        });
      }

      const order = orderResult.rows[0];

      // ==========================================
      // 3. HANYA DRAFT YANG BOLEH DIEDIT
      // ==========================================

      if (order.status === "SHIPPED") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Invoice yang sudah SHIPPED tidak dapat diedit"
        });
      }

      if (order.status === "CANCELLED") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Invoice yang sudah dibatalkan tidak dapat diedit"
        });
      }

      if (order.status !== "DRAFT") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: `Invoice dengan status ${order.status} tidak dapat diedit`
        });
      }

      // ==========================================
      // 4. CEK DUPLICATE INVOICE NUMBER
      // ==========================================

      const duplicateInvoice = await client.query(
        `
        SELECT id
        FROM outbound_orders
        WHERE invoice_number = $1
          AND id <> $2
        LIMIT 1;
        `,
        [invoice_number, orderId]
      );

      if (duplicateInvoice.rows.length > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "Nomor invoice sudah digunakan"
        });
      }

      // ==========================================
      // 5. VALIDASI SEMUA ITEM SEBELUM UPDATE
      // ==========================================

      for (const item of items) {

        const quantity = Number(item.quantity);

        if (
          !item.product_id ||
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            "Data item barang tidak valid"
          );
        }

        // Product harus Barang Jadi
        const productResult = await client.query(
          `
          SELECT
            p.id,
            p.code,
            p.name,
            c.name AS category
          FROM products p
          JOIN categories c
            ON c.id = p.category_id
          WHERE p.id = $1;
          `,
          [item.product_id]
        );

        if (productResult.rows.length === 0) {
          throw new Error(
            `Produk dengan ID ${item.product_id} tidak ditemukan`
          );
        }

        const product = productResult.rows[0];

        if (product.category !== "Barang Jadi") {
          throw new Error(
            `${product.code} bukan kategori Barang Jadi`
          );
        }
      }

      // ==========================================
      // 6. UPDATE HEADER
      // ==========================================

      await client.query(
        `
        UPDATE outbound_orders
        SET
          invoice_number = $1,
          customer_name = $2,
          transaction_date = $3,
          destination = $4,
          notes = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6;
        `,
        [
          invoice_number,
          customer_name,
          transaction_date,
          destination,
          notes || null,
          orderId
        ]
      );

      // ==========================================
      // 7. REPLACE ITEMS
      // ==========================================

      await client.query(
        `
        DELETE FROM outbound_order_items
        WHERE outbound_order_id = $1;
        `,
        [orderId]
      );

      for (const item of items) {

        await client.query(
          `
          INSERT INTO outbound_order_items (
            outbound_order_id,
            product_id,
            quantity,
            notes
          )
          VALUES ($1, $2, $3, $4);
          `,
          [
            orderId,
            item.product_id,
            Number(item.quantity),
            item.notes || null
          ]
        );
      }

      // ==========================================
      // 8. COMMIT
      // ==========================================

      await client.query("COMMIT");

      res.json({
        message: "Invoice berhasil diperbarui",
        order_id: orderId,
        updated_by: req.user.id
      });

    } catch (error) {

      await client.query("ROLLBACK");

      console.error(error);

      res.status(400).json({
        message: "Gagal memperbarui invoice",
        error: error.message
      });

    } finally {
      client.release();
    }
  }
);


app.post(
  "/api/outbound-orders/:id/cancel",
  authenticateToken,
  authorizeRoles("admin_utama", "admin_2", "admin_3"),
  async (req, res) => {

    const orderId = req.params.id;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // ==========================================
      // 1. LOCK OUTBOUND ORDER
      // ==========================================

      const result = await client.query(
        `
        SELECT
          id,
          invoice_number,
          status
        FROM outbound_orders
        WHERE id = $1
        FOR UPDATE;
        `,
        [orderId]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Outbound order tidak ditemukan"
        });
      }

      const order = result.rows[0];

      // ==========================================
      // 2. SHIPPED TIDAK BOLEH DIBATALKAN
      // ==========================================

      if (order.status === "SHIPPED") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Invoice yang sudah SHIPPED tidak dapat dibatalkan"
        });
      }

      // ==========================================
      // 3. CANCELLED TIDAK BOLEH DIBATALKAN LAGI
      // ==========================================

      if (order.status === "CANCELLED") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Invoice sudah dibatalkan"
        });
      }

      // ==========================================
      // 4. HANYA DRAFT YANG BOLEH DIBATALKAN
      // ==========================================

      if (order.status !== "DRAFT") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: `Invoice dengan status ${order.status} tidak dapat dibatalkan`
        });
      }

      // ==========================================
      // 5. UPDATE STATUS
      // ==========================================

      await client.query(
        `
        UPDATE outbound_orders
        SET
          status = 'CANCELLED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1;
        `,
        [orderId]
      );

      // ==========================================
      // 6. COMMIT
      // ==========================================

      await client.query("COMMIT");

      res.json({
        message: "Invoice berhasil dibatalkan",
        order_id: order.id,
        invoice_number: order.invoice_number,
        status: "CANCELLED",
        cancelled_by: req.user.id
      });

    } catch (error) {

      await client.query("ROLLBACK");

      console.error(error);

      res.status(500).json({
        message: "Gagal membatalkan invoice",
        error: error.message
      });

    } finally {
      client.release();
    }
  }
);

app.post(
  "/api/material-issues",
  authenticateToken,
  authorizeRoles("admin_utama"),
  async (req, res) => {
    const {
      issue_number,
      team_name,
      issue_date,
      purpose,
      notes,
      items
    } = req.body;

    if (
      !issue_number ||
      !team_name ||
      !issue_date ||
      !purpose ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Data material issue dan minimal satu barang wajib diisi"
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Cek nomor Material Issue
      const existingIssue = await client.query(
        `
        SELECT id
        FROM material_issues
        WHERE issue_number = $1;
        `,
        [issue_number]
      );

      if (existingIssue.rows.length > 0) {
        throw new Error("Nomor material issue sudah digunakan");
      }

      // 2. Validasi semua item
      for (const item of items) {
        const quantity = Number(item.quantity);

        if (
          !item.product_id ||
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          throw new Error("Data item barang tidak valid");
        }

        // Lock product agar transaksi stok yang bersamaan
        // tidak bisa melewati pengecekan stok secara bersamaan
        const productResult = await client.query(
          `
          SELECT
            p.id,
            p.code,
            p.name,
            c.name AS category
          FROM products p
          JOIN categories c
            ON c.id = p.category_id
          WHERE p.id = $1
          FOR UPDATE;
          `,
          [item.product_id]
        );

        if (productResult.rows.length === 0) {
          throw new Error(
            `Produk dengan ID ${item.product_id} tidak ditemukan`
          );
        }

        const product = productResult.rows[0];

        // Material Issue hanya untuk bahan mentah
        if (product.category !== "Bahan Mentah") {
          throw new Error(
            `${product.code} bukan kategori Bahan Mentah`
          );
        }

        // Hitung stok langsung dari sumber kebenaran
        const stockResult = await client.query(
          `
          SELECT
            COALESCE(
              SUM(
                CASE
                  WHEN direction = 'IN' THEN quantity
                  WHEN direction = 'OUT' THEN -quantity
                  ELSE 0
                END
              ),
              0
            ) AS current_stock
          FROM stock_transactions
          WHERE product_id = $1;
          `,
          [item.product_id]
        );

        const currentStock = Number(
          stockResult.rows[0].current_stock
        );

        if (quantity > currentStock) {
          throw new Error(
            `Stok ${product.code} tidak mencukupi. ` +
            `Tersedia: ${currentStock}, ` +
            `Diminta: ${quantity}`
          );
        }
      }

      // 3. Buat dokumen Material Issue
      const issueResult = await client.query(
        `
        INSERT INTO material_issues (
          issue_number,
          team_name,
          issue_date,
          purpose,
          notes,
          issued_by,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *;
        `,
        [
          issue_number,
          team_name,
          issue_date,
          purpose,
          notes || null,
          req.user.id
        ]
      );

      const issue = issueResult.rows[0];

      // 4. Buat item + transaksi stok
      for (const item of items) {
        const quantity = Number(item.quantity);

        await client.query(
          `
          INSERT INTO material_issue_items (
            material_issue_id,
            product_id,
            quantity,
            notes
          )
          VALUES ($1, $2, $3, $4);
          `,
          [
            issue.id,
            item.product_id,
            quantity,
            item.notes || null
          ]
        );

        await client.query(
          `
          INSERT INTO stock_transactions (
            product_id,
            direction,
            transaction_type,
            quantity,
            transaction_date,
            destination,
            notes,
            created_by,
            material_issue_id
          )
          VALUES (
            $1,
            'OUT',
            'MATERIAL_ISSUE',
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          );
          `,
          [
            item.product_id,
            quantity,
            issue_date,
            team_name,
            purpose,
            req.user.id,
            issue.id
          ]
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        message: "Material issue berhasil dibuat",
        issue_id: issue.id,
        issue_number: issue.issue_number,
        issued_by: req.user.id
      });

    } catch (error) {
      await client.query("ROLLBACK");

      console.error(error);

      res.status(400).json({
        message: "Gagal membuat material issue",
        error: error.message
      });

    } finally {
      client.release();
    }
  }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});

app.post(
  "/api/outbound-orders",
  authenticateToken,
  authorizeRoles("admin_utama", "admin_2", "admin_3"),
  async (req, res) => {
    const {
      invoice_number,
      customer_name,
      transaction_date,
      destination,
      notes,
      items
    } = req.body;

    if (
      !invoice_number ||
      !customer_name ||
      !transaction_date ||
      !destination ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Data invoice dan minimal satu barang wajib diisi"
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `
        INSERT INTO outbound_orders (
          invoice_number,
          customer_name,
          transaction_date,
          destination,
          notes,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *;
        `,
        [
          invoice_number,
          customer_name,
          transaction_date,
          destination,
          notes || null,
          req.user.id
        ]
      );

      const order = orderResult.rows[0];

      for (const item of items) {
        if (!item.product_id || !item.quantity || Number(item.quantity) <= 0) {
          throw new Error("Data item barang tidak valid");
        }

        await client.query(
          `
          INSERT INTO outbound_order_items (
            outbound_order_id,
            product_id,
            quantity,
            notes
          )
          VALUES ($1, $2, $3, $4);
          `,
          [
            order.id,
            item.product_id,
            item.quantity,
            item.notes || null
          ]
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        message: "Outbound order berhasil dibuat",
        order_id: order.id,
        invoice_number: order.invoice_number,
        created_by: req.user.id
      });

    } catch (error) {
      await client.query("ROLLBACK");

      console.error(error);

      res.status(500).json({
        message: "Gagal membuat outbound order",
        error: error.message
      });

    } finally {
      client.release();
    }
  }
);