import { useState, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import BinaryPattern from '@/components/BinaryPattern';
import StatusBadge from '@/components/StatusBadge';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import { useRequests } from '@/contexts/RequestsContext';
import { permissionTypes } from '@/data/mockData';
import { ArrowRight, Filter, CheckCircle, FileText } from 'lucide-react';
import { exportToExcel } from '@/utils/exportExcel';
import ExportButton from '@/components/ExportButton';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { requests } = useRequests();
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterMotivo, setFilterMotivo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDocs, setFilterDocs] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const uniqueEmployees = useMemo(() => [...new Set(requests.map(r => r.employeeName))].sort((a, b) => a.localeCompare(b, 'es')), [requests]);
  const allMotivos = useMemo(() => [...new Set(Object.values(permissionTypes).flat())].sort((a, b) => a.localeCompare(b, 'es')), []);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (filterEmployee && r.employeeName !== filterEmployee) return false;
      if (filterMotivo && r.motivo !== filterMotivo) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterDocs && r.documentStatus !== filterDocs) return false;
      return true;
    });
  }, [requests, filterEmployee, filterMotivo, filterStatus, filterDocs]);

  const hasActiveFilters = filterEmployee || filterMotivo || filterStatus || filterDocs;

  const clearFilters = () => {
    setFilterEmployee('');
    setFilterMotivo('');
    setFilterStatus('');
    setFilterDocs('');
  };

  if (!user) return null;

  // Leader goes directly to Aprobaciones
  if (user.role === 'leader') return <Navigate to="/aprobaciones" replace />;

  const userRequests = requests
    .filter(r => r.employeeId === user.id)
    .slice(0, 5);

  const aprobacionesPendientes = requests.filter(r => r.status === 'en_revision_th');
  const documentosPorRevisar = requests.filter(r => r.documentStatus === 'documentos_cargados');

  const requierenAccion = filteredRequests.filter(
    r => r.status === 'en_revision_th' || r.documentStatus === 'documentos_cargados'
  );
  const actividadReciente = filteredRequests.filter(
    r => r.status !== 'en_revision_th' && r.documentStatus !== 'documentos_cargados'
  );

  const getActionLabel = (r: typeof requierenAccion[0]) => {
    if (r.status === 'en_revision_th') {
      if (r.motivo === 'Calamidad doméstica grave') return { text: 'Validar calamidad', className: 'bg-[#FFF8E1] text-[#B28600]' };
      if (r.motivo === 'Traslado temporal por teletrabajo móvil') return { text: 'Aprobar traslado', className: 'bg-interlan-light-blue text-interlan-blue' };
      return { text: 'Aprobar', className: 'bg-interlan-light-blue text-interlan-blue' };
    }
    return { text: 'Revisar documentos', className: 'bg-[#E6F9EE] text-[#1A6B36]' };
  };

  const getActionRoute = (r: typeof requierenAccion[0]) => {
    if (r.status === 'en_revision_th') return '/aprobaciones';
    return '/documentos';
  };

  const SummaryCard = ({
    icon: Icon,
    count,
    title,
    linkText,
    onClick,
  }: {
    icon: React.ElementType;
    count: number;
    title: string;
    linkText: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="w-full text-left border border-interlan-border-gray rounded-xl p-6 bg-background hover:border-interlan-blue hover:bg-interlan-light-gray/30 transition-colors group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-nunito text-[13px] text-interlan-text-secondary mb-1">{title}</p>
          <p className="font-nunito font-bold text-[32px] text-foreground leading-none">{count}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-interlan-light-blue flex items-center justify-center text-interlan-blue">
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 font-nunito text-[13px] font-bold text-interlan-blue group-hover:gap-2 transition-all">
        {linkText} <ArrowRight size={14} />
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-interlan-blue overflow-hidden">
        <BinaryPattern opacity={7} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-14 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="font-nunito text-[20px] font-bold tracking-[0.15em] text-white/65 mb-4">Portal de permisos</p>
              <h1 className="font-nunito font-bold text-[26px] md:text-[36px] text-white mb-4 leading-tight">
                {user.role === 'employee' && 'Solicita y gestiona tus permisos.'}
                {user.role === 'hr' && 'Visibilidad total del proceso de permisos.'}
              </h1>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {user.role === 'employee' && (
                  <>
                    <button onClick={() => navigate('/nueva-solicitud')} className="h-[44px] px-6 bg-white text-interlan-blue font-nunito text-[14px] font-bold rounded-lg">Solicitar permiso</button>
                    <button onClick={() => navigate('/mis-solicitudes')} className="h-[44px] px-6 bg-transparent border-[1.5px] border-white text-white font-nunito text-[14px] font-bold rounded-lg">Ver mis solicitudes</button>
                  </>
                )}
                {user.role === 'hr' && (
                  <>
                    <button onClick={() => navigate('/aprobaciones')} className="h-[44px] px-6 bg-white text-interlan-blue font-nunito text-[14px] font-bold rounded-lg">Panel de aprobaciones</button>
                    <button onClick={() => navigate('/documentos')} className="h-[44px] px-6 bg-transparent border-[1.5px] border-white text-white font-nunito text-[14px] font-bold rounded-lg">Gestión de documentos</button>
                  </>
                )}
              </div>
            </div>
            {user.role === 'employee' && (
              <div className="hidden md:flex flex-col gap-4">
                <div className="bg-white/10 border border-white/20 rounded-[14px] p-5">
                  <p className="font-nunito text-[11px] font-bold uppercase tracking-[0.05em] text-white/65 mb-3">¿Qué significa cada estado?</p>
                  <div className="space-y-2">
                    {[
                      { color: 'bg-[#FFD600]', label: 'Pendiente', desc: 'Tu solicitud fue enviada y está esperando revisión del líder.' },
                      { color: 'bg-[#90A4AE]', label: 'Notificado', desc: 'El líder ha sido notificado de tu solicitud.' },
                      { color: 'bg-[#00C853]', label: 'Aprobado', desc: 'Tu permiso fue aprobado.' },
                      { color: 'bg-[#E53935]', label: 'Rechazado', desc: 'Tu solicitud fue rechazada por el líder o Talento Humano.' },
                      { color: 'bg-[#0041FF]', label: 'Finalizado', desc: 'El proceso terminó y los documentos están completos.' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.color}`} />
                        <div>
                          <span className="font-nunito text-[12px] font-bold text-white">{s.label}: </span>
                          <span className="font-nunito text-[12px] text-white/70">{s.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content area */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <BackButton />

        {/* Employee: no content below hero */}


        {/* HR: summary metrics + recent */}
        {user.role === 'hr' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <SummaryCard
                icon={CheckCircle}
                count={aprobacionesPendientes.length}
                title="Aprobaciones pendientes"
                linkText="Ir al panel de aprobaciones"
                onClick={() => navigate('/aprobaciones')}
              />
              <SummaryCard
                icon={FileText}
                count={documentosPorRevisar.length}
                title="Documentos por revisar"
                linkText="Ir a gestión de documentos"
                onClick={() => navigate('/documentos')}
              />
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="font-nunito font-bold text-[22px] text-foreground">Solicitudes</h2>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-nunito text-[12px] font-bold border transition-colors ${hasActiveFilters ? 'bg-interlan-blue text-white border-interlan-blue' : 'border-interlan-border-gray text-interlan-text-muted hover:border-interlan-blue'}`}
                >
                  <Filter size={13} /> Filtrar
                </button>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="font-nunito text-[12px] text-interlan-blue hover:underline">
                    Limpiar filtros
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <ExportButton
                  allData={requests}
                  filteredData={filteredRequests}
                  filename="solicitudes_hr"
                  hasActiveFilters={!!hasActiveFilters}
                />
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background">
                  <option value="">Todos los empleados</option>
                  {uniqueEmployees.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select value={filterMotivo} onChange={e => setFilterMotivo(e.target.value)} className="h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background">
                  <option value="">Todos los motivos</option>
                  {allMotivos.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background">
                  <option value="">Todos los estados</option>
                  {['Aprobado', 'Rechazado', 'En revisión TH', 'Finalizado', 'Notificado', 'Pendiente'].map(label => {
                    const valueMap: Record<string, string> = { 'Aprobado': 'aprobado', 'Rechazado': 'denegado', 'En revisión TH': 'en_revision_th', 'Finalizado': 'finalizado', 'Notificado': 'notificado', 'Pendiente': 'pendiente' };
                    return <option key={label} value={valueMap[label]}>{label}</option>;
                  })}
                </select>
                <select value={filterDocs} onChange={e => setFilterDocs(e.target.value)} className="h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background">
                  <option value="">Todos los documentos</option>
                  {[
                    { label: 'Cargados', value: 'documentos_cargados' },
                    { label: 'Finalizado', value: 'aprobado_finalizado' },
                    { label: 'Sin documentos', value: 'sin_documentos' },
                  ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {/* Requieren tu acción */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-nunito font-bold text-[18px] text-foreground">Requieren tu acción</h3>
                <button onClick={() => navigate('/aprobaciones')} className="font-nunito text-[14px] font-bold text-interlan-blue flex items-center gap-1 hover:gap-2 transition-all">
                  Ver todas <ArrowRight size={14} />
                </button>
              </div>
              <div className="border border-interlan-border-gray rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-interlan-light-gray">
                    <tr>
                      {['Empleado', 'Motivo', 'Fechas', 'Acción requerida', ''].map(h => (
                        <th key={h} className="text-left font-nunito text-[13px] font-semibold text-interlan-text-secondary px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {requierenAccion.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center font-nunito text-[14px] text-interlan-text-muted">
                          No hay solicitudes que requieran tu acción.
                        </td>
                      </tr>
                    ) : (
                      requierenAccion.map(r => {
                        const action = getActionLabel(r);
                        return (
                          <tr key={r.id} className="border-t border-interlan-border-gray">
                            <td className="px-4 py-3 font-nunito text-[14px]">{r.employeeName}</td>
                            <td className="px-4 py-3 font-nunito text-[14px]">{r.motivo}</td>
                            <td className="px-4 py-3 font-nunito text-[13px] text-interlan-text-secondary">{r.fechaInicio} — {r.fechaFin}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg font-nunito text-[11px] font-bold uppercase tracking-[0.05em] ${action.className}`}>
                                {action.text}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => navigate(getActionRoute(r))}
                                className="h-8 px-4 bg-interlan-blue text-white font-nunito text-[12px] font-bold rounded-lg hover:bg-interlan-blue/90 transition-colors"
                              >
                                Gestionar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actividad reciente */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-nunito font-bold text-[18px] text-foreground">Actividad reciente</h3>
                <button onClick={() => navigate('/aprobaciones')} className="font-nunito text-[14px] font-bold text-interlan-blue flex items-center gap-1 hover:gap-2 transition-all">
                  Ver todas <ArrowRight size={14} />
                </button>
              </div>
              <div className="border border-interlan-border-gray rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-interlan-light-gray">
                    <tr>
                      {['Empleado', 'Motivo', 'Fechas', 'Estado', 'Documentos'].map(h => (
                        <th key={h} className="text-left font-nunito text-[13px] font-semibold text-interlan-text-secondary px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actividadReciente.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center font-nunito text-[14px] text-interlan-text-muted">
                          No se encontraron solicitudes con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      actividadReciente.map(r => (
                        <tr key={r.id} className="border-t border-interlan-border-gray">
                          <td className="px-4 py-3 font-nunito text-[14px]">{r.employeeName}</td>
                          <td className="px-4 py-3 font-nunito text-[14px]">{r.motivo}</td>
                          <td className="px-4 py-3 font-nunito text-[13px] text-interlan-text-secondary">{r.fechaInicio} — {r.fechaFin}</td>
                          <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                          <td className="px-4 py-3 font-nunito text-[12px]">
                            <span className={`px-2 py-0.5 rounded-lg ${r.documentStatus === 'sin_documentos' ? 'bg-[#F0F0F0] text-[#444]' : r.documentStatus === 'documentos_cargados' ? 'bg-interlan-light-blue text-interlan-blue' : 'bg-[#E6F9EE] text-[#1A6B36]'}`}>
                              {r.documentStatus === 'sin_documentos' ? 'Sin documentos' : r.documentStatus === 'documentos_cargados' ? 'Cargados' : 'Finalizado'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
