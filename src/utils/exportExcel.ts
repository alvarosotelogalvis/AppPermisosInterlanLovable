import { PermissionRequest, hourBasedMotivos } from '@/data/mockData';

export const exportToExcel = (requests: PermissionRequest[], filename: string) => {
  const headers = ['Empleado', 'Motivo', 'Fecha inicio', 'Fecha fin', 'Días hábiles', 'Estado', 'Aprobador', 'Fecha de envío'];
  
  const statusLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    notificado: 'Notificado',
    en_revision_th: 'En revisión TH',
    aprobado: 'Aprobado',
    denegado: 'Rechazado',
    soportes_pendientes: 'Soportes pendientes',
    soportes_en_revision: 'Soportes en revisión',
    finalizado: 'Finalizado',
    mas_info_requerida: 'Más información requerida',
  };

  const rows = requests.map(r => [
    r.employeeName,
    r.motivo,
    r.fechaInicio,
    r.fechaFin,
    String(hourBasedMotivos.includes(r.motivo) ? 0 : r.diasHabiles),
    statusLabels[r.status] || r.status,
    r.approver,
    r.fechaSolicitud,
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
