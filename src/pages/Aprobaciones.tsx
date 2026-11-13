import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import StatusBadge from '@/components/StatusBadge';
import { permissionTypes } from '@/data/mockData';
import { useRequests } from '@/contexts/RequestsContext';
import { supabase } from '@/integrations/supabase/client';
import { Filter, ExternalLink, FileText, Eye, Download } from 'lucide-react';
import ExportButton from '@/components/ExportButton';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type Tab = 'pendientes' | 'gestionadas' | 'revision_soportes';

const NOTIFY_ONLY_MOTIVOS = [
  'Cita escolar acudiente',
  'Cita judicial o administrativa',
  'Cita médica acudiente',
  'Cita médica programada',
  'Derecho por jurado de votación',
  'Derecho por votación',
  'Luto',
  'Uso de bicicleta',
];

const Aprobaciones = () => {
  const { user } = useAuth();
  const { requests, updateRequest, sendNotification } = useRequests();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('pendientes');
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [moreInfoMessage, setMoreInfoMessage] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [showCalamidadDetail, setShowCalamidadDetail] = useState(false);
  const [calamidadDetailId, setCalamidadDetailId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterMotivo, setFilterMotivo] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [docsModalId, setDocsModalId] = useState('');
  const [docsModalFiles, setDocsModalFiles] = useState<{ id: string; file_name: string; file_type: string; file_path: string; file_size: number }[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const isHr = user?.role === 'hr';

  const openDocsModal = async (solicitudId: string) => {
    setDocsModalId(solicitudId);
    setShowDocsModal(true);
    setLoadingDocs(true);
    const { data } = await supabase
      .from('documentos')
      .select('*')
      .eq('solicitud_id', solicitudId)
      .order('created_at', { ascending: false });
    setDocsModalFiles((data as any[]) || []);
    setLoadingDocs(false);
  };

  const handleViewDoc = async (doc: { file_path: string }) => {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('No se pudo obtener el documento.');
  };

  const handleDownloadDoc = async (doc: { file_path: string; file_name: string }) => {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.file_path, 3600, { download: true });
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.file_name;
      a.click();
    } else toast.error('No se pudo descargar el documento.');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // For Leader: pendientes = status pendiente
  // For HR: pendientes = status en_revision_th (calamidad waiting for TH validation)
  const pendientes = isHr
    ? requests.filter(r => r.status === 'en_revision_th')
    : requests.filter(r => r.status === 'pendiente');

  const gestionadas = requests.filter(r =>
    ['aprobado', 'denegado', 'finalizado', 'notificado', 'soportes_pendientes'].includes(r.status)
  );

  // HR: documents uploaded, waiting for TH review
  const revisionSoportes = requests.filter(r => r.status === 'soportes_en_revision');

  const tabs: { label: string; value: Tab }[] = [
    { label: 'Pendientes', value: 'pendientes' },
    { label: 'Gestionadas', value: 'gestionadas' },
    ...(isHr ? [
      { label: 'Revisión de soportes', value: 'revision_soportes' as Tab },
    ] : []),
  ];

  const baseRequests =
    tab === 'pendientes' ? pendientes
    : tab === 'gestionadas' ? gestionadas
    : revisionSoportes;

  // Filters (only for pendientes and gestionadas tabs, leader only)
  const showFilterBar = !isHr && (tab === 'pendientes' || tab === 'gestionadas');

  const currentRequests = useMemo(() => {
    if (!showFilterBar) return baseRequests;
    return baseRequests.filter(r => {
      if (filterEmployee && r.employeeName !== filterEmployee) return false;
      if (filterMotivo && r.motivo !== filterMotivo) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterFecha && !r.fechaInicio.includes(filterFecha)) return false;
      return true;
    });
  }, [baseRequests, showFilterBar, filterEmployee, filterMotivo, filterStatus, filterFecha]);

  const uniqueEmployees = useMemo(() => [...new Set(baseRequests.map(r => r.employeeName))].sort((a, b) => a.localeCompare(b, 'es')), [baseRequests]);
  const allMotivos = useMemo(() => [...new Set(Object.values(permissionTypes).flat())].sort((a, b) => a.localeCompare(b, 'es')), []);
  const hasActiveFilters = filterEmployee || filterMotivo || filterFecha || filterStatus;

  const clearFilters = () => {
    setFilterEmployee('');
    setFilterMotivo('');
    setFilterFecha('');
    setFilterStatus('');
  };

  // Get action buttons for a request
  const renderActions = (r: typeof currentRequests[0]) => {
    // Leader: pending requests
    if (r.status === 'pendiente' && !isHr) {
      if (NOTIFY_ONLY_MOTIVOS.includes(r.motivo)) {
        return (
          <button
            onClick={() => { setSelectedId(r.id); setShowNotifyModal(true); }}
            className="px-3 py-1 text-[13px] font-nunito font-bold border border-interlan-blue text-interlan-blue rounded-[6px] hover:bg-interlan-light-blue"
          >
            Marcar como notificado
          </button>
        );
      }
      return (
        <div className="flex gap-2">
          {(r.motivo === 'Calamidad doméstica grave' || r.motivo === 'Traslado temporal por teletrabajo móvil') && (
            <button
              onClick={() => { setCalamidadDetailId(r.id); setShowCalamidadDetail(true); }}
              className="px-3 py-1 text-[13px] font-nunito font-bold border border-interlan-blue text-interlan-blue rounded-[6px] hover:bg-interlan-light-blue"
            >
              Ver detalle
            </button>
          )}
          <button
            onClick={() => { setSelectedId(r.id); setShowApproveModal(true); }}
            className="px-3 py-1 text-[13px] font-nunito font-bold border border-[#00C853] text-[#1A6B36] rounded-[6px] hover:bg-[#E6F9EE]"
          >
            {r.motivo === 'Calamidad doméstica grave' ? 'Validar calamidad' : 'Aprobar'}
          </button>
          <button
            onClick={() => { setSelectedId(r.id); setShowDenyModal(true); }}
            className="px-3 py-1 text-[13px] font-nunito font-bold border border-[#E53935] text-[#8B1A1A] rounded-[6px] hover:bg-[#FDECEA]"
          >
            Rechazar
          </button>
        </div>
      );
    }

    // HR: en_revision_th — validate calamidad or traslado (approve/deny only)
    if (isHr && r.status === 'en_revision_th' && tab === 'pendientes') {
      return (
        <div className="flex gap-2">
          {(r.motivo === 'Calamidad doméstica grave' || r.motivo === 'Traslado temporal por teletrabajo móvil') && (
            <button
              onClick={() => { setCalamidadDetailId(r.id); setShowCalamidadDetail(true); }}
              className="px-3 py-1 text-[13px] font-nunito font-bold border border-interlan-blue text-interlan-blue rounded-[6px] hover:bg-interlan-light-blue"
            >
              Ver detalle
            </button>
          )}
          <button
            onClick={() => { setSelectedId(r.id); setShowApproveModal(true); }}
            className="px-3 py-1 text-[13px] font-nunito font-bold border border-[#00C853] text-[#1A6B36] rounded-[6px] hover:bg-[#E6F9EE]"
          >
            {r.motivo === 'Traslado temporal por teletrabajo móvil' ? 'Aprobar traslado' : 'Aprobar permiso'}
          </button>
          <button
            onClick={() => { setSelectedId(r.id); setShowDenyModal(true); }}
            className="px-3 py-1 text-[13px] font-nunito font-bold border border-[#E53935] text-[#8B1A1A] rounded-[6px] hover:bg-[#FDECEA]"
          >
            Rechazar
          </button>
        </div>
      );
    }

    // HR: soportes_en_revision — final doc review (approve/deny/more info)
    if (isHr && r.status === 'soportes_en_revision' && tab === 'revision_soportes') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => openDocsModal(r.id)}
            className="px-3 py-1 text-[13px] font-nunito font-bold border border-interlan-blue text-interlan-blue rounded-[6px] hover:bg-interlan-light-blue"
          >
            <span className="flex items-center gap-1"><FileText size={12} /> Ver docs</span>
          </button>
          <button
            onClick={() => { setSelectedId(r.id); setShowApproveModal(true); }}
            className="px-3 py-1 text-[13px] font-nunito font-bold border border-[#00C853] text-[#1A6B36] rounded-[6px] hover:bg-[#E6F9EE]"
          >
            Aprobar
          </button>
          <button
            onClick={() => { setSelectedId(r.id); setShowDenyModal(true); }}
            className="px-3 py-1 text-[13px] font-nunito font-bold border border-[#E53935] text-[#8B1A1A] rounded-[6px] hover:bg-[#FDECEA]"
          >
            Rechazar
          </button>
          <button
            onClick={() => { setSelectedId(r.id); setShowMoreInfoModal(true); }}
            className="px-3 py-1 text-[13px] font-nunito font-bold border border-[#F59E0B] text-[#92400E] rounded-[6px] hover:bg-[#FEF3C7]"
          >
            Más info
          </button>
        </div>
      );
    }

    // View detail link for gestionadas
    if (tab === 'gestionadas') {
      return (
        <div className="flex gap-2">
          {(r.motivo === 'Calamidad doméstica grave' || r.motivo === 'Traslado temporal por teletrabajo móvil') && (
            <button
              onClick={() => { setCalamidadDetailId(r.id); setShowCalamidadDetail(true); }}
              className="flex items-center gap-1 px-3 py-1 text-[13px] font-nunito font-bold border border-interlan-blue text-interlan-blue rounded-[6px] hover:bg-interlan-light-blue"
            >
              Ver detalle
            </button>
          )}
          {r.documentStatus === 'documentos_cargados' || r.documentStatus === 'aprobado_finalizado' ? (
            <button
              onClick={() => openDocsModal(r.id)}
              className="flex items-center gap-1 px-3 py-1 text-[13px] font-nunito font-bold border border-interlan-blue text-interlan-blue rounded-[6px] hover:bg-interlan-light-blue"
            >
              <FileText size={12} /> Ver documentos
            </button>
          ) : null}
          <button
            onClick={() => navigate(`/mis-solicitudes/${r.id}`)}
            className="flex items-center gap-1 px-3 py-1 text-[13px] font-nunito font-bold text-interlan-blue hover:underline"
          >
            Ver solicitud <ExternalLink size={12} />
          </button>
        </div>
      );
    }

    // For pending calamidad requests, show detail button alongside actions
    return <span className="font-nunito text-[13px] text-interlan-text-muted">—</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <BackButton />
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-nunito font-bold text-[28px] text-foreground">Aprobaciones</h1>
          {!isHr && (
            <ExportButton
              allData={baseRequests}
              filteredData={currentRequests}
              filename="solicitudes_equipo"
              hasActiveFilters={!!hasActiveFilters}
            />
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-interlan-light-gray rounded-lg p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 rounded-md font-nunito text-[13px] font-bold transition-colors ${
                tab === t.value ? 'bg-background text-foreground shadow-sm' : 'text-interlan-text-muted'
              }`}
            >
              {t.label}
              {t.value === 'pendientes' && pendientes.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[11px] bg-interlan-blue text-white rounded-full">{pendientes.length}</span>
              )}
              {t.value === 'revision_soportes' && revisionSoportes.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[11px] bg-interlan-blue text-white rounded-full">{revisionSoportes.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Filters for leader */}
        {showFilterBar && (
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
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
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background">
                  <option value="">Todos los empleados</option>
                  {uniqueEmployees.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select value={filterMotivo} onChange={e => setFilterMotivo(e.target.value)} className="h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background">
                  <option value="">Todos los permisos</option>
                  {allMotivos.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="text" value={filterFecha} onChange={e => setFilterFecha(e.target.value)} placeholder="Filtrar por fecha..." className="h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background" />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background">
                  <option value="">Todos los estados</option>
                  {['Aprobado', 'Rechazado', 'Finalizado', 'Notificado', 'Pendiente'].map(label => {
                    const valueMap: Record<string, string> = { 'Aprobado': 'aprobado', 'Rechazado': 'denegado', 'Finalizado': 'finalizado', 'Notificado': 'notificado', 'Pendiente': 'pendiente' };
                    return <option key={label} value={valueMap[label]}>{label}</option>;
                  })}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block border border-interlan-border-gray rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-interlan-light-gray">
              <tr>
                {['Empleado', 'Tipo de permiso', 'Fechas', 'Días', 'Enviada', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left font-nunito text-[13px] font-semibold text-interlan-text-secondary px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center font-nunito text-[14px] text-interlan-text-muted">
                    No hay solicitudes en esta categoría.
                  </td>
                </tr>
              ) : currentRequests.map(r => (
                <tr key={r.id} className="border-t border-interlan-border-gray hover:bg-interlan-light-gray/50 cursor-pointer" onClick={() => navigate(`/mis-solicitudes/${r.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-interlan-blue rounded-full flex items-center justify-center">
                        <span className="text-white text-[11px] font-bold">{r.employeeInitials}</span>
                      </div>
                      <span className="font-nunito text-[14px]">{r.employeeName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-nunito text-[14px]">{r.motivo}</td>
                  <td className="px-4 py-3 font-nunito text-[13px] text-interlan-text-secondary">{r.fechaInicio} — {r.fechaFin}</td>
                  <td className="px-4 py-3 font-nunito text-[14px]">{r.diasHabiles}</td>
                  <td className="px-4 py-3 font-nunito text-[13px] text-interlan-text-muted">{r.fechaSolicitud}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {renderActions(r)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {currentRequests.map(r => (
            <div key={r.id} className="border border-interlan-border-gray rounded-xl p-4" onClick={() => navigate(`/mis-solicitudes/${r.id}`)}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-interlan-blue rounded-full flex items-center justify-center">
                    <span className="text-white text-[11px] font-bold">{r.employeeInitials}</span>
                  </div>
                  <span className="font-nunito text-[14px] font-bold">{r.employeeName}</span>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="font-nunito text-[13px] text-interlan-text-secondary">{r.motivo}</p>
              <p className="font-nunito text-[12px] text-interlan-text-muted mt-1">{r.fechaInicio} — {r.fechaFin} · {r.diasHabiles} día(s)</p>
              <div onClick={e => e.stopPropagation()} className="mt-3">
                {renderActions(r)}
              </div>
            </div>
          ))}
          {currentRequests.length === 0 && (
            <p className="text-center font-nunito text-[15px] text-interlan-text-muted py-12">No hay solicitudes en esta categoría.</p>
          )}
        </div>
      </div>

      {/* Approve modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-nunito">Confirmar aprobación</DialogTitle>
          </DialogHeader>
          <p className="font-nunito text-[14px] text-interlan-text-secondary">
            {(() => {
              const req = requests.find(r => r.id === selectedId);
              if (isHr && tab === 'pendientes' && req?.status === 'en_revision_th') {
                if (req.motivo === 'Traslado temporal por teletrabajo móvil')
                  return 'Se aprobará el traslado temporal por teletrabajo móvil. El empleado será notificado por correo confirmando el traslado autorizado.';
                return 'Se aprobará el permiso de calamidad doméstica. El empleado será notificado por correo para que tome su calamidad y luego cargue los documentos de soporte.';
              }
              if (isHr && tab === 'revision_soportes')
                return 'Los documentos serán aprobados y la solicitud se dará por finalizada.';
              if (req?.motivo === 'Calamidad doméstica grave')
                return 'Se validará la calamidad y pasará a revisión de Talento Humano.';
              if (req?.motivo === 'Traslado temporal por teletrabajo móvil')
                return 'La solicitud será aprobada por ti y pasará a revisión de Talento Humano.';
              return 'La solicitud será aprobada y se notificará al empleado por correo.';
            })()}
          </p>
          <DialogFooter>
            <button onClick={() => setShowApproveModal(false)} className="px-4 py-2 font-nunito text-[14px] border border-interlan-border-gray rounded-[6px]">Cancelar</button>
            <button onClick={async () => {
              if (!selectedId) return;
              const req = requests.find(r => r.id === selectedId);
              if (!req) return;

              if (isHr && tab === 'pendientes' && req.status === 'en_revision_th') {
                if (req.motivo === 'Traslado temporal por teletrabajo móvil') {
                  // TH final approval for Traslado → APROBADO (flow ends, no soportes)
                  updateRequest(selectedId, { status: 'aprobado', documentStatus: 'aprobado_finalizado' });
                  await sendNotification('th_aprueba', req);
                  toast.success('Traslado aprobado por Talento Humano. El empleado ha sido notificado.');
                } else {
                  // TH validates calamidad → approve permission
                  updateRequest(selectedId, { status: 'aprobado' });
                  await sendNotification('th_aprueba', req);
                  toast.success('Permiso de calamidad aprobado. El empleado ha sido notificado.');
                }
              } else if (isHr && tab === 'revision_soportes') {
                // TH final doc approval → finalized
                updateRequest(selectedId, { status: 'finalizado', documentStatus: 'aprobado_finalizado' });
                await sendNotification('finalizado', req);
                toast.success('Solicitud aprobada y finalizada.');
              } else {
                // Leader actions
                if (req.motivo === 'Calamidad doméstica grave') {
                  updateRequest(selectedId, { status: 'en_revision_th' });
                  await sendNotification('lider_aprueba', req, { requiresDocs: 'false' });
                  toast.success('Calamidad validada por el líder. Pasó a revisión de Talento Humano.');
                } else if (req.motivo === 'Traslado temporal por teletrabajo móvil') {
                  updateRequest(selectedId, { status: 'en_revision_th' });
                  await sendNotification('lider_aprueba', req, { requiresDocs: 'false' });
                  toast.success('Traslado aprobado por el líder. Pasó a revisión de Talento Humano.');
                } else if (req.motivo === 'Cumpleaños' || req.motivo === 'Quinquenio' || req.motivo === 'Diligencias personales') {
                  // Cumpleaños / Quinquenio / Diligencias personales: aprobación del líder finaliza el flujo (sin soportes, sin TH)
                  updateRequest(selectedId, { status: 'finalizado', documentStatus: 'aprobado_finalizado' });
                  await sendNotification('lider_aprueba', req, { requiresDocs: 'false' });
                  toast.success('Solicitud aprobada y finalizada.');
                } else if (req.motivo === 'Sepelio compañeros' || req.motivo === 'Graduación' || req.motivo === 'Sepelio otros familiares' || req.motivo === 'Luto mascotas' || req.motivo === 'Matrimonio') {
                  updateRequest(selectedId, { status: 'aprobado' });
                  const requiresDocs = (req.motivo === 'Graduación' || req.motivo === 'Sepelio otros familiares' || req.motivo === 'Luto mascotas' || req.motivo === 'Matrimonio') ? 'true' : 'false';
                  await sendNotification('lider_aprueba', req, { requiresDocs });
                  toast.success('Solicitud aprobada.');
                } else {
                  updateRequest(selectedId, { status: 'notificado' });
                  await sendNotification('lider_notifica', req);
                  toast.success('Solicitud marcada como notificada.');
                }
              }
              setShowApproveModal(false);
              setSelectedId('');
            }} className="px-4 py-2 font-nunito text-[14px] font-bold bg-interlan-blue text-white rounded-[6px]">Confirmar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny modal */}
      <Dialog open={showDenyModal} onOpenChange={setShowDenyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-nunito">Rechazar solicitud</DialogTitle>
          </DialogHeader>
          <div>
            <label className="block font-nunito text-[13px] font-semibold text-interlan-text-secondary mb-1.5">Motivo del rechazo <span className="text-[#E53935]">*</span></label>
            <textarea
              value={denyReason}
              onChange={e => setDenyReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background resize-none"
              placeholder="Escribe el motivo..."
            />
          </div>
          <DialogFooter>
            <button onClick={() => setShowDenyModal(false)} className="px-4 py-2 font-nunito text-[14px] border border-interlan-border-gray rounded-[6px]">Cancelar</button>
            <button disabled={!denyReason.trim()} onClick={async () => {
              if (!selectedId) return;
              const req = requests.find(r => r.id === selectedId);
              const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ de /g, '/');
              updateRequest(selectedId, {
                status: 'denegado',
                rejectionReason: denyReason.trim(),
                rejectedBy: isHr ? 'th' : 'lider',
                rejectionDate: today,
              });
              if (req) {
                const event = isHr ? 'th_deniega' : 'lider_deniega';
                await sendNotification(event, req, { rejectionReason: denyReason.trim() });
              }
              toast.success('Solicitud rechazada.');
              setShowDenyModal(false);
              setDenyReason('');
              setSelectedId('');
            }} className={`px-4 py-2 font-nunito text-[14px] font-bold bg-[#E53935] text-white rounded-[6px] ${!denyReason.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>Rechazar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* More info modal (TH only, revision_soportes tab) */}
      <Dialog open={showMoreInfoModal} onOpenChange={setShowMoreInfoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-nunito">Solicitar más información</DialogTitle>
          </DialogHeader>
          <div>
            <label className="block font-nunito text-[13px] font-semibold text-interlan-text-secondary mb-1.5">¿Qué información adicional necesitas? <span className="text-[#E53935]">*</span></label>
            <textarea
              value={moreInfoMessage}
              onChange={e => setMoreInfoMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background resize-none"
              placeholder="Describe qué documentos o información necesitas..."
            />
          </div>
          <DialogFooter>
            <button onClick={() => setShowMoreInfoModal(false)} className="px-4 py-2 font-nunito text-[14px] border border-interlan-border-gray rounded-[6px]">Cancelar</button>
            <button disabled={!moreInfoMessage.trim()} onClick={async () => {
              if (!selectedId) return;
              const req = requests.find(r => r.id === selectedId);
              updateRequest(selectedId, { status: 'mas_info_requerida', documentStatus: 'mas_info', infoRequestMessage: moreInfoMessage.trim() });
              if (req) await sendNotification('mas_info', req, { message: moreInfoMessage.trim() });
              toast.success('Solicitud de más información enviada al empleado.');
              setShowMoreInfoModal(false);
              setMoreInfoMessage('');
              setSelectedId('');
            }} className={`px-4 py-2 font-nunito text-[14px] font-bold bg-[#F59E0B] text-white rounded-[6px] ${!moreInfoMessage.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>Enviar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify modal */}
      <Dialog open={showNotifyModal} onOpenChange={setShowNotifyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-nunito">Marcar como notificado</DialogTitle>
          </DialogHeader>
          <p className="font-nunito text-[14px] text-interlan-text-secondary">La solicitud será marcada como notificada. Este permiso no requiere aprobación del líder.</p>
          <DialogFooter>
            <button onClick={() => setShowNotifyModal(false)} className="px-4 py-2 font-nunito text-[14px] border border-interlan-border-gray rounded-[6px]">Cancelar</button>
            <button onClick={async () => {
              if (selectedId) {
                const req = requests.find(r => r.id === selectedId);
                updateRequest(selectedId, { status: 'notificado' });
                if (req) await sendNotification('lider_notifica', req);
                toast.success('Solicitud marcada como notificada.');
              }
              setShowNotifyModal(false);
              setSelectedId('');
            }} className="px-4 py-2 font-nunito text-[14px] font-bold bg-interlan-blue text-white rounded-[6px]">Confirmar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calamidad / Traslado detail modal */}
      <Dialog open={showCalamidadDetail} onOpenChange={setShowCalamidadDetail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-nunito">
              {(() => {
                const req = requests.find(r => r.id === calamidadDetailId);
                return req?.motivo === 'Traslado temporal por teletrabajo móvil' ? 'Detalle del traslado temporal' : 'Detalle de calamidad doméstica';
              })()}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const req = requests.find(r => r.id === calamidadDetailId);
            if (!req) return null;
            const isTr = req.motivo === 'Traslado temporal por teletrabajo móvil';
            const items = isTr ? [
              { label: 'Empleado', value: req.employeeName },
              { label: 'Área', value: req.employeeArea },
              { label: 'Dirección', value: req.direccion || '—' },
              { label: 'Ciudad', value: req.ciudad || '—' },
              { label: 'País', value: req.pais || '—' },
              { label: 'Fecha inicio', value: req.fechaInicio },
              { label: 'Fecha fin', value: req.fechaFin },
              ...(req.horaInicio ? [{ label: 'Hora inicio', value: req.horaInicio }] : []),
              ...(req.horaFin ? [{ label: 'Hora fin', value: req.horaFin }] : []),
            ] : [
              { label: 'Empleado', value: req.employeeName },
              { label: 'Área', value: req.employeeArea },
              { label: 'Tipo de calamidad', value: req.calamidadTipo || '—' },
              { label: 'Subcategoría', value: req.calamidadSubcategoria || '—' },
              { label: 'Fecha inicio', value: req.fechaInicio },
              { label: 'Fecha fin', value: req.fechaFin },
              ...(req.horaInicio ? [{ label: 'Hora inicio', value: req.horaInicio }] : []),
              ...(req.horaFin ? [{ label: 'Hora fin', value: req.horaFin }] : []),
              { label: 'Días hábiles', value: String(req.diasHabiles) },
            ];
            return (
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className="font-nunito text-[13px] text-interlan-text-secondary">{item.label}</span>
                    <span className="font-nunito text-[13px] font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
                {!isTr && req.calamidadDescripcion && (
                  <div>
                    <span className="font-nunito text-[13px] text-interlan-text-secondary block mb-1">Descripción del empleado</span>
                    <p className="font-nunito text-[13px] text-foreground bg-interlan-light-gray rounded-lg p-3 whitespace-pre-wrap">{req.calamidadDescripcion}</p>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <button onClick={() => setShowCalamidadDetail(false)} className="px-4 py-2 font-nunito text-[14px] border border-interlan-border-gray rounded-[6px]">Cerrar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Documents modal */}
      <Dialog open={showDocsModal} onOpenChange={setShowDocsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-nunito">Documentos cargados</DialogTitle>
          </DialogHeader>
          {loadingDocs ? (
            <p className="font-nunito text-[14px] text-interlan-text-muted py-4">Cargando documentos...</p>
          ) : docsModalFiles.length === 0 ? (
            <p className="font-nunito text-[14px] text-interlan-text-muted py-4">No hay documentos cargados para esta solicitud.</p>
          ) : (
            <div className="space-y-3">
              {docsModalFiles.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-interlan-border-gray rounded-lg bg-interlan-light-gray">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-interlan-blue shrink-0" />
                    <div>
                      <p className="font-nunito text-[14px] font-semibold text-foreground">{doc.file_name}</p>
                      <p className="font-nunito text-[12px] text-interlan-text-muted">
                        {doc.file_type.split('/')[1]?.toUpperCase() || doc.file_type} · {formatFileSize(doc.file_size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleViewDoc(doc)} className="p-2 rounded-md hover:bg-interlan-light-blue transition-colors" title="Ver documento">
                      <Eye size={16} className="text-interlan-blue" />
                    </button>
                    <button onClick={() => handleDownloadDoc(doc)} className="p-2 rounded-md hover:bg-interlan-light-blue transition-colors" title="Descargar documento">
                      <Download size={16} className="text-interlan-blue" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setShowDocsModal(false)} className="px-4 py-2 font-nunito text-[14px] border border-interlan-border-gray rounded-[6px]">Cerrar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Aprobaciones;
