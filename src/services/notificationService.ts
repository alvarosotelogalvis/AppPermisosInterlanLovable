import { supabase } from '@/integrations/supabase/client';

// Notification email addresses per role
// MODO PRUEBA: todos los correos van a tu Gmail
const TEST_EMAIL = 'felipeullo33@gmail.com';
const NOTIFICATION_EMAILS = {
  employee: TEST_EMAIL,
  leader: TEST_EMAIL,
  hr: TEST_EMAIL,
};

interface NotifyParams {
  event: string;
  recipientEmail: string;
  recipientName: string;
  data: Record<string, string>;
}

async function sendNotification(params: NotifyParams): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: params,
    });
    if (error) console.error('Notification error:', error);
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

// Employee submits request → notify leader
export async function notifyLeaderNewRequest(data: {
  employeeName: string;
  motivo: string;
  fechaInicio: string;
  fechaFin: string;
  diasHabiles: string;
}) {
  await sendNotification({
    event: 'nueva_solicitud_lider',
    recipientEmail: NOTIFICATION_EMAILS.leader,
    recipientName: 'Líder',
    data,
  });
}

// Leader manages request → notify employee
export async function notifyEmployeeLeaderAction(data: {
  employeeName: string;
  motivo: string;
  approver: string;
  action: string;
  rejectionReason?: string;
  requiresDocs?: string;
  requiresTH?: string;
}) {
  await sendNotification({
    event: 'lider_gestiono',
    recipientEmail: NOTIFICATION_EMAILS.employee,
    recipientName: data.employeeName,
    data: { ...data, rejectionReason: data.rejectionReason || '', requiresDocs: data.requiresDocs || 'false', requiresTH: data.requiresTH || 'false' },
  });
}

// Leader approves calamidad → notify TH (also used for initial creation notification)
export async function notifyTHCalamidadApproved(data: {
  employeeName: string;
  fechaInicio: string;
  fechaFin: string;
}) {
  await sendNotification({
    event: 'calamidad_aprobada_th',
    recipientEmail: NOTIFICATION_EMAILS.hr,
    recipientName: 'Talento Humano',
    data,
  });
}

// TH decides on request → notify employee
export async function notifyEmployeeTHDecision(data: {
  employeeName: string;
  motivo: string;
  action: string;
  rejectionReason?: string;
}) {
  await sendNotification({
    event: 'th_decision',
    recipientEmail: NOTIFICATION_EMAILS.employee,
    recipientName: data.employeeName,
    data: { ...data, rejectionReason: data.rejectionReason || '' },
  });
}

// Employee uploads documents → notify TH
export async function notifyTHDocsUploaded(data: {
  employeeName: string;
  motivo: string;
}) {
  await sendNotification({
    event: 'docs_cargados_th',
    recipientEmail: NOTIFICATION_EMAILS.hr,
    recipientName: 'Talento Humano',
    data,
  });
}

// TH requests more info → notify employee
export async function notifyEmployeeMoreInfo(data: {
  employeeName: string;
  motivo: string;
  message: string;
}) {
  await sendNotification({
    event: 'mas_info',
    recipientEmail: NOTIFICATION_EMAILS.employee,
    recipientName: data.employeeName,
    data,
  });
}

// TH finalizes request → notify employee
export async function notifyEmployeeFinalized(data: {
  employeeName: string;
  motivo: string;
}) {
  await sendNotification({
    event: 'solicitud_finalizada',
    recipientEmail: NOTIFICATION_EMAILS.employee,
    recipientName: data.employeeName,
    data,
  });
}

// Employee submits → confirm to employee
export async function notifyEmployeeRequestSent(data: {
  employeeName: string;
  motivo: string;
  fechaInicio: string;
  fechaFin: string;
  diasHabiles: string;
  approver: string;
}) {
  await sendNotification({
    event: 'solicitud_enviada',
    recipientEmail: NOTIFICATION_EMAILS.employee,
    recipientName: data.employeeName,
    data,
  });
}
