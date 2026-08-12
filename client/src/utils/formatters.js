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
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
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
