import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.101.1/cors";

import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_URL = 'https://connector-gateway.lovable.dev/resend';

interface NotificationPayload {
  event: string;
  recipientEmail: string;
  recipientName: string;
  data: Record<string, string>;
}

// Bloque con TODOS los detalles del permiso: se muestra en los correos para
// que el aprobador no tenga que entrar al portal a revisarlos.
const renderDetails = (d: Record<string, string>): string => {
  const rows: Array<[string, string | undefined]> = [
    ['Empleado', d.employeeName],
    ['Área', d.employeeArea],
    ['Tipo de permiso', d.tipo],
    ['Motivo', d.motivo],
    ['Fecha de solicitud', d.fechaSolicitud],
    ['Fecha inicio', d.fechaInicio],
    ['Fecha fin', d.fechaFin],
    ['Hora inicio', d.horaInicio],
    ['Hora fin', d.horaFin],
    ['Días hábiles', d.diasHabiles],
    ['Tipo de calamidad', d.calamidadTipo],
    ['Subcategoría', d.calamidadSubcategoria],
    ['Descripción', d.calamidadDescripcion],
    ['Familiar fallecido', d.lutoFamiliar],
    ['Dirección', d.direccion],
    ['Ciudad', d.ciudad],
    ['País', d.pais],
    ['Líder aprobador', d.approver],
  ];
  const html = rows
    .filter(([, v]) => v && v.trim() !== '')
    .map(([label, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#555;vertical-align:top;white-space:nowrap"><strong>${label}:</strong></td><td style="padding:6px 0">${v}</td></tr>`)
    .join('');
  if (!html) return '';
  return `<table style="border-collapse:collapse;margin:12px 0;font-size:14px">${html}</table>`;
};

const EMAIL_TEMPLATES: Record<string, { subject: (data: Record<string, string>) => string; body: (data: Record<string, string>) => string }> = {
  'solicitud_enviada': {
    subject: () => 'Tu solicitud de permiso ha sido enviada',
    body: (d) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#0041FF">Solicitud enviada correctamente</h2>
        <p>Hola ${d.employeeName},</p>
        <p>Tu solicitud de <strong>${d.motivo}</strong> ha sido registrada exitosamente.</p>
        ${renderDetails(d)}
        <p>Tu líder <strong>${d.approver}</strong> ha sido notificado y gestionará tu solicitud.</p>
        <hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">
        <p style="color:#888;font-size:12px">Portal de Permisos, Interlan</p>
      </div>
    `,
  },
  'lider_gestiono': {
    subject: (d) => d.action === 'denegado' || d.action === 'rechazado'
      ? 'Tu líder ha rechazado tu solicitud'
      : 'Tu solicitud ha sido gestionada por tu líder',
    body: (d) => {
      const rejected = d.action === 'denegado' || d.action === 'rechazado';
      const headline = rejected ? 'Tu líder ha rechazado tu solicitud' : 'Solicitud gestionada';
      const actionText = rejected ? 'ha rechazado' : `ha ${d.action}`;
      return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:${rejected ? '#E53935' : '#0041FF'}">${headline}</h2>
        <p>Hola ${d.employeeName},</p>
        <p>Tu líder <strong>${d.approver}</strong> ${actionText} tu solicitud de <strong>${d.motivo}</strong>.</p>
        ${renderDetails(d)}
        ${!rejected && d.requiresTH === 'true' ? '<p style="background:#EDF1FF;border-left:4px solid #0041FF;padding:10px 14px"><strong>Tu líder ya aprobó tu solicitud.</strong> Recuerda que este permiso también necesita la aprobación de <strong>Talento Humano</strong>. Te avisaremos por correo cuando tomen la decisión final.</p>' : ''}
        ${d.rejectionReason ? `<p><strong>Motivo del rechazo:</strong> ${d.rejectionReason}</p>` : ''}
        ${d.requiresDocs === 'true' ? '<p>Recuerda cargar tus documentos de soporte dentro del plazo establecido.</p>' : ''}
        <hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">
        <p style="color:#888;font-size:12px">Portal de Permisos, Interlan</p>
      </div>
    `;
    },
  },
  'th_decision': {
    subject: (d) => d.action === 'denegado' || d.action === 'rechazado'
      ? 'Talento Humano ha rechazado tu solicitud'
      : 'Talento Humano ha gestionado tu solicitud',
    body: (d) => {
      const rejected = d.action === 'denegado' || d.action === 'rechazado';
      const headline = rejected ? 'Talento Humano ha rechazado tu solicitud' : 'Decisión de Talento Humano';
      const actionText = rejected ? 'ha rechazado' : `ha <strong>${d.action}</strong>`;
      return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:${rejected ? '#E53935' : '#0041FF'}">${headline}</h2>
        <p>Hola ${d.employeeName},</p>
        <p>Talento Humano ${actionText} tu solicitud de <strong>${d.motivo}</strong>.</p>
        ${renderDetails(d)}
        ${d.action === 'aprobado' ? '<p>Tu permiso ha sido autorizado. Una vez ocurra la calamidad, recuerda cargar los documentos de soporte dentro del plazo establecido.</p>' : ''}
        ${d.rejectionReason ? `<p><strong>Motivo del rechazo:</strong> ${d.rejectionReason}</p>` : ''}
        <hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">
        <p style="color:#888;font-size:12px">Portal de Permisos, Interlan</p>
      </div>
    `;
    },
  },
  'docs_reminder': {
    subject: () => 'Recordatorio: documentos pendientes de tu solicitud',
    body: (d) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#FFB800">Documentos pendientes</h2>
        <p>Hola ${d.employeeName},</p>
        <p>Tienes documentos pendientes para tu solicitud de <strong>${d.motivo}</strong>.</p>
        <p><strong>Plazo de entrega:</strong> ${d.deadline}</p>
        <p>Por favor carga tus documentos lo antes posible.</p>
        <hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">
        <p style="color:#888;font-size:12px">Portal de Permisos, Interlan</p>
      </div>
    `,
  },
  'mas_info': {
    subject: () => 'Se requiere más información sobre tu solicitud',
    body: (d) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#FFB800">Más información requerida</h2>
        <p>Hola ${d.employeeName},</p>
        <p>Talento Humano necesita información adicional sobre tu solicitud de <strong>${d.motivo}</strong>.</p>
        <p><strong>Mensaje:</strong> ${d.message}</p>
        ${d.appUrl && d.solicitudId ? `<p style="margin:20px 0"><a href="${d.appUrl}/mis-solicitudes/${d.solicitudId}" style="display:inline-block;background:#0041FF;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px">Subir información adicional</a></p><p style="color:#888;font-size:12px">El botón te lleva directamente a tu solicitud en el portal para cargar lo que se te pide.</p>` : ''}
        <hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">
        <p style="color:#888;font-size:12px">Portal de Permisos, Interlan</p>
      </div>
    `,
  },
  'solicitud_finalizada': {
    subject: () => 'Tu solicitud ha sido finalizada',
    body: (d) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#00C853">Solicitud finalizada</h2>
        <p>Hola ${d.employeeName},</p>
        <p>Tu solicitud de <strong>${d.motivo}</strong> ha sido aprobada y finalizada por Talento Humano.</p>
        <hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">
        <p style="color:#888;font-size:12px">Portal de Permisos, Interlan</p>
      </div>
    `,
  },
  'nueva_solicitud_lider': {
    subject: () => 'Nueva solicitud de permiso pendiente',
    body: (d) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#0041FF">Nueva solicitud pendiente</h2>
        <p>Hola,</p>
        <p><strong>${d.employeeName}</strong> ha enviado una solicitud de <strong>${d.motivo}</strong>.</p>
        ${renderDetails(d)}
        <p>Por favor revisa y gestiona esta solicitud en el portal.</p>
        <hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">
        <p style="color:#888;font-size:12px">Portal de Permisos, Interlan</p>
      </div>
    `,
  },
  'reminder_lider': {
    subject: () => 'Recordatorio: solicitud pendiente de gestión',
    body: (d) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#FFB800">Solicitud sin gestionar</h2>
        <p>La solicitud de <strong>${d.motivo}</strong> de <strong>${d.employeeName}</strong> aún no ha sido gestionada.</p>
        <p>Tienes menos de 5 horas hábiles para gestionarla.</p>
        <hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">
        <p style="color:#888;font-size:12px">Portal de Permisos, Interlan</p>
      </div>
    `,
  },
  'calamidad_aprobada_th': {
    subject: (d) => `Aprobación de Talento Humano requerida: ${d.motivo || 'Calamidad doméstica'} de ${d.employeeName}`,
    body: (d) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#0041FF">Pendiente de tu aprobación</h2>
        <p>El líder ha aprobado la solicitud de <strong>${d.motivo || 'Calamidad doméstica'}</strong> de <strong>${d.employeeName}</strong>.</p>
        ${renderDetails(d)}
        <p>Esta solicitud requiere tu aprobación para otorgar el permiso al empleado. Revísala en el portal.</p>
        <hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">
        <p style="color:#888;font-size:12px">Portal de Permisos, Interlan</p>
      </div>
    `,
  },
  'docs_cargados_th': {
    subject: () => 'Documentos cargados: listos para revisión',
    body: (d) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#0041FF">Documentos listos para revisión</h2>
        <p><strong>${d.employeeName}</strong> ha cargado los documentos de soporte para su solicitud de <strong>${d.motivo}</strong>.</p>
        ${renderDetails(d)}
        <p>Los documentos van <strong>adjuntos en este correo</strong>; también puedes revisarlos en el portal.</p>
        <hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">
        <p style="color:#888;font-size:12px">Portal de Permisos, Interlan</p>
      </div>
    `,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const payload: NotificationPayload = await req.json();
    const { event, recipientEmail, data } = payload;

    const template = EMAIL_TEMPLATES[event];
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Unknown event: ${event}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = template.subject(data);
    let htmlContent = template.body(data);

    // Botones de gestión desde el correo (líder: nueva solicitud; TH: validación de calamidad/traslado)
    const ACTION_EVENTS: Record<string, string> = { nueva_solicitud_lider: 'lider', calamidad_aprobada_th: 'th', docs_cargados_th: 'docs' };
    const stage = ACTION_EVENTS[event];
    if (stage && data?.solicitudId && /^[0-9a-f-]{36}$/i.test(data.solicitudId)) {
      try {
        const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
        const { error: tokErr } = await db.from('email_action_tokens').insert({ token, solicitud_id: data.solicitudId, stage });
        if (tokErr) throw tokErr;
        const rawBase = data.appUrl || '';
        const base = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.lovable\.app$/i.test(rawBase) || /^https?:\/\/localhost(:\d+)?$/.test(rawBase)
          ? rawBase : 'https://portalthinterlan.lovable.app';
        const link = (a: string) => `${base}/accion-correo?t=${token}&a=${a}`;
        const NOTIFY_ONLY = ['Cita escolar acudiente','Cita judicial o administrativa','Cita médica acudiente','Cita médica programada','Derecho por jurado de votación','Derecho por votación','Luto','Uso de bicicleta'];
        const approveLabel = stage === 'docs' ? 'Aprobar y finalizar' : stage === 'lider' && NOTIFY_ONLY.includes(data.motivo) ? 'Dar por notificado' : 'Aprobar';
        const buttons = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:0 20px 20px">
        <p style="margin:0 0 12px">Puedes gestionarla directamente desde este correo:</p>
        <a href="${link('aprobar')}" style="display:inline-block;background:#0041FF;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px;margin-right:8px">${approveLabel}</a>
        ${stage === 'docs'
          ? `<a href="${link('info')}" style="display:inline-block;background:#F5A623;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px">Solicitar más información</a>`
          : `<a href="${link('rechazar')}" style="display:inline-block;background:#E53935;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px">Rechazar</a>`}
        <p style="color:#888;font-size:12px;margin-top:12px">Estos botones solo funcionan una vez y vencen en 30 días.</p>
      </div>`;
        htmlContent = htmlContent.replace(/<hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">/, `${buttons}<hr style="border:none;border-top:1px solid #E8E8E8;margin:20px 0">`);
      } catch (e) {
        console.error('Could not create action token:', e);
      }
    }

    // Modo pruebas: sin dominio propio verificado, Resend solo entrega al correo
    // de la cuenta. Redirigimos todos los destinatarios a los buzones de prueba
    // (TEST_EMAIL_INBOX: lista separada por comas).
    const TEST_INBOXES = (Deno.env.get('TEST_EMAIL_INBOX') || 'andrearivascardona@gmail.com')
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const actualRecipients = TEST_INBOXES.length ? TEST_INBOXES : ['andrearivascardona@gmail.com'];
    if (!recipientEmail?.toLowerCase() || !TEST_INBOXES.includes(recipientEmail.toLowerCase())) {
      htmlContent = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:10px 20px;background:#EDF1FF;color:#000;font-size:13px">
        <strong>Modo pruebas:</strong> este correo estaba dirigido a ${recipientEmail}
      </div>${htmlContent}`;
    }

    // Adjuntar los documentos de soporte al correo de TH (máx. 5 archivos, 15MB en total)
    const attachments: Array<{ filename: string; content: string }> = [];
    if (event === 'docs_cargados_th' && data?.solicitudId && /^[0-9a-f-]{36}$/i.test(data.solicitudId)) {
      try {
        const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const { data: docs } = await db.from('documentos')
          .select('file_name, file_path, file_size')
          .eq('solicitud_id', data.solicitudId)
          .order('created_at', { ascending: false })
          .limit(5);
        let total = 0;
        for (const doc of docs || []) {
          if (total + (doc.file_size || 0) > 15 * 1024 * 1024) break;
          const { data: fileData, error: dlErr } = await db.storage.from('documentos').download(doc.file_path);
          if (dlErr || !fileData) { console.error('Download error:', doc.file_path, dlErr); continue; }
          const buf = new Uint8Array(await fileData.arrayBuffer());
          let bin = '';
          for (const b of buf) bin += String.fromCharCode(b);
          attachments.push({ filename: doc.file_name, content: btoa(bin) });
          total += doc.file_size || 0;
        }
        console.log(`📎 Adjuntos preparados: ${attachments.length}`);
      } catch (e) {
        console.error('Could not attach documents:', e);
      }
    }

    const response = await fetch(`${RESEND_API_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        // TEMPORAL PRUEBAS, cambiar a notificaciones@interlan.co cuando el dominio esté verificado
        from: 'Portal de Permisos Interlan <onboarding@resend.dev>',
        to: actualRecipients,
        subject,
        html: htmlContent,
        ...(attachments.length ? { attachments } : {}),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`Resend API error [${response.status}]:`, JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Email sent [${event}] to ${recipientEmail}: ${subject}`);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully", id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
