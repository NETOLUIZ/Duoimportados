const { Pool } = require('pg');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbConfig = {
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'controlevendas'}`
};

let pool = null;
try {
  pool = new Pool(dbConfig);
} catch (e) {
  console.warn('[DB Warning] PostgreSQL pool initialization fallback.');
}

let isPgConnected = false;
let sqliteDb = null;
const dbFilePath = path.join(__dirname, '../data.db');

function saveDbToDisk() {
  if (sqliteDb && !isPgConnected) {
    try {
      const data = sqliteDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbFilePath, buffer);
    } catch (e) {
      console.error('[DB Error] Failed to save SQLite db to disk:', e);
    }
  }
}

async function query(sql, params = []) {
  if (isPgConnected && pool) {
    try {
      let paramIndex = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      const res = await pool.query(pgSql, params);
      return res.rows;
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.message.includes('connect')) {
        console.warn('[DB] PostgreSQL connection refused, falling back to SQLite file DB.');
        isPgConnected = false;
        return querySqlite(sql, params);
      }
      throw err;
    }
  }
  return querySqlite(sql, params);
}

function querySqlite(sql, params = []) {
  if (!sqliteDb) {
    throw new Error('SQLite database not initialized.');
  }

  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();
  const cleanSql = trimmed.replace(/RETURNING\s+id/i, '');
  const safeParams = params.map(p => (p === undefined ? null : p));

  if (upper.startsWith('SELECT') || upper.startsWith('WITH')) {
    const stmt = sqliteDb.prepare(cleanSql);
    if (safeParams && safeParams.length > 0) {
      stmt.bind(safeParams);
    }
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } else {
    sqliteDb.run(cleanSql, safeParams);
    const idResult = sqliteDb.exec('SELECT last_insert_rowid() as id');
    const lastId = idResult[0]?.values[0]?.[0] || 1;
    saveDbToDisk(); // Save immediately to disk so data is never lost!

    return [{ id: lastId }];
  }
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function initDatabase() {
  console.log('[DB] Checking PostgreSQL connection...');
  try {
    if (pool) {
      const testRes = await pool.query('SELECT NOW()');
      console.log('[DB] PostgreSQL connected successfully at', testRes.rows[0].now);
      isPgConnected = true;
    }
  } catch (err) {
    console.warn('[DB] PostgreSQL server not running locally. Using SQLite persistent database (data.db).');
    isPgConnected = false;
  }

  if (!isPgConnected) {
    const SQL = await initSqlJs();
    if (fs.existsSync(dbFilePath)) {
      const filebuffer = fs.readFileSync(dbFilePath);
      sqliteDb = new SQL.Database(filebuffer);
      console.log('[DB] Persistent SQLite database loaded from disk (data.db).');
    } else {
      sqliteDb = new SQL.Database();
      console.log('[DB] New SQLite database created.');
    }
  }

  const numericType = isPgConnected ? 'NUMERIC(12,2)' : 'DECIMAL(12,2)';
  const idType = isPgConnected ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const timestampDefault = 'CURRENT_TIMESTAMP';

  // 1. Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id ${idType},
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'SELLER',
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT ${timestampDefault}
    )
  `);

  // 2. Customers table
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id ${idType},
      owner_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      cep VARCHAR(20),
      address VARCHAR(255),
      number VARCHAR(50),
      complement VARCHAR(255),
      neighborhood VARCHAR(100),
      city VARCHAR(100),
      state VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 3. Products table
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id ${idType},
      owner_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      cost_price ${numericType} DEFAULT 0.00,
      sale_price ${numericType} DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 4. Sales table
  await query(`
    CREATE TABLE IF NOT EXISTS sales (
      id ${idType},
      owner_id INT NOT NULL,
      customer_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      sale_date DATE NOT NULL,
      product_value ${numericType} NOT NULL,
      interest_value ${numericType} DEFAULT 0.00,
      total_value ${numericType} NOT NULL,
      payment_mode VARCHAR(50) NOT NULL,
      installment_count INT NOT NULL,
      first_due_date DATE NOT NULL,
      late_fee_percent_per_day ${numericType} DEFAULT 1.00,
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // 5. Installments table
  await query(`
    CREATE TABLE IF NOT EXISTS installments (
      id ${idType},
      owner_id INT NOT NULL,
      sale_id INT NOT NULL,
      customer_id INT NOT NULL,
      installment_number INT NOT NULL,
      amount ${numericType} NOT NULL,
      due_date DATE NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
      amount_paid ${numericType} DEFAULT 0.00,
      paid_at DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // 6. Payments table
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id ${idType},
      owner_id INT NOT NULL,
      installment_id INT NOT NULL,
      customer_id INT NOT NULL,
      amount_paid ${numericType} NOT NULL,
      payment_date DATE NOT NULL,
      registered_by_user_id INT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (installment_id) REFERENCES installments(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // 7. Expense Categories table
  await query(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id ${idType},
      owner_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 8. Expenses table
  await query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id ${idType},
      owner_id INT NOT NULL,
      category_name VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      amount ${numericType} NOT NULL,
      expense_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await seedInitialData();
}

async function seedInitialData() {
  const existingUsers = await query('SELECT COUNT(*) as count FROM users');
  const count = parseInt(existingUsers[0]?.count || 0);

  if (count === 0) {
    console.log('[DB] Seeding default accounts (Super Admin + 3 Sellers)...');
    const defaultPasswordHash = await bcrypt.hash('123456', 10);

    // 1. Super Admin
    await query(
      `INSERT INTO users (name, phone, password_hash, role, status) VALUES (?, ?, ?, 'SUPER_ADMIN', 'ACTIVE')`,
      ['Super Admin', '11999990000', defaultPasswordHash]
    );

    // 2. Sellers (Vendedor A, Vendedor B, Vendedor C)
    const sA = await query(
      `INSERT INTO users (name, phone, password_hash, role, status) VALUES (?, ?, ?, 'SELLER', 'ACTIVE')`,
      ['Vendedor A', '11988881111', defaultPasswordHash]
    );
    const sB = await query(
      `INSERT INTO users (name, phone, password_hash, role, status) VALUES (?, ?, ?, 'SELLER', 'ACTIVE')`,
      ['Vendedor B', '11988882222', defaultPasswordHash]
    );
    await query(
      `INSERT INTO users (name, phone, password_hash, role, status) VALUES (?, ?, ?, 'SELLER', 'ACTIVE')`,
      ['Vendedor C', '11988883333', defaultPasswordHash]
    );

    const sellerAId = sA[0]?.id || 2;
    const sellerBId = sB[0]?.id || 3;

    // Seed Categories
    const categories = ['Compra de mercadoria', 'Combustível', 'Internet', 'Embalagem', 'Transporte', 'Aluguel'];
    for (const cat of categories) {
      await query(`INSERT INTO expense_categories (owner_id, name) VALUES (?, ?)`, [sellerAId, cat]);
      await query(`INSERT INTO expense_categories (owner_id, name) VALUES (?, ?)`, [sellerBId, cat]);
    }

    // Seed Demo Customers for Seller A
    const c1 = await query(
      `INSERT INTO customers (owner_id, name, phone, city, state, neighborhood, address, number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sellerAId, 'Carlos Eduardo Silva', '11977771010', 'São Paulo', 'SP', 'Centro', 'Rua das Flores', '123']
    );
    const c2 = await query(
      `INSERT INTO customers (owner_id, name, phone, city, state, neighborhood, address, number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sellerAId, 'Mariana Oliveira', '11977772020', 'Guarulhos', 'SP', 'Vila Nova', 'Av. Brasil', '450']
    );
    const c3 = await query(
      `INSERT INTO customers (owner_id, name, phone, city, state, neighborhood, address, number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sellerAId, 'Roberto Santos', '11977773030', 'Osasco', 'SP', 'Jardim das Rosas', 'Rua Bela Vista', '88']
    );

    const c1Id = c1[0]?.id || 1;
    const c2Id = c2[0]?.id || 2;
    const c3Id = c3[0]?.id || 3;

    const dateStr = new Date().toISOString().split('T')[0];

    // Seed Sale & Installments for Seller A
    const sale1 = await query(
      `INSERT INTO sales (owner_id, customer_id, product_name, sale_date, product_value, interest_value, total_value, payment_mode, installment_count, first_due_date, late_fee_percent_per_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sellerAId, c1Id, 'iPhone 15 Pro Max 256GB', dateStr, '7500.00', '500.00', '8000.00', 'MENSAL', 4, '2026-07-10', '1.00']
    );
    const s1Id = sale1[0]?.id || 1;

    // Installments
    await query(
      `INSERT INTO installments (owner_id, sale_id, customer_id, installment_number, amount, due_date, status, amount_paid, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sellerAId, s1Id, c1Id, 1, '2000.00', '2026-07-10', 'PAGA', '2000.00', '2026-07-10']
    );
    await query(
      `INSERT INTO installments (owner_id, sale_id, customer_id, installment_number, amount, due_date, status, amount_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sellerAId, s1Id, c1Id, 2, '2000.00', '2026-08-10', 'ATRASADA', '0.00']
    );
    await query(
      `INSERT INTO installments (owner_id, sale_id, customer_id, installment_number, amount, due_date, status, amount_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sellerAId, s1Id, c1Id, 3, '2000.00', '2026-09-10', 'PENDENTE', '0.00']
    );
    await query(
      `INSERT INTO installments (owner_id, sale_id, customer_id, installment_number, amount, due_date, status, amount_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sellerAId, s1Id, c1Id, 4, '2000.00', '2026-10-10', 'PENDENTE', '0.00']
    );

    // Payment for P1
    await query(
      `INSERT INTO payments (owner_id, installment_id, customer_id, amount_paid, payment_date, registered_by_user_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sellerAId, 1, c1Id, '2000.00', '2026-07-10', sellerAId, 'Pagamento via PIX']
    );

    // Expenses for Seller A
    await query(
      `INSERT INTO expenses (owner_id, category_name, name, amount, expense_date, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [sellerAId, 'Compra de mercadoria', 'Lote de iPhones importados', '4500.00', dateStr, 'Fornecedor Miami']
    );
    await query(
      `INSERT INTO expenses (owner_id, category_name, name, amount, expense_date, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [sellerAId, 'Combustível', 'Gasolina para entregas', '150.00', dateStr, 'Posto Shell']
    );

    console.log('[DB] Persistent seed data initialized!');
  }
}

module.exports = {
  query,
  queryOne,
  initDatabase,
  isPgConnected
};
