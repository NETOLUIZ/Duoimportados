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

async function query(sql, params = [], sessionContext = null) {
  if (isPgConnected && pool) {
    let client = null;
    try {
      let paramIndex = 1;
      let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      const trimmedUpper = pgSql.trim().toUpperCase();
      if (trimmedUpper.startsWith('INSERT INTO') && !trimmedUpper.includes('RETURNING')) {
        pgSql += ' RETURNING id';
      }

      if (sessionContext && (sessionContext.ownerId || sessionContext.role)) {
        client = await pool.connect();
        await client.query('BEGIN');
        if (sessionContext.ownerId) {
          await client.query(`SET LOCAL app.current_owner_id = '${sessionContext.ownerId}'`);
        }
        if (sessionContext.role) {
          await client.query(`SET LOCAL app.current_user_role = '${sessionContext.role}'`);
        }
        const res = await client.query(pgSql, params);
        await client.query('COMMIT');
        client.release();
        return res.rows;
      } else {
        const res = await pool.query(pgSql, params);
        return res.rows;
      }
    } catch (err) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
      }
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

async function queryOne(sql, params = [], sessionContext = null) {
  const rows = await query(sql, params, sessionContext);
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
      subdomain VARCHAR(150),
      created_at TIMESTAMP DEFAULT ${timestampDefault}
    )
  `);

  // Migration: add subdomain & owner_id to pre-existing users tables that predate these columns
  try {
    await query(`ALTER TABLE users ADD COLUMN subdomain VARCHAR(150)`);
  } catch (err) {
    // Column already exists — safe to ignore
  }

  try {
    await query(`ALTER TABLE users ADD COLUMN owner_id INT`);
  } catch (err) {
    // Column already exists — safe to ignore
  }

  try {
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_subdomain ON users(subdomain)`);
  } catch (err) {
    // Index already exists — safe to ignore
  }

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
      referred_by VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migration: add referred_by to pre-existing customers tables that predate this column
  try {
    await query(`ALTER TABLE customers ADD COLUMN referred_by VARCHAR(255)`);
  } catch (err) {
    // Column already exists — safe to ignore (Postgres: 42701, SQLite: "duplicate column name")
  }

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
      interest_percent ${numericType} DEFAULT 0.00,
      total_value ${numericType} NOT NULL,
      payment_mode VARCHAR(50) NOT NULL,
      installment_count INT NOT NULL,
      first_due_date DATE NOT NULL,
      late_fee_percent_per_day ${numericType} DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // Migration: add interest_percent to pre-existing sales tables that predate this column
  try {
    await query(`ALTER TABLE sales ADD COLUMN interest_percent ${numericType} DEFAULT 0.00`);
  } catch (err) {
    // Column already exists — safe to ignore
  }

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
      payment_type VARCHAR(20) NOT NULL DEFAULT 'FULL',
      registered_by_user_id INT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (installment_id) REFERENCES installments(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // Migration: add payment_type to pre-existing payments tables that predate this column
  try {
    await query(`ALTER TABLE payments ADD COLUMN payment_type VARCHAR(20) NOT NULL DEFAULT 'FULL'`);
  } catch (err) {
    // Column already exists — safe to ignore
  }

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
      expense_type VARCHAR(20) NOT NULL DEFAULT 'VARIAVEL',
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migration: add expense_type to pre-existing expenses tables that predate this column
  try {
    await query(`ALTER TABLE expenses ADD COLUMN expense_type VARCHAR(20) NOT NULL DEFAULT 'VARIAVEL'`);
  } catch (err) {
    // Column already exists — safe to ignore
  }

  // 9. Referrers table (people who refer customers, with a commission rule)
  await query(`
    CREATE TABLE IF NOT EXISTS referrers (
      id ${idType},
      owner_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      commission_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
      commission_value ${numericType} NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 10. Referral Payments table (monthly commission payouts, one per referrer per period)
  await query(`
    CREATE TABLE IF NOT EXISTS referral_payments (
      id ${idType},
      owner_id INT NOT NULL,
      referrer_id INT NOT NULL,
      period VARCHAR(7) NOT NULL,
      base_amount ${numericType} NOT NULL DEFAULT 0,
      amount_paid ${numericType} NOT NULL,
      expense_id INT,
      paid_at TIMESTAMP DEFAULT ${timestampDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referrer_id) REFERENCES referrers(id) ON DELETE CASCADE,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL,
      UNIQUE (referrer_id, period)
    )
  `);

  // 10. Audit Logs table
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id ${idType},
      owner_id INT NOT NULL,
      user_id INT,
      user_name VARCHAR(255) NOT NULL,
      action VARCHAR(100) NOT NULL,
      details TEXT,
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT ${timestampDefault}
    )
  `);

  await setupPostgresRLS();
  await seedInitialData();
}

async function setupPostgresRLS() {
  if (!isPgConnected) return;

  console.log('[DB RLS] Initializing PostgreSQL Row-Level Security (RLS)...');
  const rlsTables = [
    'customers',
    'products',
    'sales',
    'installments',
    'payments',
    'expense_categories',
    'expenses',
    'referrers',
    'referral_payments'
  ];

  // IMPORTANT: no route in this codebase currently sets a sessionContext when
  // calling query()/queryOne(), so app.current_user_role/current_owner_id are
  // NEVER set today — the USING clause below is written so an unset role
  // means "allow" (tenant isolation still comes from each route's own
  // WHERE owner_id = ? clause). That makes RLS a safety net with zero
  // benefit yet, so it must NEVER be the thing that silently hides data:
  // if ENABLE/FORCE succeed but CREATE POLICY fails, Postgres leaves the
  // table forced with no policy at all, which means "deny every row to
  // everyone" — silently, with no application-level error. If that happens
  // we immediately disable RLS again on that table rather than leave it
  // in a broken, data-hiding state.
  async function applyTenantPolicy(table, ownerColumn) {
    try {
      await query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      await query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
      await query(`DROP POLICY IF EXISTS ${table}_tenant_policy ON ${table};`);
      await query(`
        CREATE POLICY ${table}_tenant_policy ON ${table}
        FOR ALL
        USING (
          NULLIF(current_setting('app.current_user_role', true), '') IS NULL
          OR current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
          OR ${ownerColumn} = NULLIF(current_setting('app.current_owner_id', true), '')::INT
        );
      `);
    } catch (err) {
      console.error(`[DB RLS ERROR] Failed to set up policy for "${table}" — disabling RLS on it so it does not silently hide data:`, err.message);
      try {
        await query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY;`);
        await query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
      } catch (rollbackErr) {
        console.error(`[DB RLS ERROR] Could not roll back RLS on "${table}" — check this table manually (SELECT rowsecurity, forcerowsecurity FROM pg_tables WHERE tablename = '${table}'):`, rollbackErr.message);
      }
    }
  }

  for (const table of rlsTables) {
    await applyTenantPolicy(table, 'owner_id');
  }
  await applyTenantPolicy('users', 'id');

  console.log('[DB RLS] Row-Level Security (RLS) setup complete.');
}

async function seedInitialData() {
  const existingSuperAdmin = await query("SELECT * FROM users WHERE role = 'SUPER_ADMIN'");

  if (existingSuperAdmin.length === 0) {
    console.log('[DB] Seeding production Super Admin account...');
    const defaultPasswordHash = await bcrypt.hash('DuoAdmin#2026', 10);

    await query(
      `INSERT INTO users (name, phone, password_hash, role, status) VALUES (?, ?, ?, 'SUPER_ADMIN', 'ACTIVE')`,
      ['Super Admin', '85921450140', defaultPasswordHash]
    );
    console.log('[DB] Production Super Admin account created!');
  }
}

// NOT called automatically — it used to run on every server startup and was
// wiping all real customer/sales/expense data on every restart/deploy/crash
// recovery. Left here only for a deliberate, manual one-off reset if ever
// needed; never wire this back into initDatabase().
async function clearDemoData() {
  console.log('[DB] Cleaning all demo data...');
  try {
    await query('DELETE FROM referral_payments');
    await query('DELETE FROM referrers');
    await query('DELETE FROM expenses');
    await query('DELETE FROM expense_categories');
    await query('DELETE FROM payments');
    await query('DELETE FROM installments');
    await query('DELETE FROM sales');
    await query('DELETE FROM products');
    await query('DELETE FROM customers');
    await query("DELETE FROM users WHERE role != 'SUPER_ADMIN'");
    
    // Ensure Super Admin exists
    const superAdmin = await queryOne("SELECT * FROM users WHERE role = 'SUPER_ADMIN'");
    if (!superAdmin) {
      await seedInitialData();
    } else {
      const defaultPasswordHash = await bcrypt.hash('DuoAdmin#2026', 10);
      await query("UPDATE users SET phone = ?, password_hash = ? WHERE id = ?", ['85921450140', defaultPasswordHash, superAdmin.id]);
    }
    console.log('[DB] All demo data removed successfully!');
  } catch (err) {
    console.error('[DB Error] Error cleaning demo data:', err);
  }
}

module.exports = {
  query,
  queryOne,
  initDatabase,
  isPgConnected
};
