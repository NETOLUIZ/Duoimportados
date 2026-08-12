import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Calendar, User, DollarSign, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
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

      // Visual feedback: Turns Green 🟢!
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border transition-all duration-300 my-8 ${
        isPaidSuccess ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-slate-200'
      }`}>
        {/* Header with Customer Name */}
        <div className={`p-6 text-white transition-colors duration-300 ${
          isPaidSuccess ? 'bg-emerald-600' : 'bg-navy-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <User className="w-4 h-4 text-brand-blue" />
              Cliente
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <h3 className="text-2xl font-black mt-1 leading-tight">{installment.customer_name}</h3>
          
          <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center text-xs">
            <span className="text-slate-300">{installment.product_name}</span>
            <span className="font-bold text-amber-300">
              Parc. {installment.installment_number} (Venc: {formatDate(installment.due_date)})
            </span>
          </div>
        </div>

        {/* Body & Calendar Selection */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isPaidSuccess ? (
            /* GREEN SUCCESS VISUAL FEEDBACK */
            <div className="py-8 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/40">
                <CheckCircle className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h4 className="text-xl font-black text-emerald-800">Pagamento Confirmado!</h4>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                Status alterado para PAGO 🟢 em {formatDate(paymentDate)}
              </p>
              {daysLate > 0 && (
                <p className="text-xs font-semibold text-slate-600">
                  Valor final recebido com juros por atraso: <span className="font-bold text-emerald-700">{formatBRL(finalTotalToPay)}</span>
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Calendar Date Picker Input */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand-blue" />
                    Data do Pagamento:
                  </span>
                  {daysLate > 0 && (
                    <span className="text-[11px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                      🔴 {daysLate} dias de atraso
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border-2 border-brand-blue/40 text-slate-900 text-base font-bold rounded-2xl p-3.5 text-center focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white focus:outline-none transition-all shadow-sm"
                />
              </div>

              {/* Installment Summary & Dynamic Late Fee Breakdown */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Valor Original da Parcela:</span>
                  <span className="font-bold text-slate-800">{formatBRL(baseRemaining)}</span>
                </div>

                {daysLate > 0 && (
                  <div className="flex justify-between items-center text-rose-600 font-semibold text-xs pt-1 border-t border-slate-200">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Juros por {daysLate} dias ({lateFeeRate}%/dia):
                    </span>
                    <span className="font-bold">+ {formatBRL(lateFeeAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-base pt-2 border-t border-slate-300 font-black">
                  <span className="text-slate-800">Total a Pagar:</span>
                  <span className={daysLate > 0 ? 'text-rose-600 text-lg' : 'text-emerald-600 text-lg'}>
                    {formatBRL(finalTotalToPay)}
                  </span>
                </div>
              </div>

              {/* Big Green Confirm Button */}
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={submitting}
                className="w-full py-4 px-6 rounded-2xl bg-brand-green hover:bg-brand-greenHover active:bg-emerald-800 text-white font-black text-base shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50"
              >
                <CheckCircle className="w-6 h-6 stroke-[2.5]" />
                <span>
                  {submitting 
                    ? 'CONFIRMANDO...' 
                    : `✓ MARCAR COMO PAGO (${formatBRL(finalTotalToPay)}) 🟢`}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
