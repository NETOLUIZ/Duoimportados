/**
 * Security Audit Logger
 * Logs critical security events (login, logout, failed auth, tenant actions)
 * ABSOLUTE RULE: Never log raw passwords, hashes, JWT secrets, or tokens.
 */
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const auditLogFile = path.join(logDir, 'audit.log');

function logSecurityEvent(event, details = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedDetails = { ...details };
  
  // Ensure no password or token fields are ever recorded
  delete sanitizedDetails.password;
  delete sanitizedDetails.password_hash;
  delete sanitizedDetails.token;
  delete sanitizedDetails.authorization;
  delete sanitizedDetails.cookie;

  const logEntry = JSON.stringify({
    timestamp,
    event,
    ...sanitizedDetails
  }) + '\n';

  try {
    fs.appendFileSync(auditLogFile, logEntry);
  } catch (err) {
    console.error('[Audit Logger Error] Failed to write audit log:', err);
  }

  // Console output in dev/demo mode
  console.log(`[AUDIT LOG ${timestamp}] ${event}:`, JSON.stringify(sanitizedDetails));
}

module.exports = {
  logSecurityEvent
};
