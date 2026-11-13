import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Cake, Search, Download, Upload, FileDown, X } from 'lucide-react';
import { empleados, getBirthdays, setBirthday, getQuinquenios, setQuinquenio } from '@/data/employees';

const PAGE_SIZE = 25;

// Normalize cedula for matching: keep only digits
const normalizeCedula = (v: string) => (v || '').toString().replace(/\D/g, '');

// Excel serial or string -> YYYY-MM-DD
const parseExcelDate = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return '';
    const mm = String(d.m).padStart(2, '0');
    const dd = String(d.d).padStart(2, '0');
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
  return '';
};

interface ImportSummary {
  updatedBirthdays: number;
  updatedQuinquenios: number;
  matchedRows: number;
  unmatchedRows: { row: number; cedula: string; name?: string }[];
}

const EmployeeDatesSection = () => {
  const [birthdays, setBirthdaysState] = useState<Record<string, string>>(getBirthdays());
  const [quinquenios, setQuinqueniosState] = useState<Record<string, string>>(getQuinquenios());
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('__all__');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [page, setPage] = useState(1);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBirthday = (id: string, date: string) => {
    setBirthday(id, date);
    setBirthdaysState({ ...getBirthdays() });
  };
  const handleQuinquenio = (id: string, date: string) => {
    setQuinquenio(id, date);
    setQuinqueniosState({ ...getQuinquenios() });
  };

  const areas = useMemo(() => Array.from(new Set(empleados.map(e => e.area))).sort(), []);

  const missingList = useMemo(
    () => empleados.filter(e => !birthdays[e.id] || !quinquenios[e.id]),
    [birthdays, quinquenios]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qCedula = normalizeCedula(search);
    return empleados.filter(e => {
      if (areaFilter !== '__all__' && e.area !== areaFilter) return false;
      if (onlyMissing && birthdays[e.id] && quinquenios[e.id]) return false;
      if (q) {
        const nameMatch = e.name.toLowerCase().includes(q);
        const cedulaMatch = qCedula && normalizeCedula(e.cedula).includes(qCedula);
        if (!nameMatch && !cedulaMatch) return false;
      }
      return true;
    });
  }, [search, areaFilter, onlyMissing, birthdays, quinquenios]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const birthdayCount = empleados.filter(e => birthdays[e.id]).length;
  const quinquenioCount = empleados.filter(e => quinquenios[e.id]).length;

  const handleExport = () => {
    const rows = empleados.map(e => ({
      'Cédula': e.cedula,
      'Nombre': e.name,
      'Área': e.area,
      'Fecha cumpleaños': birthdays[e.id] || '',
      'Fecha quinquenio': quinquenios[e.id] || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fechas empleados');
    XLSX.writeFile(wb, 'fechas_empleados.xlsx');
  };

  const handleDownloadTemplate = () => {
    const rows = [{
      'Cédula': '',
      'Nombre': '',
      'Área': '',
      'Fecha cumpleaños': '',
      'Fecha quinquenio': '',
    }];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_fechas_empleados.xlsx');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    const byCedula = new Map(empleados.map(emp => [normalizeCedula(emp.cedula), emp]));
    let updatedB = 0, updatedQ = 0, matched = 0;
    const unmatched: ImportSummary['unmatchedRows'] = [];

    rows.forEach((r, idx) => {
      const rawCedula = r['Cédula'] ?? r['Cedula'] ?? r['cédula'] ?? r['cedula'] ?? '';
      const key = normalizeCedula(String(rawCedula));
      if (!key) return;
      const emp = byCedula.get(key);
      if (!emp) {
        unmatched.push({ row: idx + 2, cedula: String(rawCedula), name: r['Nombre'] as string });
        return;
      }
      matched++;
      const bDate = parseExcelDate(r['Fecha cumpleaños'] ?? r['Fecha cumpleanos'] ?? r['Fecha cumpleaño']);
      const qDate = parseExcelDate(r['Fecha quinquenio']);
      if (bDate) { setBirthday(emp.id, bDate); updatedB++; }
      if (qDate) { setQuinquenio(emp.id, qDate); updatedQ++; }
    });

    setBirthdaysState({ ...getBirthdays() });
    setQuinqueniosState({ ...getQuinquenios() });
    setImportSummary({ updatedBirthdays: updatedB, updatedQuinquenios: updatedQ, matchedRows: matched, unmatchedRows: unmatched });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="border border-interlan-border-gray rounded-xl p-6 mb-10">
      <div className="flex items-center gap-2 mb-2">
        <Cake size={18} className="text-interlan-blue" />
        <h3 className="font-nunito font-bold text-[18px]">Fechas de empleados</h3>
      </div>
      <p className="font-nunito text-[13px] text-interlan-text-muted mb-4">
        Registra la fecha de cumpleaños y del quinquenio de cada empleado. Se usan para validar los permisos de "Cumpleaños" y "Quinquenio".
      </p>

      {/* Progress counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="border border-interlan-border-gray rounded-lg p-4">
          <p className="font-nunito text-[12px] text-interlan-text-muted mb-1">Cumpleaños registrados</p>
          <p className="font-nunito font-bold text-[20px]">{birthdayCount} <span className="text-interlan-text-muted font-normal text-[14px]">de {empleados.length}</span></p>
        </div>
        <div className="border border-interlan-border-gray rounded-lg p-4">
          <p className="font-nunito text-[12px] text-interlan-text-muted mb-1">Quinquenios registrados</p>
          <p className="font-nunito font-bold text-[20px]">{quinquenioCount} <span className="text-interlan-text-muted font-normal text-[14px]">de {empleados.length}</span></p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-interlan-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o cédula"
            className="w-full h-9 pl-9 pr-3 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background"
          />
        </div>
        <select
          value={areaFilter}
          onChange={e => { setAreaFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background"
        >
          <option value="__all__">Todas las áreas</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button
          onClick={() => { setOnlyMissing(!onlyMissing); setPage(1); }}
          className={`h-9 px-3 rounded-full font-nunito text-[13px] font-bold border transition-colors ${
            onlyMissing
              ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
              : 'border-interlan-border-gray text-interlan-text-muted hover:border-interlan-blue hover:text-interlan-blue'
          }`}
        >
          Solo sin fecha ({missingList.length})
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="h-9 px-3 rounded-lg font-nunito text-[13px] font-bold border border-interlan-border-gray text-interlan-text-muted hover:border-interlan-blue hover:text-interlan-blue flex items-center gap-1.5"
          >
            <Download size={14} /> Exportar
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3 rounded-lg font-nunito text-[13px] font-bold bg-interlan-blue text-white flex items-center gap-1.5"
          >
            <Upload size={14} /> Importar Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>
      <div className="mb-4">
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1 font-nunito text-[12px] text-interlan-blue hover:underline"
        >
          <FileDown size={12} /> Descargar plantilla
        </button>
      </div>

      {/* Import summary */}
      {importSummary && (
        <div className="mb-4 border border-interlan-border-gray rounded-lg p-4 bg-interlan-light-gray">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-nunito font-bold text-[14px] mb-1">Importación completada</p>
              <p className="font-nunito text-[13px]">
                {importSummary.matchedRows} empleado(s) emparejados · {importSummary.updatedBirthdays} cumpleaños actualizados · {importSummary.updatedQuinquenios} quinquenios actualizados
              </p>
              {importSummary.unmatchedRows.length > 0 && (
                <div className="mt-2">
                  <p className="font-nunito text-[13px] font-semibold text-yellow-800 mb-1">
                    {importSummary.unmatchedRows.length} fila(s) sin coincidencia:
                  </p>
                  <ul className="font-nunito text-[12px] text-interlan-text-secondary list-disc pl-5 max-h-32 overflow-y-auto">
                    {importSummary.unmatchedRows.map((u, i) => (
                      <li key={i}>Fila {u.row}: cédula "{u.cedula}"{u.name ? ` (${u.name})` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button onClick={() => setImportSummary(null)} className="text-interlan-text-muted hover:text-foreground">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-interlan-light-gray">
            <tr>
              <th className="text-left font-nunito text-[13px] font-semibold text-interlan-text-secondary px-4 py-2">Empleado</th>
              <th className="text-left font-nunito text-[13px] font-semibold text-interlan-text-secondary px-4 py-2">Área</th>
              <th className="text-left font-nunito text-[13px] font-semibold text-interlan-text-secondary px-4 py-2">Fecha de cumpleaños</th>
              <th className="text-left font-nunito text-[13px] font-semibold text-interlan-text-secondary px-4 py-2">Fecha del quinquenio</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center font-nunito text-[13px] text-interlan-text-muted">Sin resultados</td></tr>
            )}
            {pageItems.map(emp => {
              const missingB = !birthdays[emp.id];
              const missingQ = !quinquenios[emp.id];
              const rowMissing = missingB || missingQ;
              return (
                <tr key={emp.id} className={`border-t border-interlan-border-gray ${rowMissing ? 'bg-yellow-50/60' : ''}`}>
                  <td className="px-4 py-2">
                    <div className="font-nunito text-[14px]">{emp.name}</div>
                    <div className="font-nunito text-[11px] text-interlan-text-muted">CC {emp.cedula}</div>
                  </td>
                  <td className="px-4 py-2 font-nunito text-[13px] text-interlan-text-secondary">{emp.area}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={birthdays[emp.id] || ''}
                        onChange={e => handleBirthday(emp.id, e.target.value)}
                        className={`h-9 px-2 rounded-lg font-nunito text-[13px] bg-background border ${missingB ? 'border-dashed border-yellow-500' : 'border-interlan-border-gray'}`}
                      />
                      {missingB && (
                        <span className="px-2 py-0.5 rounded-full font-nunito text-[11px] font-bold text-yellow-800 border border-dashed border-yellow-500">Sin fecha</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={quinquenios[emp.id] || ''}
                        onChange={e => handleQuinquenio(emp.id, e.target.value)}
                        className={`h-9 px-2 rounded-lg font-nunito text-[13px] bg-background border ${missingQ ? 'border-dashed border-yellow-500' : 'border-interlan-border-gray'}`}
                      />
                      {missingQ && (
                        <span className="px-2 py-0.5 rounded-full font-nunito text-[11px] font-bold text-yellow-800 border border-dashed border-yellow-500">Sin fecha</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="font-nunito text-[12px] text-interlan-text-muted">
          Mostrando {pageItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
          {' – '}
          {(currentPage - 1) * PAGE_SIZE + pageItems.length} de {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            className="h-8 px-3 rounded-lg font-nunito text-[13px] border border-interlan-border-gray disabled:opacity-40 hover:border-interlan-blue"
          >
            Anterior
          </button>
          <span className="font-nunito text-[13px]">Página {currentPage} de {totalPages}</span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
            className="h-8 px-3 rounded-lg font-nunito text-[13px] border border-interlan-border-gray disabled:opacity-40 hover:border-interlan-blue"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDatesSection;
