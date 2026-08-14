const { query } = require('../database');

/**
 * Log an audit event in the system
 * @param {Object} req - Express request object
 * @param {string} action - Action name (e.g. VENDA_CRIADA, PAGAMENTO_REGISTRADO)
 * @param {Object|string} details - Additional event details
 */
async function logAudit(req, action, details = {}) {
  try {
    const ownerId = req.ownerId || req.user?.ownerId || req.user?.userId;
    if (!ownerId) return;

    const userId = req.user?.userId || null;
    const userName = req.user?.name || req.user?.phone || 'Sistema';
    const ipAddress = req.headers['x-forwarded-for'] || req.ip || null;

    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);

    await query(
      `INSERT INTO audit_logs (owner_id, user_id, user_name, action, details, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ownerId, userId, userName, action, detailsStr, ipAddress]
    );
  } catch (err) {
    console.error('[AuditLogger Error]:', err);
  }
}

module.exports = {
  logAudit
};
