import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PermissionRequest, mockRequests as initialMockRequests } from '@/data/mockData';
import { fetchRequests, createRequest, updateRequestInDB } from '@/services/requestsService';
import {
  notifyLeaderNewRequest,
  notifyEmployeeRequestSent,
  notifyEmployeeLeaderAction,
  notifyTHCalamidadApproved,
  notifyEmployeeTHDecision,
  notifyTHDocsUploaded,
  notifyEmployeeMoreInfo,
  notifyEmployeeFinalized,
} from '@/services/notificationService';

interface RequestsContextType {
  requests: PermissionRequest[];
  updateRequest: (id: string, updates: Partial<PermissionRequest>) => void;
  addRequest: (req: Parameters<typeof createRequest>[0]) => Promise<PermissionRequest | null>;
  isRealMode: boolean;
  setIsRealMode: (v: boolean) => void;
  refreshRequests: () => Promise<void>;
  sendNotification: (event: string, request: PermissionRequest, extra?: Record<string, string>) => Promise<void>;
}

const RequestsContext = createContext<RequestsContextType | undefined>(undefined);

export const RequestsProvider = ({ children }: { children: ReactNode }) => {
  const [mockRequests, setMockRequests] = useState<PermissionRequest[]>(initialMockRequests);
  const [dbRequests, setDbRequests] = useState<PermissionRequest[]>([]);
  const [isRealMode, setIsRealModeState] = useState(() => {
    try { return localStorage.getItem('appMode') === 'real'; } catch { return false; }
  });

  const clearDbRequests = async () => {
    try {
      const { error } = await supabase.from('solicitudes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.error('Error clearing solicitudes:', error);
    } catch (e) {
      console.error('Error clearing DB:', e);
    }
  };

  // Operating mode is a global setting shared by every user/browser via app_config
  useEffect(() => {
    supabase.from('app_config').select('value').eq('key', 'app_mode').maybeSingle()
      .then(({ data }) => {
        if (data) {
          const real = data.value === 'real';
          setIsRealModeState(real);
          try { localStorage.setItem('appMode', real ? 'real' : 'demo'); } catch {}
        }
      });
  }, []);

  const persistMode = async (v: boolean) => {
    const value = v ? 'real' : 'demo';
    const { data } = await supabase.from('app_config').select('id').eq('key', 'app_mode').maybeSingle();
    if (data) {
      await supabase.from('app_config').update({ value, updated_at: new Date().toISOString() }).eq('id', data.id);
    } else {
      await supabase.from('app_config').insert({ key: 'app_mode', value });
    }
  };

  const setIsRealMode = async (v: boolean) => {
    // Flip mode immediately so the UI re-renders against the new data source right away.
    setIsRealModeState(v);
    try { localStorage.setItem('appMode', v ? 'real' : 'demo'); } catch {}
    persistMode(v);


    // Always reset the DB-backed cache when the mode changes to avoid showing stale counts.
    setDbRequests([]);
    // Reset demo dataset back to its initial mock data whenever we return to demo mode.
    if (!v) setMockRequests(initialMockRequests);

    if (!v && isRealMode) {
      // Switching from real → demo: clear DB records for clean tests.
      await clearDbRequests();
    } else if (v && !isRealMode) {
      // Switching from demo → real: pull the latest DB state immediately.
      const data = await fetchRequests();
      setDbRequests(data);
    }
  };

  const requests = isRealMode ? dbRequests : mockRequests;

  const refreshRequests = useCallback(async () => {
    if (isRealMode) {
      const data = await fetchRequests();
      setDbRequests(data);
    }
  }, [isRealMode]);

  useEffect(() => {
    if (isRealMode) refreshRequests();
  }, [isRealMode, refreshRequests]);


  const updateRequest = (id: string, updates: Partial<PermissionRequest>) => {
    if (isRealMode) {
      updateRequestInDB(id, updates).then(ok => {
        if (ok) refreshRequests();
      });
    }
    // Always update local state for immediate UI feedback
    if (isRealMode) {
      setDbRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } else {
      setMockRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    }
  };

  const addRequest = async (req: Parameters<typeof createRequest>[0]): Promise<PermissionRequest | null> => {
    if (isRealMode) {
      const result = await createRequest(req);
      if (result) {
        setDbRequests(prev => [result, ...prev]);
      }
      return result;
    }
    // Demo mode: create a mock request
    const mockReq: PermissionRequest = {
      id: String(Date.now()),
      employeeId: req.employeeId,
      employeeName: req.employeeName,
      employeeInitials: req.employeeInitials,
      employeeArea: req.employeeArea,
      type: req.type,
      motivo: req.motivo,
      fechaSolicitud: req.fechaSolicitud,
      fechaInicio: req.fechaInicio,
      fechaFin: req.fechaFin,
      diasHabiles: req.diasHabiles,
      status: 'pendiente',
      approver: req.approver,
      approverEmail: req.approverEmail,
      documentStatus: 'sin_documentos',
      documentDeadline: req.documentDeadline,
      timeline: req.timeline,
      calamidadTipo: req.calamidadTipo,
      calamidadSubcategoria: req.calamidadSubcategoria,
      calamidadDescripcion: req.calamidadDescripcion,
      lutoFamiliar: req.lutoFamiliar,
      horaInicio: req.horaInicio,
      horaFin: req.horaFin,
      direccion: req.direccion,
      ciudad: req.ciudad,
      pais: req.pais,
    };
    setMockRequests(prev => [mockReq, ...prev]);
    return mockReq;
  };

  const sendNotification = async (event: string, request: PermissionRequest, extra?: Record<string, string>) => {
    if (!isRealMode) return; // Only send emails in real mode
    // Read the global emails switch from the database (not per-browser)
    const { data: emailsCfg } = await supabase.from('app_config').select('value').eq('key', 'emails_active').maybeSingle();
    const emailsOff = emailsCfg ? emailsCfg.value === 'false' : false;
    if (emailsOff) { console.log(`[Correos desactivados] Simulando envío: ${event}`); return; }

    const baseData = {
      employeeName: request.employeeName,
      employeeArea: request.employeeArea || '',
      tipo: request.type || '',
      motivo: request.motivo,
      fechaSolicitud: request.fechaSolicitud || '',
      fechaInicio: request.fechaInicio,
      fechaFin: request.fechaFin,
      horaInicio: request.horaInicio || '',
      horaFin: request.horaFin || '',
      diasHabiles: String(request.diasHabiles),
      approver: request.approver,
      calamidadTipo: request.calamidadTipo || '',
      calamidadSubcategoria: request.calamidadSubcategoria || '',
      calamidadDescripcion: request.calamidadDescripcion || '',
      lutoFamiliar: request.lutoFamiliar || '',
      direccion: request.direccion || '',
      ciudad: request.ciudad || '',
      pais: request.pais || '',
      // Used by the email to build one-click approve/reject buttons
      solicitudId: request.id,
      appUrl: window.location.origin,
    };

    switch (event) {
      case 'solicitud_enviada':
        await notifyEmployeeRequestSent(baseData);
        await notifyLeaderNewRequest(baseData);
        // Calamidad: only notify leader first, TH gets notified when leader validates
        break;
      case 'lider_notifica':
        await notifyEmployeeLeaderAction({
          ...baseData,
          action: 'notificado',
          requiresDocs: 'true',
        });
        break;
      case 'lider_aprueba': {
        const needsTH = request.motivo === 'Calamidad doméstica grave' || request.motivo === 'Traslado temporal por teletrabajo móvil';
        await notifyEmployeeLeaderAction({
          ...baseData,
          action: 'aprobado',
          requiresDocs: extra?.requiresDocs || 'false',
          requiresTH: needsTH ? 'true' : 'false',
        });
        // For calamidad and traslado, notify TH that leader validated → now TH needs to review
        if (needsTH) {
          await notifyTHCalamidadApproved(baseData);
        }
        break;
      }
      case 'lider_deniega':
        await notifyEmployeeLeaderAction({
          ...baseData,
          action: 'denegado',
          rejectionReason: extra?.rejectionReason || '',
        });
        break;
      case 'th_aprueba':
        await notifyEmployeeTHDecision({
          ...baseData,
          action: 'aprobado',
        });
        break;
      case 'th_deniega':
        await notifyEmployeeTHDecision({
          ...baseData,
          action: 'denegado',
          rejectionReason: extra?.rejectionReason || '',
        });
        break;
      case 'docs_cargados':
        await notifyTHDocsUploaded(baseData);
        break;
      case 'mas_info':
        await notifyEmployeeMoreInfo({
          ...baseData,
          message: extra?.message || '',
        });
        break;
      case 'finalizado':
        await notifyEmployeeFinalized(baseData);
        break;
    }
  };

  return (
    <RequestsContext.Provider value={{ requests, updateRequest, addRequest, isRealMode, setIsRealMode, refreshRequests, sendNotification }}>
      {children}
    </RequestsContext.Provider>
  );
};

export const useRequests = () => {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error('useRequests must be used within RequestsProvider');
  return ctx;
};
