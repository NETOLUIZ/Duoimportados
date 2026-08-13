import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Calendar, User, AlertCircle, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';

export default function PaymentModal({ isOpen, installment, onClose, onSuccess }) {
  const [paymentDate, setPaymentDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && installment) {
      setError('');
      setIsPaidSuccess(false);
      // Default to today's date
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, installment]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !installment) return null;

  const originalAmount = parseFloat(installment.amount || 0);
  const previousPaid = parseFloat(installment.amount_paid || 0);
  const baseRemaining = Math.max(0, originalAmount - previousPaid);

  // Dynamic Daily Late Fee Calculation based on Selected Payment Date
  const dueDateStr = installment.due_date ? String(installment.due_date).split('T')[0] : '';
  const lateFeeRate = parseFloat(installment.late_fee_percent_per_day || 1.0);

  let daysLate = 0;
  let lateFeeAmount = 0;

  if (dueDateStr && paymentDate && paymentDate > dueDateStr) {
    const due = new Date(dueDateStr + 'T00:00:00');
    const pay = new Date(paymentDate + 'T00:00:00');
    const diffMs = pay.getTime() - due.getTime();
    daysLate = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    if (daysLate > 0) {
      lateFeeAmount = (baseRemaining * (lateFeeRate / 100)) * daysLate;
    }
  }

  const finalTotalToPay = baseRemaining + lateFeeAmount;

  const handleConfirmPayment = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!paymentDate) {
      setError('Por favor, escolha uma data no calendário.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/installments/${installment.id}/payment`, {
        amount_paid: finalTotalToPay.toFixed(2),
        payment_date: paymentDate,
        notes: daysLate > 0
          ? `Pagamento com ${daysLate} dias de atraso (+ ${lateFeeRate}%/dia: + ${formatBRL(lateFeeAmount)})`
          : 'Pagamento confirmado via calendário'
      });

      setIsPaidSuccess(true);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className={`bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full border transition-colors duration-300 flex flex-col max-h-[92vh] sm:max-h-[90vh] ${
        isPaidSuccess ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'
      }`}>
        {/* Header with Customer Name */}
        <div className={`p-6 text-white transition-colors duration-300 flex-shrink-0 rounded-t-3xl ${
          isPaidSuccess ? 'bg-emerald-600' : 'bg-navy-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <User className="w-4 h-4 text-brand-blue" />
              Cliente
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="text-slate-400 hover:text-white w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors -mr-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <h3 id="payment-modal-title" className="text-2xl font-black mt-1 leading-tight">{installment.customer_name}</h3>

          <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center text-xs gap-2">
            <span className="text-slate-300 truncate">{installment.product_name}</span>
            <span className="font-bold text-amber-300 whitespace-nowrap">
              Parc. {installment.installment_number} (Venc: {formatDate(installment.due_date)})
            </span>
          </div>
        </div>

        {/* Body & Calendar Selection */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {isPaidSuccess ? (
            /* GREEN SUCCESS VISUAL FEEDBACK */
            <div className="py-8 text-center space-y-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/40">
                <CheckCircle className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h4 className="text-xl font-black text-emerald-800 dark:text-emerald-300">Pagamento Confirmado!</h4>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Status alterado para Pago em {formatDate(paymentDate)}
              </p>
              {daysLate > 0 && (
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Valor final recebido com juros por atraso: <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatBRL(finalTotalToPay)}</span>
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Calendar Date Picker Input */}
              <div className="space-y-2">
                <label htmlFor="payment-date" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand-blue" />
                    Data do Pagamento:
                  </span>
                  {daysLate > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-500/30">
                      <AlertTriangle className="w-3 h-3" /> {daysLate} dias de atraso
                    </span>
                  )}
                </label>
                <input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-brand-blue/40 dark:border-brand-blue/50 text-slate-900 dark:text-slate-100 text-base font-bold rounded-2xl p-3.5 min-h-[52px] text-center focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all shadow-sm"
                />
              </div>

              {/* Installment Summary & Dynamic Late Fee Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Valor Original da Parcela:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formatBRL(baseRemaining)}</span>
                </div>

                {daysLate > 0 && (
                  <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-semibold text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Juros por {daysLate} dias ({lateFeeRate}%/dia):
                    </span>
                    <span className="font-bold">+ {formatBRL(lateFeeAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-base pt-2 border-t border-slate-300 dark:border-slate-600 font-black">
                  <span className="text-slate-800 dark:text-slate-100">Total a Pagar:</span>
                  <span className={daysLate > 0 ? 'text-rose-600 dark:text-rose-400 text-lg' : 'text-emerald-600 dark:text-emerald-400 text-lg'}>
                    {formatBRL(finalTotalToPay)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Big Green Confirm Button (sticky footer) */}
        {!isPaidSuccess && (
          <div className="flex-shrink-0 p-6 pt-0 pb-safe">
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={submitting}
              className="w-full py-4 px-6 min-h-[52px] rounded-2xl bg-brand-green hover:bg-brand-greenHover active:bg-emerald-800 text-white font-black text-base shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50"
            >
              <CheckCircle className="w-6 h-6 stroke-[2.5]" />
              <span>
                {submitting
                  ? 'CONFIRMANDO...'
                  : `MARCAR COMO PAGO (${formatBRL(finalTotalToPay)})`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
