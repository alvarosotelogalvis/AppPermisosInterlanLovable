import { useState } from 'react';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import { motivoRequiresDocuments } from '@/data/mockData';
import { colombianHolidays } from '@/data/colombianHolidays';
import { empleados, getBirthdays, setBirthday, getQuinquenios, setQuinquenio } from '@/data/employees';
import EmployeeDatesSection from '@/components/EmployeeDatesSection';
import ReportPickerDialog from '@/components/ReportPickerDialog';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { useRequests } from '@/contexts/RequestsContext';
import { Switch } from '@/components/ui/switch';
import { Download, Plus, X, Cake } from 'lucide-react';
import { exportToExcel } from '@/utils/exportExcel';

const Administracion = () => {
  const { electoralActive, setElectoralActive, emailsActive, setEmailsActive } = useAppConfig();
  const { isRealMode, setIsRealMode, requests: contextRequests } = useRequests();
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(new Set(colombianHolidays.map(h => h.substring(0, 4)))).sort();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [holidays, setHolidays] = useState(colombianHolidays.filter(h => h.startsWith(selectedYear)));
  const [newHoliday, setNewHoliday] = useState('');
  const [birthdays, setBirthdaysState] = useState<Record<string, string>>(getBirthdays());
  const [quinquenios, setQuinqueniosState] = useState<Record<string, string>>(getQuinquenios());
  const [reportDialog, setReportDialog] = useState<null | 'monthly' | 'employee' | 'area'>(null);


  const handleBirthdayChange = (userId: string, date: string) => {
    setBirthday(userId, date);
    setBirthdaysState({ ...getBirthdays() });
  };

  const handleQuinquenioChange = (userId: string, date: string) => {
    setQuinquenio(userId, date);
    setQuinqueniosState({ ...getQuinquenios() });
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setHolidays(colombianHolidays.filter(h => h.startsWith(year)));
  };

  const addHoliday = () => {
    if (newHoliday && !holidays.includes(newHoliday)) {
      setHolidays([...holidays, newHoliday].sort());
      setNewHoliday('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <BackButton />
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-nunito font-bold text-[28px] text-foreground">Administración</h1>
          <button
            onClick={() => exportToExcel(contextRequests, 'todas_solicitudes')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-nunito text-[13px] font-bold border border-interlan-border-gray text-interlan-text-muted hover:border-interlan-blue hover:text-interlan-blue transition-colors"
          >
            <Download size={14} /> Exportar a Excel
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {(() => {
            const reqs = contextRequests;
            const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
            const parseFecha = (fecha: string) => {
              const [dia, mesTexto, anio] = fecha.split('/');
              const mes = monthNames.indexOf(mesTexto);
              return new Date(Number(anio), mes, Number(dia));
            };
            const now = new Date();
            const activeStatuses = ['pendiente', 'notificado', 'en_revision_th', 'mas_info_requerida', 'soportes_en_revision'];
            const requiresDocs = (motivo: string) => !!motivoRequiresDocuments[motivo]?.length;
            return [
              { label: 'Solicitudes activas', value: reqs.filter(r => activeStatuses.includes(r.status) || (r.status === 'aprobado' && requiresDocs(r.motivo))).length },
              { label: 'Documentos pendientes', value: reqs.filter(r => r.documentStatus === 'sin_documentos').length },
              { label: 'Aprobaciones TH', value: reqs.filter(r => r.status === 'en_revision_th').length },
              { label: 'Solicitudes este mes', value: reqs.filter(r => {
                const f = parseFecha(r.fechaSolicitud);
                return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear();
              }).length },
            ].map((m, i) => (
              <div key={i} className="border border-interlan-border-gray rounded-xl p-6">
                <p className="font-nunito text-[13px] text-interlan-text-secondary mb-1">{m.label}</p>
                <p className="font-nunito font-bold text-[32px] text-foreground">{m.value}</p>
              </div>
            ));
          })()}
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="border border-interlan-border-gray rounded-xl p-6">
            <h3 className="font-nunito font-bold text-[18px] mb-6">Configuración</h3>

            <div className="flex items-center justify-between py-4 border-b border-interlan-border-gray">
              <div>
                <p className="font-nunito text-[14px] font-semibold text-foreground">Modo de operación</p>
                <p className="font-nunito text-[13px] text-interlan-text-muted">
                  {isRealMode
                    ? '🟢 Modo real — Datos en base de datos, correos activos'
                    : '🟡 Modo demo — Datos de prueba, sin correos'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-nunito text-[12px] text-interlan-text-muted">{isRealMode ? 'Real' : 'Demo'}</span>
                <Switch checked={isRealMode} onCheckedChange={setIsRealMode} />
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-interlan-border-gray">
              <div>
                <p className="font-nunito text-[14px] font-semibold text-foreground">Correos activos</p>
                <p className="font-nunito text-[13px] text-interlan-text-muted">
                  {emailsActive
                    ? '🟢 Resend envía correos normalmente'
                    : '🔴 Correos desactivados — el flujo funciona sin enviar correos'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-nunito text-[12px] text-interlan-text-muted">{emailsActive ? 'Activos' : 'Inactivos'}</span>
                <Switch checked={emailsActive} onCheckedChange={setEmailsActive} />
              </div>
            </div>
            <div className="flex items-center justify-between py-4 border-b border-interlan-border-gray">
              <div>
                <p className="font-nunito text-[14px] font-semibold text-foreground">Período electoral activo</p>
                <p className="font-nunito text-[13px] text-interlan-text-muted">Habilita permisos por jurado de votación y votación</p>
              </div>
              <Switch checked={electoralActive} onCheckedChange={setElectoralActive} />
            </div>

            <div className="py-4 border-b border-interlan-border-gray">
              <p className="font-nunito text-[14px] font-semibold text-foreground mb-1">Horario laboral</p>
              <p className="font-nunito text-[12px] text-interlan-text-muted mb-3">
                Lunes: 08:00 – 17:00 · Martes a viernes: 08:00 – 17:30 · Almuerzo: 12:30 – 13:30
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-nunito text-[12px] text-interlan-text-muted mb-1">Inicio</label>
                  <input type="time" defaultValue="08:00" className="w-full h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px]" />
                </div>
                <div>
                  <label className="block font-nunito text-[12px] text-interlan-text-muted mb-1">Fin (mar–vie)</label>
                  <input type="time" defaultValue="17:30" className="w-full h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px]" />
                </div>
                <div>
                  <label className="block font-nunito text-[12px] text-interlan-text-muted mb-1">Almuerzo</label>
                  <input type="time" defaultValue="12:30" className="w-full h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px]" />
                </div>
              </div>
            </div>
          </div>

          {/* Holiday calendar */}
          <div className="border border-interlan-border-gray rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-nunito font-bold text-[18px]">Días festivos</h3>
              <select
                value={selectedYear}
                onChange={e => handleYearChange(e.target.value)}
                className="h-9 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[13px] font-bold bg-background"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="date"
                value={newHoliday}
                onChange={e => setNewHoliday(e.target.value)}
                className="flex-1 h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px]"
              />
              <button onClick={addHoliday} className="px-3 h-9 bg-interlan-blue text-white rounded-[6px] flex items-center gap-1 font-nunito text-[13px] font-bold">
                <Plus size={14} /> Agregar
              </button>
            </div>
            <div className="max-h-[280px] overflow-y-auto space-y-1">
              {holidays.map(h => (
                <div key={h} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-interlan-light-gray">
                  <span className="font-nunito text-[13px]">{h}</span>
                  <button onClick={() => setHolidays(prev => prev.filter(x => x !== h))} className="text-interlan-text-muted hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <EmployeeDatesSection />



        {/* Reports */}
        <div className="border border-interlan-border-gray rounded-xl p-6">

          <h3 className="font-nunito font-bold text-[18px] mb-6">Reportes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { label: 'Reporte mensual por tipo de permiso', kind: 'monthly' as const },
              { label: 'Reporte por empleado', kind: 'employee' as const },
              { label: 'Reporte por área', kind: 'area' as const },
            ]).map(r => (
              <button
                key={r.kind}
                onClick={() => setReportDialog(r.kind)}
                className="flex items-center gap-3 p-4 border border-interlan-border-gray rounded-xl hover:border-interlan-blue transition-colors text-left"
              >
                <Download size={18} className="text-interlan-blue shrink-0" />
                <span className="font-nunito text-[14px] text-foreground">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {reportDialog && (
        <ReportPickerDialog
          kind={reportDialog}
          requests={contextRequests}
          onClose={() => setReportDialog(null)}
        />
      )}
    </div>
  );
};

export default Administracion;
