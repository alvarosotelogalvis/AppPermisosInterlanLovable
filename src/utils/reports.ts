import * as XLSX from 'xlsx';
import { PermissionRequest, hourBasedMotivos } from '@/data/mockData';
import { calcEffectiveMinutes, sumBusinessMinutesRangeWithBounds, formatMinutes } from '@/data/colombianHolidays';
import { empleados } from '@/data/employees';

const MONTHS_ES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

export const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/** Parse "16/marzo/2026" → Date, or null. */
export const parseSpanishDate = (s: string): Date | null => {
  if (!s) return null;
  const parts = s.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = MONTHS_ES[parts[1].toLowerCase()];
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
};

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', notificado: 'Notificado', en_revision_th: 'En revisión TH',
  aprobado: 'Aprobado', denegado: 'Rechazado', soportes_pendientes: 'Soportes pendientes',
  soportes_en_revision: 'Soportes en revisión', finalizado: 'Finalizado',
  mas_info_requerida: 'Más información requerida',
};

const DOC_STATUS_LABELS: Record<string, string> = {
  sin_documentos: 'Sin documentos', documentos_cargados: 'Documentos cargados',
  aprobado_finalizado: 'Aprobado / Finalizado', mas_info: 'Más información requerida',
};

const cedulaByEmployeeId = (id: string): string => empleados.find(e => e.id === id)?.cedula || '';

/** Effective minutes for a request. 0 for day-based motivos. */
export const requestMinutes = (r: PermissionRequest): number => {
  if (!hourBasedMotivos.includes(r.motivo)) return 0;
  if (!r.horaInicio || !r.horaFin) return 0;
  const s = parseSpanishDate(r.fechaInicio);
  const e = parseSpanishDate(r.fechaFin);
  if (s && e) return sumBusinessMinutesRangeWithBounds(s, e, r.horaInicio, r.horaFin);
  return calcEffectiveMinutes(r.horaInicio, r.horaFin);
};

const horasCell = (r: PermissionRequest): string => {
  if (!hourBasedMotivos.includes(r.motivo)) return '-';
  const m = requestMinutes(r);
  return m > 0 ? formatMinutes(m) : '-';
};

const diasHabilesCell = (r: PermissionRequest): number =>
  hourBasedMotivos.includes(r.motivo) ? 0 : r.diasHabiles;

const baseRow = (r: PermissionRequest) => ({
  'Tipo de ausencia': r.type,
  'Motivo': r.motivo,
  'Empleado': r.employeeName,
  'Cédula': cedulaByEmployeeId(r.employeeId),
  'Área': r.employeeArea,
  'Fecha inicio': r.fechaInicio,
  'Fecha fin': r.fechaFin,
  'Horas': horasCell(r),
  'Días hábiles': diasHabilesCell(r),
  'Estado': STATUS_LABELS[r.status] || r.status,
  'Aprobador': r.approver,
});

const download = (wb: XLSX.WorkBook, filename: string) => {
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ---------- 1) Monthly report by permission type ----------
export const generateMonthlyReport = (
  requests: PermissionRequest[],
  year: number,
  month: number, // 0-indexed
) => {
  const inMonth = requests.filter(r => {
    const d = parseSpanishDate(r.fechaInicio);
    return d && d.getFullYear() === year && d.getMonth() === month;
  }).sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.motivo.localeCompare(b.motivo);
  });

  const rows = inMonth.map(baseRow);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Solicitudes');

  // Summary by motivo
  const summaryMap = new Map<string, { motivo: string; type: string; count: number; minutes: number }>();
  inMonth.forEach(r => {
    const key = `${r.type}||${r.motivo}`;
    const cur = summaryMap.get(key) || { motivo: r.motivo, type: r.type, count: 0, minutes: 0 };
    cur.count += 1;
    cur.minutes += requestMinutes(r);
    summaryMap.set(key, cur);
  });
  const summaryRows = Array.from(summaryMap.values()).map(s => ({
    'Tipo de ausencia': s.type,
    'Motivo': s.motivo,
    'Total solicitudes': s.count,
    'Total horas': s.minutes > 0 ? formatMinutes(s.minutes) : '-',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumen');

  const monthName = MONTH_NAMES[month].toLowerCase();
  download(wb, `reporte_mensual_${monthName}_${year}`);
};

// ---------- 2) Employee report ----------
export const generateEmployeeReport = (
  requests: PermissionRequest[],
  employeeId: string,
  employeeName: string,
) => {
  const list = requests.filter(r => r.employeeId === employeeId)
    .sort((a, b) => {
      const da = parseSpanishDate(a.fechaInicio)?.getTime() || 0;
      const db = parseSpanishDate(b.fechaInicio)?.getTime() || 0;
      return db - da;
    });

  const rows = list.map(r => ({
    ...baseRow(r),
    'Estado documentos': DOC_STATUS_LABELS[r.documentStatus] || r.documentStatus,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Historial');

  // Accumulated by motivo (current year)
  const currentYear = new Date().getFullYear();
  const currentYearList = list.filter(r => {
    const d = parseSpanishDate(r.fechaInicio);
    return d && d.getFullYear() === currentYear;
  });
  const acumMap = new Map<string, number>();
  currentYearList.forEach(r => {
    acumMap.set(r.motivo, (acumMap.get(r.motivo) || 0) + requestMinutes(r));
  });
  const acumRows = Array.from(acumMap.entries())
    .filter(([, min]) => min > 0)
    .map(([motivo, min]) => ({
      'Motivo': motivo,
      'Total horas (año actual)': formatMinutes(min),
    }));

  // Diligencias personales: 30h / year
  const diligenciasMin = acumMap.get('Diligencias personales') || 0;
  const DILIGENCIAS_LIMIT = 30 * 60;
  acumRows.push({
    'Motivo': `Diligencias personales — usadas de 30h anuales (${currentYear})`,
    'Total horas (año actual)': `${formatMinutes(diligenciasMin)} de ${formatMinutes(DILIGENCIAS_LIMIT)}`,
  });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(acumRows), `Acumulados ${currentYear}`);

  const safeName = employeeName.replace(/[^\w\s]/g, '').replace(/\s+/g, '_').toLowerCase();
  download(wb, `reporte_empleado_${safeName}`);
};

// ---------- 3) Area report ----------
export const generateAreaReport = (
  requests: PermissionRequest[],
  area: string,
) => {
  const list = requests.filter(r => r.employeeArea === area)
    .sort((a, b) => {
      if (a.employeeName !== b.employeeName) return a.employeeName.localeCompare(b.employeeName);
      const da = parseSpanishDate(a.fechaInicio)?.getTime() || 0;
      const db = parseSpanishDate(b.fechaInicio)?.getTime() || 0;
      return db - da;
    });

  const rows = list.map(baseRow);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Solicitudes');

  const byEmp = new Map<string, { name: string; count: number; days: number; minutes: number }>();
  list.forEach(r => {
    const cur = byEmp.get(r.employeeId) || { name: r.employeeName, count: 0, days: 0, minutes: 0 };
    cur.count += 1;
    cur.days += diasHabilesCell(r);
    cur.minutes += requestMinutes(r);
    byEmp.set(r.employeeId, cur);
  });
  const summaryRows = Array.from(byEmp.entries()).map(([id, s]) => ({
    'Empleado': s.name,
    'Cédula': cedulaByEmployeeId(id),
    'Total solicitudes': s.count,
    'Total días hábiles': s.days,
    'Total horas': s.minutes > 0 ? formatMinutes(s.minutes) : '-',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumen por empleado');

  const safeArea = area.replace(/[^\w\s]/g, '').replace(/\s+/g, '_').toLowerCase();
  download(wb, `reporte_area_${safeArea}`);
};
