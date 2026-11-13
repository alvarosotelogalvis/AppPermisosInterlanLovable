import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import StatusBadge from '@/components/StatusBadge';
import { useRequests } from '@/contexts/RequestsContext';
import { RequestStatus, motivoRequiresDocuments } from '@/data/mockData';
import { Download } from 'lucide-react';
import { exportToExcel } from '@/utils/exportExcel';

const uploadAllowedStatuses: RequestStatus[] = [
  'aprobado',
  'notificado',
  'soportes_pendientes',
  'mas_info_requerida',
];

const statusFilters: { label: string; value: RequestStatus | 'todas' }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Aprobada', value: 'aprobado' },
  { label: 'Rechazada', value: 'denegado' },
  { label: 'Notificada', value: 'notificado' },
  { label: 'Pendiente', value: 'pendiente' },
];

const statusAccentColor: Record<RequestStatus, string> = {
  pendiente: 'bg-status-pendiente-border',
  notificado: 'bg-status-notificado-border',
  en_revision_th: 'bg-status-pendiente-border',
  aprobado: 'bg-status-aprobado-border',
  denegado: 'bg-status-denegado-border',
  soportes_pendientes: 'bg-status-pendiente-border',
  soportes_en_revision: 'bg-status-notificado-border',
  finalizado: 'bg-status-finalizado-border',
  mas_info_requerida: 'bg-status-denegado-border',
};

const MisSolicitudes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { requests: allRequests } = useRequests();
  const [filter, setFilter] = useState<RequestStatus | 'todas'>('todas');

  const myRequests = allRequests.filter(r => r.employeeId === user?.id);
  const requests = myRequests.filter(r => filter === 'todas' || r.status === filter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <BackButton />
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-nunito font-bold text-[28px] text-foreground">Mis solicitudes</h1>
          <button
            onClick={() => exportToExcel(myRequests, 'mis_solicitudes')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-nunito text-[13px] font-bold border border-interlan-border-gray text-interlan-text-muted hover:border-interlan-blue hover:text-interlan-blue transition-colors"
          >
            <Download size={14} /> Exportar a Excel
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg font-nunito text-[13px] font-bold transition-colors ${
                filter === f.value
                  ? 'bg-interlan-blue text-white'
                  : 'bg-interlan-light-gray text-interlan-text-secondary hover:bg-interlan-light-blue'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        {requests.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-nunito text-[15px] text-interlan-text-muted">No tienes solicitudes activas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(r => (
              (() => {
                const canUploadDocuments =
                  Boolean(motivoRequiresDocuments[r.motivo]?.length) &&
                  uploadAllowedStatuses.includes(r.status);

                return (
              <div key={r.id} className="flex border border-interlan-border-gray rounded-xl overflow-hidden">
                <div className={`w-1.5 shrink-0 ${statusAccentColor[r.status]}`} />
                <div className="flex-1 p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-nunito font-bold text-[16px] text-foreground">{r.type}</h3>
                      <p className="font-nunito text-[14px] text-interlan-text-secondary">{r.motivo}</p>
                      <p className="font-nunito text-[13px] text-interlan-text-muted mt-1">{r.fechaInicio} — {r.fechaFin} · {r.diasHabiles} día(s) hábil(es)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={r.status} />
                      <button
                        onClick={() => navigate(`/mis-solicitudes/${r.id}`)}
                        className="px-4 py-2 font-nunito text-[13px] font-bold border border-interlan-border-gray rounded-[6px] hover:bg-interlan-light-gray transition-colors"
                      >
                        Ver detalle
                      </button>
                       {canUploadDocuments && (
                        <button
                          onClick={() => navigate(`/mis-solicitudes/${r.id}`)}
                          className="px-4 py-2 font-nunito text-[13px] font-bold bg-interlan-blue text-white rounded-[6px]"
                        >
                          Cargar documentos
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
                );
              })()
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MisSolicitudes;
