import { useState, useRef, useEffect, useMemo } from 'react';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';
import { PermissionRequest } from '@/data/mockData';
import { exportToExcel } from '@/utils/exportExcel';

interface ExportButtonProps {
  allData: PermissionRequest[];
  filteredData: PermissionRequest[];
  filename: string;
  hasActiveFilters: boolean;
}

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

type SubMenu = 'empleado' | 'tipo' | 'estado' | null;

const ExportButton = ({ allData, filteredData, filename, hasActiveFilters }: ExportButtonProps) => {
  const [open, setOpen] = useState(false);
  const [subMenu, setSubMenu] = useState<SubMenu>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSubMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const uniqueEmployees = useMemo(
    () => [...new Set(allData.map(r => r.employeeName))].sort((a, b) => a.localeCompare(b, 'es')),
    [allData]
  );

  const uniqueMotivos = useMemo(
    () => [...new Set(allData.map(r => r.motivo))].sort((a, b) => a.localeCompare(b, 'es')),
    [allData]
  );

  const uniqueStatuses = useMemo(
    () => [...new Set(allData.map(r => r.status))],
    [allData]
  );

  const handleExportFiltered = (key: keyof PermissionRequest, value: string, label: string) => {
    const filtered = allData.filter(r => r[key] === value);
    exportToExcel(filtered, `${filename}_${label.replace(/\s+/g, '_').toLowerCase()}`);
    setOpen(false);
    setSubMenu(null);
  };

  const menuItemClass = "w-full text-left px-4 py-2.5 font-nunito text-[13px] hover:bg-interlan-light-gray transition-colors flex items-center justify-between";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setSubMenu(null); }}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-nunito text-[13px] font-bold border border-interlan-border-gray text-interlan-text-muted hover:border-interlan-blue hover:text-interlan-blue transition-colors"
      >
        <Download size={14} /> Exportar a Excel <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-background border border-interlan-border-gray rounded-lg shadow-lg z-50 min-w-[240px]">
          {/* Exportar todo */}
          <button
            onClick={() => { exportToExcel(allData, filename); setOpen(false); setSubMenu(null); }}
            className={`${menuItemClass} rounded-t-lg`}
          >
            Exportar todo ({allData.length})
          </button>

          {/* Exportar vista actual (con filtros) */}
          {hasActiveFilters && (
            <button
              onClick={() => { exportToExcel(filteredData, `${filename}_filtrado`); setOpen(false); setSubMenu(null); }}
              className={`${menuItemClass} border-t border-interlan-border-gray`}
            >
              Exportar vista filtrada ({filteredData.length})
            </button>
          )}

          {/* Separator */}
          <div className="border-t border-interlan-border-gray" />

          {/* Por empleado */}
          <div
            className="relative"
            onMouseEnter={() => setSubMenu('empleado')}
            onMouseLeave={() => setSubMenu(null)}
          >
            <button
              onClick={() => setSubMenu(subMenu === 'empleado' ? null : 'empleado')}
              className={menuItemClass}
            >
              Por empleado <ChevronRight size={12} />
            </button>
            {subMenu === 'empleado' && (
              <div className="absolute right-full top-0 mr-1 bg-background border border-interlan-border-gray rounded-lg shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                {uniqueEmployees.map(emp => {
                  const count = allData.filter(r => r.employeeName === emp).length;
                  return (
                    <button
                      key={emp}
                      onClick={() => handleExportFiltered('employeeName', emp, emp)}
                      className={`${menuItemClass} text-[12px]`}
                    >
                      {emp} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Por tipo de permiso */}
          <div
            className="relative"
            onMouseEnter={() => setSubMenu('tipo')}
            onMouseLeave={() => setSubMenu(null)}
          >
            <button
              onClick={() => setSubMenu(subMenu === 'tipo' ? null : 'tipo')}
              className={menuItemClass}
            >
              Por tipo de permiso <ChevronRight size={12} />
            </button>
            {subMenu === 'tipo' && (
              <div className="absolute right-full top-0 mr-1 bg-background border border-interlan-border-gray rounded-lg shadow-lg z-50 min-w-[240px] max-h-[300px] overflow-y-auto">
                {uniqueMotivos.map(motivo => {
                  const count = allData.filter(r => r.motivo === motivo).length;
                  return (
                    <button
                      key={motivo}
                      onClick={() => handleExportFiltered('motivo', motivo, motivo)}
                      className={`${menuItemClass} text-[12px]`}
                    >
                      {motivo} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Por estado */}
          <div
            className="relative"
            onMouseEnter={() => setSubMenu('estado')}
            onMouseLeave={() => setSubMenu(null)}
          >
            <button
              onClick={() => setSubMenu(subMenu === 'estado' ? null : 'estado')}
              className={`${menuItemClass} rounded-b-lg`}
            >
              Por estado <ChevronRight size={12} />
            </button>
            {subMenu === 'estado' && (
              <div className="absolute right-full top-0 mr-1 bg-background border border-interlan-border-gray rounded-lg shadow-lg z-50 min-w-[220px] max-h-[300px] overflow-y-auto">
                {uniqueStatuses.map(status => {
                  const count = allData.filter(r => r.status === status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => handleExportFiltered('status', status, statusLabels[status] || status)}
                      className={`${menuItemClass} text-[12px]`}
                    >
                      {statusLabels[status] || status} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
