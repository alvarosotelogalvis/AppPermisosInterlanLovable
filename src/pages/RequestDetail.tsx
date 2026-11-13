import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import StatusBadge from '@/components/StatusBadge';
import { useRequests } from '@/contexts/RequestsContext';
import { motivoRequiresDocuments } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Check, X, AlertTriangle, FileText, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MOTIVOS_SIN_CARGA_EMPLEADO = ['Sepelio compañeros', 'Uso de bicicleta', 'Derecho por jurado de votación'];

interface DocumentRecord {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requests, updateRequest, sendNotification, isRealMode } = useRequests();
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showConfirmUpload, setShowConfirmUpload] = useState(false);
  const request = requests.find(r => r.id === id);

  // Fetch documents from DB — always fetch regardless of mode
  useEffect(() => {
    const fetchDocs = async () => {
      if (!request) return;
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('solicitud_id', request.id)
        .order('created_at', { ascending: false });
      if (data) setDocuments(data as DocumentRecord[]);
      if (error) console.error('Error fetching documents:', error);
    };
    fetchDocs();
  }, [id, request?.id]);

  // Security: redirect if request not found or employee trying to view someone else's request
  if (!request) {
    toast.error('No tienes permiso para ver esta solicitud.');
    return <Navigate to="/mis-solicitudes" replace />;
  }

  if (user?.role === 'employee' && request.employeeId !== user.id) {
    toast.error('No tienes permiso para ver esta solicitud.');
    return <Navigate to="/mis-solicitudes" replace />;
  }

  const handleSelectFiles = (files?: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const invalid = fileArray.some(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return !ALLOWED_FILE_TYPES.includes(f.type) && !ALLOWED_EXTENSIONS.includes(ext);
    });
    if (invalid) {
      setFileError('Solo se permiten archivos PDF, JPG o PNG.');
      return;
    }
    const tooLarge = fileArray.some(f => f.size > MAX_FILE_SIZE);
    if (tooLarge) {
      setFileError('El archivo no puede superar 5MB.');
      return;
    }

    setFileError('');
    setPendingFiles(fileArray);
    setShowConfirmUpload(true);
  };

  const handleConfirmUpload = async () => {
    setShowConfirmUpload(false);
    if (pendingFiles.length === 0) return;

    setUploading(true);

    try {
      if (isRealMode) {
        for (const file of pendingFiles) {
          const filePath = `${request.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('documentos')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error(`Error al cargar ${file.name}`);
            continue;
          }

          await supabase.from('documentos').insert({
            solicitud_id: request.id,
            file_name: file.name,
            file_type: file.type,
            file_path: filePath,
            file_size: file.size,
          });
        }

        const { data } = await supabase
          .from('documentos')
          .select('*')
          .eq('solicitud_id', request.id)
          .order('created_at', { ascending: false });
        if (data) setDocuments(data as DocumentRecord[]);
      }

      const nextStatus = ['aprobado', 'soportes_pendientes', 'mas_info_requerida'].includes(request.status)
        ? 'soportes_en_revision'
        : request.status;

      updateRequest(request.id, {
        status: nextStatus,
        documentStatus: 'documentos_cargados',
        infoRequestMessage: request.status === 'mas_info_requerida' ? undefined : request.infoRequestMessage,
      });
      await sendNotification('docs_cargados', request);
      toast.success('Tus documentos fueron cargados exitosamente y están en revisión.');
    } catch (err) {
      console.error('Error uploading:', err);
      toast.error('Error al cargar los documentos.');
    } finally {
      setUploading(false);
      setPendingFiles([]);
    }
  };

  const handleViewDocument = async (doc: DocumentRecord) => {
    const { data } = await supabase.storage
      .from('documentos')
      .createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('No se pudo obtener el documento.');
  };

  const handleDownloadDocument = async (doc: DocumentRecord) => {
    const { data } = await supabase.storage
      .from('documentos')
      .createSignedUrl(doc.file_path, 3600, { download: true });
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.file_name;
      a.click();
    } else {
      toast.error('No se pudo descargar el documento.');
    }
  };

  const isCalamidad = request.motivo === 'Calamidad doméstica grave';
  const showUploadArea =
    user?.role === 'employee' &&
    Boolean(motivoRequiresDocuments[request.motivo]?.length) &&
    !MOTIVOS_SIN_CARGA_EMPLEADO.includes(request.motivo) &&
    !['denegado', 'finalizado'].includes(request.status);
  const showDocuments = documents.length > 0 || request.documentStatus === 'documentos_cargados';

  // Build detail items including calamidad-specific fields
  const detailItems: { label: string; value: string }[] = [
    { label: 'Empleado', value: request.employeeName },
    { label: 'Área', value: request.employeeArea },
    { label: 'Tipo', value: request.type },
    { label: 'Motivo', value: request.motivo },
  ];

  if (isCalamidad) {
    if (request.calamidadTipo) detailItems.push({ label: 'Tipo de calamidad', value: request.calamidadTipo });
    if (request.calamidadSubcategoria) detailItems.push({ label: 'Subcategoría', value: request.calamidadSubcategoria });
    if (request.calamidadDescripcion) detailItems.push({ label: 'Descripción de la calamidad', value: request.calamidadDescripcion });
  }

  if (request.motivo === 'Traslado temporal por teletrabajo móvil') {
    if (request.direccion) detailItems.push({ label: 'Dirección', value: request.direccion });
    if (request.ciudad) detailItems.push({ label: 'Ciudad', value: request.ciudad });
    if (request.pais) detailItems.push({ label: 'País', value: request.pais });
  }

  if ((request.motivo === 'Luto' || request.motivo === 'Sepelio otros familiares') && request.lutoFamiliar) {
    detailItems.push({ label: 'Familiar fallecido', value: request.lutoFamiliar });
  }

  detailItems.push(
    { label: 'Fecha solicitud', value: request.fechaSolicitud },
    { label: 'Fecha inicio', value: request.fechaInicio },
    { label: 'Fecha fin', value: request.fechaFin },
  );

  if (request.horaInicio && request.horaFin) {
    detailItems.push(
      { label: 'Hora inicio', value: request.horaInicio },
      { label: 'Hora fin', value: request.horaFin },
    );
  }

  detailItems.push(
    { label: 'Días hábiles', value: String(request.diasHabiles) },
    { label: 'Aprobador', value: request.approver },
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <BackButton />

        <div className="flex items-center gap-4 mb-8">
          <h1 className="font-nunito font-bold text-[28px] text-foreground">{request.motivo}</h1>
          <StatusBadge status={request.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="border border-interlan-border-gray rounded-xl p-6">
            <h3 className="font-nunito font-bold text-[16px] mb-4">Datos de la solicitud</h3>
            <div className="space-y-3">
              {detailItems.map(item => (
                <div key={item.label} className={item.label === 'Descripción de la calamidad' ? 'flex flex-col gap-1' : 'flex justify-between'}>
                  <span className="font-nunito text-[13px] text-interlan-text-secondary">{item.label}</span>
                  <span className={`font-nunito text-[13px] font-semibold text-foreground ${item.label === 'Descripción de la calamidad' ? 'whitespace-pre-wrap' : ''}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="border border-interlan-border-gray rounded-xl p-6">
            <h3 className="font-nunito font-bold text-[16px] mb-4">Historial</h3>
            <div className="space-y-0">
              {(() => {
                // Derive completed step index based on timeline length and actual status
                const totalSteps = request.timeline.length;
                let statusOrder: Record<string, number>;

                if (totalSteps >= 6) {
                  // Calamidad: Enviada → Validación líder → Validación TH → Permiso otorgado → Soportes cargados → Aprobación final
                  statusOrder = {
                    'pendiente': 0,
                    'notificado': 1,
                    'en_revision_th': 2,
                    'aprobado': 3,
                    'denegado': 2,
                    'soportes_pendientes': 4,
                    'soportes_en_revision': 4,
                    'mas_info_requerida': 4,
                    'finalizado': 6,
                  };
                } else if (totalSteps === 5) {
                  // Graduación: Enviada → Aprobación del líder → Permiso aprobado → Soportes cargados → Aprobación final
                  statusOrder = {
                    'pendiente': 1,
                    'notificado': 1,
                    'aprobado': 3,
                    'denegado': 1,
                    'en_revision_th': 3,
                    'soportes_pendientes': 3,
                    'soportes_en_revision': 4,
                    'mas_info_requerida': 4,
                    'finalizado': 5,
                  };
                } else if (request.motivo === 'Traslado temporal por teletrabajo móvil') {
                  // Traslado: Enviada → Aprobación del líder → Aprobación de TH → Finalizada
                  statusOrder = {
                    'pendiente': 1,
                    'notificado': 1,
                    'en_revision_th': 2,
                    'aprobado': 3,
                    'denegado': 1,
                    'soportes_pendientes': 3,
                    'soportes_en_revision': 3,
                    'mas_info_requerida': 3,
                    'finalizado': totalSteps,
                  };
                } else if (totalSteps === 3) {
                  // 3-step (Sepelio compañeros / Cumpleaños / Quinquenio / Diligencias):
                  // Enviada → Aprobación del líder → Aprobada y finalizada
                  statusOrder = {
                    'pendiente': 1,
                    'notificado': 1,
                    'aprobado': 3,
                    'denegado': 1,
                    'en_revision_th': 1,
                    'soportes_pendientes': 2,
                    'soportes_en_revision': 2,
                    'mas_info_requerida': 2,
                    'finalizado': 3,
                  };
                } else {
                  // Standard 4-step: Enviada → Notificada al líder → Aprobada → Finalizada
                  statusOrder = {
                    'pendiente': 0,
                    'notificado': 1,
                    'aprobado': 2,
                    'denegado': 2,
                    'en_revision_th': 1,
                    'soportes_pendientes': 2,
                    'soportes_en_revision': 2,
                    'mas_info_requerida': 2,
                    'finalizado': totalSteps,
                  };
                }
                const currentStep = statusOrder[request.status] ?? 0;
                const isRejected = request.status === 'denegado';
                const docsUploaded = documents.length > 0 || request.documentStatus === 'documentos_cargados';

                // Determine at which step the rejection happened
                let rejectionIndex = currentStep;
                if (isRejected) {
                  if (totalSteps === 3) {
                    rejectionIndex = 1; // Aprobación del líder
                  } else if (totalSteps === 5) {
                    rejectionIndex = docsUploaded ? 4 : 1; // TH final vs líder
                  } else if (totalSteps >= 6) {
                    rejectionIndex = docsUploaded ? 5 : (request.status === 'denegado' && currentStep >= 2 ? 2 : 1);
                  } else if (request.motivo === 'Traslado temporal por teletrabajo móvil') {
                    rejectionIndex = docsUploaded ? 2 : 1;
                  } else {
                    rejectionIndex = 2; // Standard 4-step: "Aprobada" becomes "Rechazada"
                  }
                }

                // Derive rejectedBy when missing (legacy data): infer from where the rejection happened
                let rejectedBy: 'lider' | 'th' | undefined = request.rejectedBy;
                if (isRejected && !rejectedBy) {
                  if (totalSteps === 3) {
                    rejectedBy = 'lider';
                  } else if (totalSteps === 5) {
                    rejectedBy = docsUploaded ? 'th' : 'lider';
                  } else if (totalSteps >= 6) {
                    rejectedBy = docsUploaded || rejectionIndex >= 2 ? 'th' : 'lider';
                  } else if (request.motivo === 'Traslado temporal por teletrabajo móvil') {
                    rejectedBy = docsUploaded ? 'th' : 'lider';
                  } else {
                    rejectedBy = 'lider';
                  }
                }
                const rejectionLabel = rejectedBy === 'th' ? 'Rechazada por Talento Humano' : 'Rechazada por el líder';

                const visibleSteps = isRejected
                  ? request.timeline.slice(0, rejectionIndex + 1)
                  : request.timeline;

                return visibleSteps.map((step, i) => {
                  const isRejectionStep = isRejected && i === rejectionIndex;
                  const isCompleted = !isRejectionStep && (isRejected ? i < rejectionIndex : i < currentStep);
                  const isInProgress = !isRejected && i === currentStep && request.status !== 'finalizado';
                  const isFinal = request.status === 'finalizado' && i <= currentStep;

                  const done = isCompleted || isFinal;
                  const active = isInProgress;
                  const isLast = i === visibleSteps.length - 1;

                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isRejectionStep ? 'bg-status-denegado-text' :
                          done ? 'bg-interlan-blue' :
                          active ? 'bg-interlan-blue/30 border-2 border-interlan-blue' :
                          'border-2 border-interlan-border-gray'
                        }`}>
                          {isRejectionStep ? <X size={12} className="text-white" /> : done ? <Check size={12} className="text-white" /> : null}
                        </div>
                        {!isLast && <div className={`w-px flex-1 min-h-[24px] ${done ? 'bg-interlan-blue' : 'bg-interlan-border-gray'}`} />}
                      </div>
                      <div className="pb-4">
                        <p className={`font-nunito text-[14px] font-semibold ${
                          isRejectionStep ? 'text-status-denegado-text' :
                          active ? 'text-interlan-blue' : 'text-foreground'
                        }`}>{isRejectionStep ? rejectionLabel : step.label}</p>
                        <p className="font-nunito text-[12px] text-interlan-text-muted">
                          {isRejectionStep ? (request.rejectionDate || step.date || request.fechaSolicitud || 'Rechazada')
                            : done ? (step.date || 'Completado')
                            : active ? 'En progreso' : 'Pendiente'}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Rejection reason */}
        {request.status === 'denegado' && request.rejectionReason && (() => {
          const docsUploaded = documents.length > 0 || request.documentStatus === 'documentos_cargados';
          const totalSteps = request.timeline.length;
          let inferredBy: 'lider' | 'th' | undefined = request.rejectedBy;
          if (!inferredBy) {
            if (totalSteps === 3) inferredBy = 'lider';
            else if (totalSteps === 5) inferredBy = docsUploaded ? 'th' : 'lider';
            else if (totalSteps >= 6) inferredBy = docsUploaded ? 'th' : 'lider';
            else if (request.motivo === 'Traslado temporal por teletrabajo móvil') inferredBy = docsUploaded ? 'th' : 'lider';
            else inferredBy = 'lider';
          }
          const byLabel = inferredBy === 'th' ? 'Talento Humano' : 'Líder';
          const dateLabel = request.rejectionDate || request.fechaSolicitud;
          return (
            <div className="border border-status-denegado-border rounded-xl p-6 mb-8 bg-status-denegado-bg">
              <h3 className="font-nunito font-bold text-[16px] text-status-denegado-text mb-2">Motivo del rechazo</h3>
              <p className="font-nunito text-[14px] text-status-denegado-text">
                <span className="font-semibold">Rechazada por {byLabel} el {dateLabel}:</span> {request.rejectionReason}
              </p>
            </div>
          );
        })()}

        {/* More info requested by TH */}
        {request.status === 'mas_info_requerida' && request.infoRequestMessage && (
          <div className="border border-[#E5A700] rounded-xl p-6 mb-8 bg-[#FFF8E0]">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-[#8A6500]" />
              <h3 className="font-nunito font-bold text-[16px] text-[#8A6500]">Más información requerida por Talento Humano</h3>
            </div>
            <p className="font-nunito text-[14px] text-[#6B5000]">{request.infoRequestMessage}</p>
          </div>
        )}

        {/* Required documents list */}
        {motivoRequiresDocuments[request.motivo] && motivoRequiresDocuments[request.motivo].length > 0 && (
          <div className="border border-interlan-border-gray rounded-xl p-6 mb-8">
            <h3 className="font-nunito font-bold text-[16px] mb-3">Documentos requeridos para este permiso</h3>
            <ul className="list-disc list-inside space-y-1">
              {motivoRequiresDocuments[request.motivo].map(doc => (
                <li key={doc} className="font-nunito text-[14px] text-interlan-text-secondary">{doc}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Uploaded documents display */}
        {showDocuments && (
          <div className="border border-interlan-border-gray rounded-xl p-6 mb-8">
            <h3 className="font-nunito font-bold text-[16px] mb-4">Documentos cargados</h3>
            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map(doc => (
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
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="p-2 rounded-md hover:bg-interlan-light-blue transition-colors"
                        title="Ver documento"
                      >
                        <Eye size={16} className="text-interlan-blue" />
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(doc)}
                        className="p-2 rounded-md hover:bg-interlan-light-blue transition-colors"
                        title="Descargar documento"
                      >
                        <Download size={16} className="text-interlan-blue" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-nunito text-[14px] text-interlan-text-muted">Los documentos fueron cargados en modo demo (no se almacenaron en la base de datos).</p>
            )}
          </div>
        )}

        {/* Document upload */}
        {showUploadArea && (
          <div className="border border-interlan-border-gray rounded-xl p-6">
            <h3 className="font-nunito font-bold text-[16px] mb-2">Documentos de soporte</h3>
            {request.documentDeadline && (
              <p className="font-nunito text-[13px] text-interlan-text-secondary mb-4">Plazo de entrega: {request.documentDeadline}</p>
            )}
            <label className={`border-2 border-dashed border-interlan-blue bg-interlan-light-blue rounded-lg p-8 text-center cursor-pointer hover:bg-[#DDE5FF] transition-colors block ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                className="hidden"
                onChange={e => handleSelectFiles(e.target.files)}
                disabled={uploading}
              />
              <Upload size={24} className="text-interlan-blue mx-auto mb-2" />
              <p className="font-nunito text-[14px] text-interlan-text-secondary">
                {uploading ? 'Cargando archivos...' : 'Arrastra archivos aquí o haz clic para seleccionar'}
              </p>
              <p className="font-nunito text-[12px] text-interlan-text-muted mt-1">Solo PDF, JPG, PNG (máx. 5MB)</p>
            </label>
            {fileError && (
              <p className="font-nunito text-[12px] text-[#E53935] mt-2">{fileError}</p>
            )}
          </div>
        )}
      </div>

      {/* Upload confirmation modal */}
      <Dialog open={showConfirmUpload} onOpenChange={setShowConfirmUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-nunito">Confirmar envío de documentos</DialogTitle>
          </DialogHeader>
          <p className="font-nunito text-[14px] text-interlan-text-secondary">
            ¿Estás seguro de que deseas enviar estos documentos? Una vez enviados, serán revisados por Talento Humano.
          </p>
          {pendingFiles.length > 0 && (
            <div className="space-y-2 mt-2">
              {pendingFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 p-2 border border-interlan-border-gray rounded-lg bg-interlan-light-gray">
                  <FileText size={16} className="text-interlan-blue shrink-0" />
                  <span className="font-nunito text-[13px] text-foreground">{f.name}</span>
                  <span className="font-nunito text-[12px] text-interlan-text-muted ml-auto">{formatFileSize(f.size)}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <button onClick={() => { setShowConfirmUpload(false); setPendingFiles([]); }} className="px-4 py-2 font-nunito text-[14px] border border-interlan-border-gray rounded-[6px]">Cancelar</button>
            <button onClick={handleConfirmUpload} className="px-4 py-2 font-nunito text-[14px] font-bold bg-interlan-blue text-white rounded-[6px]">Sí, enviar documentos</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestDetail;
