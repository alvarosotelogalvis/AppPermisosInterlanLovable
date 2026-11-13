import type { RequestStatus } from '@/data/mockData';

const statusConfig: Record<RequestStatus, { bg: string; text: string; border: string; label: string }> = {
  pendiente: { bg: 'bg-status-pendiente-bg', text: 'text-status-pendiente-text', border: 'border-status-pendiente-border', label: 'Pendiente' },
  notificado: { bg: 'bg-status-notificado-bg', text: 'text-status-notificado-text', border: 'border-status-notificado-border', label: 'Notificado' },
  en_revision_th: { bg: 'bg-status-pendiente-bg', text: 'text-status-pendiente-text', border: 'border-status-pendiente-border', label: 'En revisión TH' },
  aprobado: { bg: 'bg-status-aprobado-bg', text: 'text-status-aprobado-text', border: 'border-status-aprobado-border', label: 'Aprobado' },
  denegado: { bg: 'bg-status-denegado-bg', text: 'text-status-denegado-text', border: 'border-status-denegado-border', label: 'Rechazado' },
  soportes_pendientes: { bg: 'bg-status-pendiente-bg', text: 'text-status-pendiente-text', border: 'border-status-pendiente-border', label: 'Soportes pendientes' },
  soportes_en_revision: { bg: 'bg-status-notificado-bg', text: 'text-status-notificado-text', border: 'border-status-notificado-border', label: 'Soportes en revisión' },
  finalizado: { bg: 'bg-status-finalizado-bg', text: 'text-status-finalizado-text', border: 'border-status-finalizado-border', label: 'Finalizado' },
  mas_info_requerida: { bg: 'bg-status-denegado-bg', text: 'text-status-denegado-text', border: 'border-status-denegado-border', label: 'Más información requerida' },
};

const StatusBadge = ({ status }: { status: RequestStatus }) => {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border font-nunito text-[11px] font-bold uppercase tracking-[0.05em] ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
