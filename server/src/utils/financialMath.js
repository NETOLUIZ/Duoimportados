/**
 * Financial Calculation Module
 * STRICT ADHERENCE TO RULE #11:
 * - NO floating point operations for monetary accumulation.
 * - All calculations operate on integer cents (R$ 1,00 = 100 cents).
 * - Exact remainder cents allocation across installments.
 */

/**
 * Converts input (string, number) to exact integer cents
 * Example: "150.50" -> 15050, 150.5 -> 15050
 */
function parseToCents(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    return Math.round(val * 100);
  }
  const cleanStr = String(val).replace('R$', '').replace(/\s/g, '').trim();
  if (cleanStr.includes(',')) {
    // Brazilian format "1.250,50" -> "1250.50"
    const normalized = cleanStr.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : Math.round(num * 100);
  }
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

/**
 * Converts integer cents to string decimal "150.50" for DB NUMERIC storage
 */
function centsToDecimalString(cents) {
  const safeCents = Math.round(Number(cents) || 0);
  const dollars = (safeCents / 100).toFixed(2);
  return dollars;
}

/**
 * Formats cents or decimal string to Brazilian currency string "R$ 150,50"
 */
function formatBRL(val) {
  let cents = 0;
  if (typeof val === 'number') {
    cents = val;
  } else if (typeof val === 'string') {
    cents = parseToCents(val);
  }
  const decimalVal = cents / 100;
  return decimalVal.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Calculates interest value in cents
 * @param {number} productValueCents 
 * @param {number} interestRateOrValue - If isPercentage is true, it's % (e.g. 10 = 10%). Else it's fixed cents/amount.
 * @param {boolean} isPercentage 
 */
function calculateInterestCents(productValueCents, interestRateOrValue, isPercentage = true) {
  if (!interestRateOrValue || interestRateOrValue <= 0) return 0;
  if (isPercentage) {
    const rate = Number(interestRateOrValue);
    return Math.round((productValueCents * rate) / 100);
  }
  return parseToCents(interestRateOrValue);
}

/**
 * Formats YYYY-MM-DD string to Date object at UTC midnight
 */
function parseLocalDate(dateStr) {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
  }
  return new Date(dateStr);
}

/**
 * Formats Date object to YYYY-MM-DD
 */
function formatDateToISO(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds days or months according to frequency
 * @param {Date} startDate 
 * @param {number} installmentIndex - 0-indexed (0 is first installment)
 * @param {string} frequency - 'DIARIA', 'QUINZENAL', 'MENSAL'
 */
function calculateDueDate(startDate, installmentIndex, frequency) {
  const date = new Date(startDate.getTime());
  
  if (frequency === 'DIARIA') {
    date.setUTCDate(date.getUTCDate() + installmentIndex);
  } else if (frequency === 'QUINZENAL') {
    date.setUTCDate(date.getUTCDate() + (installmentIndex * 15));
  } else if (frequency === 'MENSAL') {
    const originalDay = date.getUTCDate();
    date.setUTCMonth(date.getUTCMonth() + installmentIndex);
    // Handle month overflow (e.g. Jan 31 -> Feb 28)
    if (date.getUTCDate() !== originalDay) {
      date.setUTCDate(0); // Last day of previous month
    }
  }
  return formatDateToISO(date);
}

/**
 * Calculates daily overdue fee / late fee in cents
 * @param {number} installmentAmountCents 
 * @param {string} dueDateStr - YYYY-MM-DD
 * @param {string} currentDateStr - YYYY-MM-DD
 * @param {number} lateFeePercentPerDay - e.g. 1.0 = 1% per day
 */
function calculateDailyLateFee(installmentAmountCents, dueDateStr, currentDateStr, lateFeePercentPerDay = 1.0) {
  if (!dueDateStr || !currentDateStr) {
    return { daysLate: 0, lateFeeCents: 0, updatedTotalCents: installmentAmountCents };
  }

  const due = parseLocalDate(dueDateStr);
  const current = parseLocalDate(currentDateStr);

  const diffTime = current.getTime() - due.getTime();
  const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  if (daysLate <= 0 || !lateFeePercentPerDay || lateFeePercentPerDay <= 0) {
    return { daysLate: 0, lateFeeCents: 0, updatedTotalCents: installmentAmountCents };
  }

  const rate = Number(lateFeePercentPerDay);
  const lateFeeCents = Math.round(installmentAmountCents * (rate / 100) * daysLate);
  const updatedTotalCents = installmentAmountCents + lateFeeCents;

  return {
    daysLate,
    lateFeeCents,
    updatedTotalCents
  };
}

/**
 * Splits total sale into N installments, cleanly allocating remainder cents.
 * Guaranteed: sum(installment.amount_cents) === totalValueCents
 */
function splitInstallments(totalValueCents, count, firstDueDateStr, frequency) {
  if (count <= 0) throw new Error('Quantidade de parcelas deve ser maior que zero');
  
  const baseAmountCents = Math.floor(totalValueCents / count);
  let remainderCents = totalValueCents - (baseAmountCents * count);
  
  const startDate = parseLocalDate(firstDueDateStr);
  const installments = [];
  
  for (let i = 0; i < count; i++) {
    let installmentCents = baseAmountCents;
    if (remainderCents > 0) {
      installmentCents += 1;
      remainderCents -= 1;
    }
    
    const dueDate = calculateDueDate(startDate, i, frequency);
    
    installments.push({
      installment_number: i + 1,
      amount_cents: installmentCents,
      amount_decimal: centsToDecimalString(installmentCents),
      due_date: dueDate,
      status: 'PENDENTE'
    });
  }
  
  return installments;
}

module.exports = {
  parseToCents,
  centsToDecimalString,
  formatBRL,
  calculateInterestCents,
  calculateDueDate,
  calculateDailyLateFee,
  splitInstallments,
  formatDateToISO,
  parseLocalDate
};
