import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import { useRequests } from '@/contexts/RequestsContext';
import { motivoRequiresDocuments, permissionTypes } from '@/data/mockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Filter, ExternalLink, FileText, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import ExportButton from '@/components/ExportButton';
import { supabase } from '@/integrations/supabase/client';

interface DocumentRecord {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size: number;
  created_at: string;
  solicitud_id: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const docStatusLabel: Record<string, { label: string; bg: string; text: string }> = {
  sin_documentos: { label: 'Sin documentos', bg: 'bg-[#F0F0F0]', text: 'text-[#444]' },
  documentos_cargados: { label: 'Documentos cargados', bg: 'bg-interlan-light-blue', text: 'text-interlan-blue' },
  aprobado_finalizado: { label: 'Aprobado y finalizado', bg: 'bg-[#E6F9EE]', text: 'text-[#1A6B36]' },
  mas_info: { label: 'Más información requerida', bg: 'bg-[#FFF8E0]', text: 'text-[#8A6500]' },
};

const motivosConSoportes = [
  'Calamidad doméstica grave',
  'Cita escolar acudiente',
  'Cita judicial o administrativa',
  'Cita médica acudiente',
  'Cita médica programada',
  'Derecho por jurado de votación',
  'Derecho por votación',
  'Luto',
  'Uso de bicicleta',
  'Graduación',
  'Sepelio otros familiares',
  'Luto mascotas',
  'Matrimonio',
];

const Documentos = () => {
  const { requests, updateRequest, sendNotification, isRealMode } = useRequests();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterMotivo, setFilterMotivo] = useState('');
  const [filterDocStatus, setFilterDocStatus] = useState('');
  const [allDocuments, setAllDocuments] = useState<DocumentRecord[]>([]);

  // Fetch all documents for display
  useEffect(() => {
    const fetchAllDocs = async () => {
      if (!isRealMode) return;
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setAllDocuments(data as DocumentRecord[]);
      if (error) console.error('Error fetching documents:', error);
    };
    fetchAllDocs();
  }, [isRealMode, requests]);

  // Only show requests alive in the documents stage.
  // Exclude terminal states (finalizado, denegado) and any rejection.
  const aliveStatuses: string[] = [
    'aprobado',
    'notificado',
    'soportes_pendientes',
    'soportes_en_revision',
    'mas_info_requerida',
  ];
  const allRequestsWithDocs = requests.filter(r =>
    motivosConSoportes.includes(r.motivo) &&
    aliveStatuses.includes(r.status) &&
    r.documentStatus !== 'aprobado_finalizado' &&
    !r.rejectedBy
  );

  const requestsWithDocs = useMemo(() => {
    return allRequestsWithDocs.filter(r => {
      if (filterEmployee && r.employeeName !== filterEmployee) return false;
      if (filterMotivo && r.motivo !== filterMotivo) return false;
      if (filterDocStatus && r.documentStatus !== filterDocStatus) return false;
      return true;
    });
  }, [allRequestsWithDocs, filterEmployee, filterMotivo, filterDocStatus]);

  const uniqueEmployees = useMemo(() => [...new Set(allRequestsWithDocs.map(r => r.employeeName))].sort((a, b) => a.localeCompare(b, 'es')), [allRequestsWithDocs]);
  const allMotivos = useMemo(() => [...new Set(Object.values(permissionTypes).flat())].sort((a, b) => a.localeCompare(b, 'es')), []);
  const hasActiveFilters = filterEmployee || filterMotivo || filterDocStatus;

  const clearFilters = () => {
    setFilterEmployee('');
    setFilterMotivo('');
    setFilterDocStatus('');
  };

  const getDocsForRequest = (requestId: string) => allDocuments.filter(d => d.solicitud_id === requestId);

  const handleViewDocument = async (doc: DocumentRecord) => {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('No se pudo obtener el documento.');
  };

  const handleDownloadDocument = async (doc: DocumentRecord) => {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.file_path, 3600, { download: true });
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.file_name;
      a.click();
    } else {
      toast.error('No se pudo descargar el documento.');
    }
  };

  const handleOpenModal = (requestId: string) => {
    setSelectedRequestId(requestId);
    setMessage('');
    setMessageError(false);
    setShowModal(true);
  };

  const handleOpenRejectModal = (requestId: string) => {
    setSelectedRequestId(requestId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleSendInfoRequest = async () => {
    if (!message.trim()) {
      setMessageError(true);
      return;
    }
    if (!selectedRequestId) return;

    const req = requests.find(r => r.id === selectedRequestId);
    updateRequest(selectedRequestId, {
      status: 'mas_info_requerida',
      documentStatus: 'mas_info',
      infoRequestMessage: message.trim(),
    });

    if (req) await sendNotification('mas_info', req, { message: message.trim() });

    setShowModal(false);
    setMessage('');
    setSelectedRequestId(null);
    toast.success('Solicitud de información enviada al empleado');
  };

  const handleApproveFinalize = async (requestId: string) => {
    const req = requests.find(r => r.id === requestId);
    updateRequest(requestId, {
      status: 'finalizado',
      documentStatus: 'aprobado_finalizado',
    });
    if (req) await sendNotification('finalizado', req);
    toast.success('Solicitud aprobada y finalizada');
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !selectedRequestId) return;
    const req = requests.find(r => r.id === selectedRequestId);
    const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ de /g, '/');
    updateRequest(selectedRequestId, {
      status: 'denegado',
      rejectionReason: rejectReason.trim(),
      rejectedBy: 'th',
      rejectionDate: today,
    });
    if (req) await sendNotification('th_deniega', req, { rejectionReason: rejectReason.trim() });
    setShowRejectModal(false);
    setRejectReason('');
    setSelectedRequestId(null);
    toast.success('Solicitud rechazada. El empleado ha sido notificado.');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <BackButton />
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-nunito font-bold text-[28px] text-foreground">Gestión de documentos</h1>
          <ExportButton
            allData={allRequestsWithDocs}
            filteredData={requestsWithDocs}
            filename="gestion_documentos"
            hasActiveFilters={!!hasActiveFilters}
          />
        </div>

        {/* Filters */}
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background">
                <option value="">Todos los empleados</option>
                {uniqueEmployees.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <select value={filterMotivo} onChange={e => setFilterMotivo(e.target.value)} className="h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background">
                <option value="">Todos los permisos</option>
                {allMotivos.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filterDocStatus} onChange={e => setFilterDocStatus(e.target.value)} className="h-9 px-2 border border-interlan-border-gray rounded-lg font-nunito text-[13px] bg-background">
                <option value="">Todos los estados</option>
                {[
                  { label: 'Documentos cargados', value: 'documentos_cargados' },
                  { label: 'Más información requerida', value: 'mas_info' },
                  { label: 'Sin documentos', value: 'sin_documentos' },
                ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block border border-interlan-border-gray rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-interlan-light-gray">
              <tr>
                {['Empleado', 'Tipo', 'Plazo de entrega', 'Estado documentos', 'Archivos', 'Acción'].map(h => (
                  <th key={h} className="text-left font-nunito text-[13px] font-semibold text-interlan-text-secondary px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requestsWithDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center font-nunito text-[14px] text-interlan-text-muted">
                    No se encontraron solicitudes con los filtros seleccionados.
                  </td>
                </tr>
              ) : requestsWithDocs.map(r => {
                const isUrgent = r.documentDeadline?.includes('mañana') || false;
                const hasDocs = r.documentStatus === 'documentos_cargados' || r.status === 'soportes_en_revision';
                const isSinDocs = r.documentStatus === 'sin_documentos' && !hasDocs;
                const docs = getDocsForRequest(r.id);
                return (
                  <tr key={r.id} className={`border-t border-interlan-border-gray ${isUrgent ? 'border-l-4 border-l-[#FFB800]' : ''}`}>
                    <td className="px-4 py-3 font-nunito text-[14px]">{r.employeeName}</td>
                    <td className="px-4 py-3 font-nunito text-[14px]">{r.motivo}</td>
                    <td className="px-4 py-3 font-nunito text-[13px] text-interlan-text-secondary">{r.documentDeadline || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-lg font-nunito text-[11px] font-bold ${docStatusLabel[r.documentStatus]?.bg || 'bg-[#F0F0F0]'} ${docStatusLabel[r.documentStatus]?.text || 'text-[#444]'}`}>
                        {docStatusLabel[r.documentStatus]?.label || r.documentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {docs.length > 0 ? (
                        <div className="space-y-1">
                          {docs.map(doc => (
                            <div key={doc.id} className="flex items-center gap-2">
                              <FileText size={14} className="text-interlan-blue shrink-0" />
                              <span className="font-nunito text-[12px] text-foreground truncate max-w-[120px]" title={doc.file_name}>{doc.file_name}</span>
                              <span className="font-nunito text-[11px] text-interlan-text-muted">{doc.file_type.split('/')[1]?.toUpperCase()}</span>
                              <button onClick={() => handleViewDocument(doc)} className="p-1 rounded hover:bg-interlan-light-blue" title="Ver">
                                <Eye size={13} className="text-interlan-blue" />
                              </button>
                              <button onClick={() => handleDownloadDocument(doc)} className="p-1 rounded hover:bg-interlan-light-blue" title="Descargar">
                                <Download size={13} className="text-interlan-blue" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="font-nunito text-[12px] text-interlan-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {isSinDocs ? (
                          <span className="px-3 py-1 text-[13px] font-nunito text-interlan-text-muted italic">Este empleado aún no ha cargado documentos.</span>
                        ) : (
                          <button
                            onClick={() => navigate(`/mis-solicitudes/${r.id}`)}
                            className="flex items-center gap-1 px-3 py-1 text-[13px] font-nunito font-bold text-interlan-blue hover:underline"
                          >
                            Ver detalle <ExternalLink size={12} />
                          </button>
                        )}
                        {hasDocs && (
                          <>
                            <button onClick={() => handleApproveFinalize(r.id)} className="px-3 py-1 text-[13px] font-nunito font-bold border border-[#00C853] text-[#1A6B36] rounded-[6px] hover:bg-[#E6F9EE]">Aprobar y finalizar</button>
                            <button onClick={() => handleOpenRejectModal(r.id)} className="px-3 py-1 text-[13px] font-nunito font-bold border border-[#E53935] text-[#8B1A1A] rounded-[6px] hover:bg-[#FDECEA]">Rechazar</button>
                          </>
                        )}
                        <button onClick={() => handleOpenModal(r.id)} className="px-3 py-1 text-[13px] font-nunito font-bold border border-interlan-border-gray rounded-[6px] hover:bg-interlan-light-gray">Solicitar más info</button>
                        {r.documentStatus === 'mas_info' && (
                          <span className="px-3 py-1 text-[13px] font-nunito text-interlan-text-muted italic">Esperando respuesta</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {requestsWithDocs.map(r => {
            const hasDocs = r.documentStatus === 'documentos_cargados' || r.status === 'soportes_en_revision';
            const docs = getDocsForRequest(r.id);
            return (
              <div key={r.id} className="border border-interlan-border-gray rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-nunito text-[14px] font-bold">{r.employeeName}</span>
                  <span className={`px-2 py-0.5 rounded-lg font-nunito text-[11px] font-bold ${docStatusLabel[r.documentStatus]?.bg || 'bg-[#F0F0F0]'} ${docStatusLabel[r.documentStatus]?.text || 'text-[#444]'}`}>
                    {docStatusLabel[r.documentStatus]?.label || r.documentStatus}
                  </span>
                </div>
                <p className="font-nunito text-[13px] text-interlan-text-secondary">{r.motivo}</p>
                {r.documentDeadline && <p className="font-nunito text-[12px] text-interlan-text-muted mt-1">Plazo: {r.documentDeadline}</p>}
                {docs.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-2">
                        <FileText size={14} className="text-interlan-blue shrink-0" />
                        <span className="font-nunito text-[12px] text-foreground truncate">{doc.file_name}</span>
                        <button onClick={() => handleViewDocument(doc)} className="p-1"><Eye size={13} className="text-interlan-blue" /></button>
                        <button onClick={() => handleDownloadDocument(doc)} className="p-1"><Download size={13} className="text-interlan-blue" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {r.documentStatus === 'sin_documentos' && r.status !== 'soportes_en_revision' ? (
                    <span className="text-[13px] font-nunito text-interlan-text-muted italic">Este empleado aún no ha cargado documentos.</span>
                  ) : (
                    <button onClick={() => navigate(`/mis-solicitudes/${r.id}`)} className="flex items-center gap-1 text-[13px] font-nunito font-bold text-interlan-blue">
                      Ver detalle <ExternalLink size={12} />
                    </button>
                  )}
                  {hasDocs && (
                    <>
                      <button onClick={() => handleApproveFinalize(r.id)} className="flex-1 py-1.5 text-[13px] font-nunito font-bold border border-[#00C853] text-[#1A6B36] rounded-[6px]">Finalizar</button>
                      <button onClick={() => handleOpenRejectModal(r.id)} className="flex-1 py-1.5 text-[13px] font-nunito font-bold border border-[#E53935] text-[#8B1A1A] rounded-[6px]">Rechazar</button>
                    </>
                  )}
                  <button onClick={() => handleOpenModal(r.id)} className="flex-1 py-1.5 text-[13px] font-nunito font-bold border border-interlan-border-gray rounded-[6px]">Solicitar info</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* More info modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-nunito">Solicitar más información</DialogTitle>
          </DialogHeader>
          <div>
            <label className="block font-nunito text-[13px] font-semibold text-interlan-text-secondary mb-1.5">Mensaje para el empleado <span className="text-status-denegado-text">*</span></label>
            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value); setMessageError(false); }}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg font-nunito text-[14px] resize-none ${messageError ? 'border-status-denegado-border' : 'border-interlan-border-gray'}`}
              placeholder="Describe qué documento o información falta..."
            />
            {messageError && (
              <p className="font-nunito text-[12px] text-status-denegado-text mt-1">Este campo es obligatorio para continuar.</p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 font-nunito text-[14px] border border-interlan-border-gray rounded-[6px]">Cancelar</button>
            <button disabled={!message.trim()} onClick={handleSendInfoRequest} className={`px-4 py-2 font-nunito text-[14px] font-bold bg-interlan-blue text-white rounded-[6px] ${!message.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>Enviar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-nunito">Rechazar solicitud</DialogTitle>
          </DialogHeader>
          <div>
            <label className="block font-nunito text-[13px] font-semibold text-interlan-text-secondary mb-1.5">Motivo del rechazo <span className="text-[#E53935]">*</span></label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-interlan-border-gray rounded-lg font-nunito text-[14px] resize-none"
              placeholder="Escribe el motivo del rechazo..."
            />
          </div>
          <DialogFooter>
            <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 font-nunito text-[14px] border border-interlan-border-gray rounded-[6px]">Cancelar</button>
            <button disabled={!rejectReason.trim()} onClick={handleReject} className={`px-4 py-2 font-nunito text-[14px] font-bold bg-[#E53935] text-white rounded-[6px] ${!rejectReason.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>Rechazar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documentos;
