const express = require('express');
const router = express.Router();
const { query } = require('../database');
const { verifyAuth } = require('../middleware/authMiddleware');

router.use(verifyAuth);

// GET /api/audit-logs - List audit log entries for store owner
router.get('/', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const { search, limit = 100 } = req.query;

    let sql = `SELECT id, owner_id, user_id, user_name, action, details, ip_address, CAST(created_at AS TEXT) as created_at 
               FROM audit_logs 
               WHERE owner_id = ?`;
    const params = [ownerId];

    if (search && search.trim().length > 0) {
      sql += ` AND (LOWER(user_name) LIKE ? OR LOWER(action) LIKE ? OR LOWER(details) LIKE ?)`;
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(limit, 10) || 100);

    const logs = await query(sql, params);

    // Format details JSON safely if possible
    const formattedLogs = logs.map((item) => {
      let parsedDetails = item.details;
      try {
        parsedDetails = JSON.parse(item.details);
      } catch (e) {}
      return {
        ...item,
        details: parsedDetails
      };
    });

    return res.json(formattedLogs);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return res.status(500).json({ error: 'Erro ao carregar histórico de auditoria.' });
  }
});

module.exports = router;
