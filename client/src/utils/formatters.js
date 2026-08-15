/**
 * Formats monetary amounts to BRL currency string "R$ 1.250,50"
 */
export function formatBRL(val) {
  const num = typeof val === 'string' ? parseFloat(val) : Number(val || 0);
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formats YYYY-MM-DD or ISO string to DD/MM/YYYY
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const cleanStr = String(dateStr).split('T')[0].split(' ')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Formats a timestamp (date + time) to Brazil local time "DD/MM/YYYY HH:mm:ss".
 * The server stores created_at in UTC with no timezone marker (Postgres is set
 * to UTC), so a naive string like "2026-08-15 22:17:39" gets displayed raw and
 * ends up 3h ahead of the user's actual local time. This forces UTC parsing
 * (appending "Z" when the string carries no offset) before converting.
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const isoStr = String(dateStr).trim().replace(' ', 'T');
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(isoStr);
  const date = new Date(hasZone ? isoStr : `${isoStr}Z`);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Fortaleza',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Formats phone numbers (11988881111 -> (11) 98888-1111)
 */
export function formatPhone(phone) {
  if (!phone) return '-';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Builds a wa.me link that opens the chat with a specific number directly.
 * Normalizes the stored phone first — if it was saved already including the
 * "55" country code (or a leading trunk "0"), a naive "55" + digits prefix
 * would produce an invalid/duplicated number and WhatsApp falls back to its
 * home screen instead of opening that contact's chat.
 */
export function getWhatsAppLink(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return `https://wa.me/55${digits}`;
}

/**
 * Payment Frequency Label Helper
 */
export function getFrequencyLabel(mode) {
  switch (mode) {
    case 'DIARIA': return 'Diária';
    case 'QUINZENAL': return 'Quinzenal';
    case 'MENSAL': return 'Mensal';
    default: return mode;
  }
}

/**
 * Installment Status Badge Styling Helper
 */
export function getStatusBadge(status) {
  switch (status) {
    case 'PAGA':
      return { label: 'Paga', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' };
    case 'ATRASADA':
      return { label: 'Atrasada', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-500' };
    case 'VENCENDO':
      return { label: 'Vencendo em breve', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' };
    case 'PENDENTE':
    default:
      return { label: 'Pendente', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' };
  }
}
