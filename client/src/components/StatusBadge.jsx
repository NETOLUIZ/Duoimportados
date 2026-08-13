import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, CircleDot } from 'lucide-react';

const TONE_STYLES = {
  danger: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
  warning: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  success: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
};

const INSTALLMENT_STATUS_META = {
  PAGA: { label: 'Paga', tone: 'success', icon: CheckCircle2 },
  ATRASADA: { label: 'Atrasada', tone: 'danger', icon: AlertTriangle },
  VENCENDO: { label: 'Vencendo em breve', tone: 'warning', icon: Clock },
  PENDENTE: { label: 'Pendente', tone: 'info', icon: CircleDot },
};

export function getInstallmentStatusMeta(status) {
  return INSTALLMENT_STATUS_META[status] || INSTALLMENT_STATUS_META.PENDENTE;
}

export default function StatusBadge({ tone = 'info', label, icon: Icon, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${TONE_STYLES[tone]} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      {label}
    </span>
  );
}

export function InstallmentStatusBadge({ status, className = '' }) {
  const meta = getInstallmentStatusMeta(status);
  return <StatusBadge tone={meta.tone} label={meta.label} icon={meta.icon} className={className} />;
}
