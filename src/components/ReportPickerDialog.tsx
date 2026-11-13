import { useMemo, useState } from 'react';
import { X, Search, Download } from 'lucide-react';
import { PermissionRequest } from '@/data/mockData';
import { empleados } from '@/data/employees';
import {
  MONTH_NAMES,
  generateMonthlyReport, generateEmployeeReport, generateAreaReport,
} from '@/utils/reports';

type ReportKind = 'monthly' | 'employee' | 'area';

interface Props {
  kind: ReportKind;
  requests: PermissionRequest[];
  onClose: () => void;
}

const normalizeCedula = (v: string) => (v || '').toString().replace(/\D/g, '');

const ReportPickerDialog = ({ kind, requests, onClose }: Props) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [area, setArea] = useState<string>('');

  const areas = useMemo(() => {
    const fromEmp = empleados.map(e => e.area);
    const fromReq = requests.map(r => r.employeeArea);
    return Array.from(new Set([...fromEmp, ...fromReq])).sort();
  }, [requests]);

  const empMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qCedula = normalizeCedula(search);
    if (!q) return empleados.slice(0, 8);
    return empleados.filter(e => {
      const nameMatch = e.name.toLowerCase().includes(q);
      const cedulaMatch = qCedula && normalizeCedula(e.cedula).includes(qCedula);
      return nameMatch || cedulaMatch;
    }).slice(0, 12);
  }, [search]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const title =
    kind === 'monthly' ? 'Reporte mensual por tipo de permiso'
    : kind === 'employee' ? 'Reporte por empleado'
    : 'Reporte por área';

  const runMonthly = () => { generateMonthlyReport(requests, year, month); onClose(); };
  const runEmployee = (id: string, name: string) => { generateEmployeeReport(requests, id, name); onClose(); };
  const runArea = () => { if (area) { generateAreaReport(requests, area); onClose(); } };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background rounded-xl border border-interlan-border-gray w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-nunito font-bold text-[18px]">{title}</h3>
          <button onClick={onClose} className="text-interlan-text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {kind === 'monthly' && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block font-nunito text-[12px] text-interlan-text-muted mb-1">Mes</label>
                <select
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  className="w-full h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background"
                >
                  {MONTH_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-nunito text-[12px] text-interlan-text-muted mb-1">Año</label>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={runMonthly}
              className="w-full h-10 rounded-lg bg-interlan-blue text-white font-nunito text-[13px] font-bold flex items-center justify-center gap-2"
            >
              <Download size={14} /> Generar Excel
            </button>
          </>
        )}

        {kind === 'employee' && (
          <>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-interlan-text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o cédula"
                className="w-full h-9 pl-9 pr-3 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background"
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto border border-interlan-border-gray rounded-lg divide-y divide-interlan-border-gray">
              {empMatches.length === 0 && (
                <p className="p-4 font-nunito text-[13px] text-interlan-text-muted text-center">Sin resultados</p>
              )}
              {empMatches.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => runEmployee(emp.id, emp.name)}
                  className="w-full text-left px-3 py-2 hover:bg-interlan-light-gray flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-nunito text-[14px]">{emp.name}</div>
                    <div className="font-nunito text-[11px] text-interlan-text-muted">CC {emp.cedula} · {emp.area}</div>
                  </div>
                  <Download size={14} className="text-interlan-blue shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}

        {kind === 'area' && (
          <>
            <label className="block font-nunito text-[12px] text-interlan-text-muted mb-1">Área</label>
            <select
              value={area}
              onChange={e => setArea(e.target.value)}
              className="w-full h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background mb-4"
            >
              <option value="">Selecciona un área</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button
              onClick={runArea}
              disabled={!area}
              className="w-full h-10 rounded-lg bg-interlan-blue text-white font-nunito text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Download size={14} /> Generar Excel
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportPickerDialog;
