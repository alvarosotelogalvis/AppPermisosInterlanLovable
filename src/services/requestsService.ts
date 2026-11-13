import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { PermissionRequest, RequestStatus, DocumentStatus } from '@/data/mockData';

// Convert DB row to PermissionRequest
function rowToRequest(row: any): PermissionRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    employeeInitials: row.employee_initials,
    employeeArea: row.employee_area,
    type: row.type,
    motivo: row.motivo,
    fechaSolicitud: row.fecha_solicitud,
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    diasHabiles: Number(row.dias_habiles),
    status: row.status as RequestStatus,
    approver: row.approver,
    approverEmail: row.approver_email,
    documentStatus: row.document_status as DocumentStatus,
    documentDeadline: row.document_deadline || undefined,
    rejectionReason: row.rejection_reason || undefined,
    rejectedBy: (row.rejected_by as 'lider' | 'th') || undefined,
    rejectionDate: row.rejection_date || undefined,
    infoRequestMessage: row.info_request_message || undefined,
    timeline: row.timeline || [],
    calamidadTipo: row.calamidad_tipo || undefined,
    calamidadSubcategoria: row.calamidad_subcategoria || undefined,
    calamidadDescripcion: row.calamidad_descripcion || undefined,
    lutoFamiliar: row.luto_familiar || undefined,
    horaInicio: row.hora_inicio || undefined,
    horaFin: row.hora_fin || undefined,
    direccion: row.direccion || undefined,
    ciudad: row.ciudad || undefined,
    pais: row.pais || undefined,
  };
}

export async function fetchRequests(): Promise<PermissionRequest[]> {
  const { data, error } = await supabase
    .from('solicitudes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching requests:', error);
    return [];
  }

  return (data || []).map(rowToRequest);
}

export async function createRequest(req: {
  employeeId: string;
  employeeName: string;
  employeeInitials: string;
  employeeArea: string;
  type: string;
  motivo: string;
  fechaSolicitud: string;
  fechaInicio: string;
  fechaFin: string;
  diasHabiles: number;
  approver: string;
  approverEmail: string;
  timeline: { label: string; date: string; completed: boolean }[];
  calamidadSubcategoria?: string;
  calamidadTipo?: string;
  calamidadDescripcion?: string;
  lutoFamiliar?: string;
  horaInicio?: string;
  horaFin?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  documentDeadline?: string;
}): Promise<PermissionRequest | null> {
  const { data, error } = await supabase
    .from('solicitudes')
    .insert({
      employee_id: req.employeeId,
      employee_name: req.employeeName,
      employee_initials: req.employeeInitials,
      employee_area: req.employeeArea,
      type: req.type,
      motivo: req.motivo,
      fecha_solicitud: req.fechaSolicitud,
      fecha_inicio: req.fechaInicio,
      fecha_fin: req.fechaFin,
      dias_habiles: req.diasHabiles,
      approver: req.approver,
      approver_email: req.approverEmail,
      timeline: req.timeline,
      calamidad_subcategoria: req.calamidadSubcategoria || null,
      calamidad_tipo: req.calamidadTipo || null,
      calamidad_descripcion: req.calamidadDescripcion || null,
      luto_familiar: req.lutoFamiliar || null,
      hora_inicio: req.horaInicio || null,
      hora_fin: req.horaFin || null,
      direccion: req.direccion || null,
      ciudad: req.ciudad || null,
      pais: req.pais || null,
      document_deadline: req.documentDeadline || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating request:', error);
    return null;
  }

  return rowToRequest(data);
}

export async function updateRequestInDB(
  id: string,
  updates: Partial<{
    status: RequestStatus;
    documentStatus: DocumentStatus;
    rejectionReason: string;
    rejectedBy: 'lider' | 'th';
    rejectionDate: string;
    infoRequestMessage: string;
    timeline: { label: string; date: string; completed: boolean }[];
  }>
): Promise<boolean> {
  const dbUpdates: Partial<Database['public']['Tables']['solicitudes']['Update']> = { updated_at: new Date().toISOString() };
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.documentStatus) dbUpdates.document_status = updates.documentStatus;
  if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;
  if (updates.rejectedBy !== undefined) dbUpdates.rejected_by = updates.rejectedBy;
  if (updates.rejectionDate !== undefined) dbUpdates.rejection_date = updates.rejectionDate;
  if (updates.infoRequestMessage !== undefined) dbUpdates.info_request_message = updates.infoRequestMessage;
  if (updates.timeline) dbUpdates.timeline = updates.timeline;

  const { error } = await supabase
    .from('solicitudes')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating request:', error);
    return false;
  }
  return true;
}
