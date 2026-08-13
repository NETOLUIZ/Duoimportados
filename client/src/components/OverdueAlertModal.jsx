import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, Phone, Calendar, ArrowRight } from 'lucide-react';
import { formatBRL, formatDate } from '../utils/formatters';

const MAX_PREVIEW_ITEMS = 4;

export default function OverdueAlertModal({ isOpen, items, totalValue, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const extraCount = Math.max(0, items.length - MAX_PREVIEW_ITEMS);

  const handleViewAll = () => {
    onClose();
    navigate('/');
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/70 dark:bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="overdue-alert-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full border-2 border-rose-400 dark:border-rose-500/50 flex flex-col max-h-[90vh] animate-fadeIn">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-rose-600 text-white flex-shrink-0 rounded-t-3xl relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10"></div>
          <div className="flex items-start justify-between relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <h3 id="overdue-alert-title" className="text-lg font-black leading-tight">
                  {items.length} parcela{items.length > 1 ? 's' : ''} em atraso
                </h3>
                <p className="text-xs text-rose-100 font-semibold mt-0.5">
                  Total pendente: {formatBRL(totalValue)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar aviso"
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-white/15 transition-colors -mt-1 -mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List preview */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {items.slice(0, MAX_PREVIEW_ITEMS).map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{item.customer_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.product_name} &middot; Parcela {item.installment_number}</p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {formatDate(item.due_date)}
                  </span>
                  {item.customer_phone && (
                    <a
                      href={`https://wa.me/55${item.customer_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" /> Chamar
                    </a>
                  )}
                </div>
              </div>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400 flex-shrink-0">
                {formatBRL(item.amount)}
              </span>
            </div>
          ))}

          {extraCount > 0 && (
            <div className="p-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              + {extraCount} outra{extraCount > 1 ? 's' : ''} parcela{extraCount > 1 ? 's' : ''} em atraso
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 pb-safe flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleViewAll}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2"
          >
            VER TODAS
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
