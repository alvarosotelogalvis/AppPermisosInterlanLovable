import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Same test inbox the portal uses for role notifications (send-notification redirects anyway)
const TEST_EMAIL = 'felipeullo33@gmail.com';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const EXPECTED_STATUS: Record<string, string> = { lider: 'pendiente', th: 'en_revision_th', docs: 'soportes_en_revision' };

const NOTIFY_ONLY = [
  'Cita escolar acudiente', 'Cita judicial o administrativa', 'Cita médica acudiente', 'Cita médica programada',
  'Derecho por jurado de votación', 'Derecho por votación', 'Luto', 'Uso de bicicleta',
];

function todayEs() {
  return new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Bogota' }).replace(/ de /g, '/');
}

async function notify(event: string, data: Record<string, string>) {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`;
  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ event, recipientEmail: TEST_EMAIL, recipientName: '', data }),
    });
    if (!r.ok) console.error('notify failed', r.status, await r.text());
  } catch (e) { console.error('notify error', e); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const t = typeof body.t === 'string' ? body.t : '';
    const mode = body.mode === 'execute' ? 'execute' : 'info';
    const action = body.action === 'rechazar' ? 'rechazar' : body.action === 'info' ? 'info' : 'aprobar';
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : '';
    const appUrl = typeof body.appUrl === 'string' ? body.appUrl : '';
    if (!t || t.length < 20 || t.length > 200) return json({ state: 'invalid' });

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: tok } = await db.from('email_action_tokens').select('*').eq('token', t).maybeSingle();
    if (!tok) return json({ state: 'invalid' });
    const { data: sol } = await db.from('solicitudes').select('*').eq('id', tok.solicitud_id).maybeSingle();
    if (!sol) return json({ state: 'invalid' });

    const summary = {
      employeeName: sol.employee_name, motivo: sol.motivo, type: sol.type,
      fechaInicio: sol.fecha_inicio, fechaFin: sol.fecha_fin, horaInicio: sol.hora_inicio, horaFin: sol.hora_fin,
      diasHabiles: sol.dias_habiles, status: sol.status, stage: tok.stage,
      notifyOnly: tok.stage === 'lider' && NOTIFY_ONLY.includes(sol.motivo),
    };

    let state = 'ok';
    if (tok.used_at) state = 'used';
    else if (new Date(tok.expires_at) < new Date()) state = 'expired';
    else if (sol.status !== EXPECTED_STATUS[tok.stage]) state = 'already_managed';

    if (mode === 'info' || state !== 'ok') return json({ state, summary });

    if ((action === 'rechazar' || action === 'info') && !reason) return json({ error: 'reason_required' }, 400);

    if ((action === 'info') !== (tok.stage === 'docs') && !(tok.stage === 'docs' && action === 'aprobar')) return json({ error: 'invalid_action' }, 400);
    // Consume token atomically (only if still unused)
    const { data: consumed } = await db.from('email_action_tokens')
      .update({ used_at: new Date().toISOString(), used_action: action })
      .eq('id', tok.id).is('used_at', null).select('id');
    if (!consumed || consumed.length === 0) return json({ state: 'used', summary });

    const base = {
      solicitudId: sol.id, employeeName: sol.employee_name, motivo: sol.motivo,
      fechaInicio: sol.fecha_inicio, fechaFin: sol.fecha_fin, diasHabiles: String(sol.dias_habiles),
      approver: sol.approver, appUrl,
      employeeArea: sol.employee_area ?? '', tipo: sol.type ?? '', fechaSolicitud: sol.fecha_solicitud ?? '',
      horaInicio: sol.hora_inicio ?? '', horaFin: sol.hora_fin ?? '',
      calamidadTipo: sol.calamidad_tipo ?? '', calamidadSubcategoria: sol.calamidad_subcategoria ?? '',
      calamidadDescripcion: sol.calamidad_descripcion ?? '', lutoFamiliar: sol.luto_familiar ?? '',
      direccion: sol.direccion ?? '', ciudad: sol.ciudad ?? '', pais: sol.pais ?? '',
    };
    const m = sol.motivo;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const emails: [string, Record<string, string>][] = [];
    let resultMsg = '';


    if (tok.stage === 'docs') {
      if (action === 'info') {
        Object.assign(updates, { status: 'mas_info_requerida', document_status: 'mas_info', info_request_message: reason });
        emails.push(['mas_info', { ...base, message: reason }]);
        resultMsg = 'Se solicitó más información al empleado.';
      } else {
        Object.assign(updates, { status: 'finalizado', document_status: 'aprobado_finalizado' });
        emails.push(['solicitud_finalizada', base]);
        resultMsg = 'La solicitud fue aprobada y finalizada. El empleado fue notificado.';
      }
    } else if (action === 'rechazar') {
      Object.assign(updates, { status: 'denegado', rejection_reason: reason, rejected_by: tok.stage === 'th' ? 'th' : 'lider', rejection_date: todayEs() });
      if (tok.stage === 'th') emails.push(['th_decision', { ...base, action: 'denegado', rejectionReason: reason }]);
      else emails.push(['lider_gestiono', { ...base, action: 'denegado', rejectionReason: reason, requiresDocs: 'false' }]);
      resultMsg = 'La solicitud fue rechazada y el empleado fue notificado.';
    } else if (tok.stage === 'th') {
      if (m === 'Traslado temporal por teletrabajo móvil') Object.assign(updates, { status: 'aprobado', document_status: 'aprobado_finalizado' });
      else updates.status = 'aprobado';
      emails.push(['th_decision', { ...base, action: 'aprobado', rejectionReason: '' }]);
      resultMsg = 'La solicitud fue aprobada por Talento Humano y el empleado fue notificado.';
    } else if (m === 'Calamidad doméstica grave' || m === 'Traslado temporal por teletrabajo móvil') {
      updates.status = 'en_revision_th';
      emails.push(['lider_gestiono', { ...base, action: 'aprobado', requiresDocs: 'false', requiresTH: 'true', rejectionReason: '' }]);
      emails.push(['calamidad_aprobada_th', base]);
      resultMsg = 'La solicitud fue aprobada y pasó a revisión de Talento Humano.';
    } else if (['Cumpleaños', 'Quinquenio', 'Diligencias personales'].includes(m)) {
      Object.assign(updates, { status: 'finalizado', document_status: 'aprobado_finalizado' });
      emails.push(['lider_gestiono', { ...base, action: 'aprobado', requiresDocs: 'false', rejectionReason: '' }]);
      resultMsg = 'La solicitud fue aprobada y finalizada.';
    } else if (['Sepelio compañeros', 'Graduación', 'Sepelio otros familiares', 'Luto mascotas', 'Matrimonio'].includes(m)) {
      updates.status = 'aprobado';
      emails.push(['lider_gestiono', { ...base, action: 'aprobado', requiresDocs: m === 'Sepelio compañeros' ? 'false' : 'true', rejectionReason: '' }]);
      resultMsg = 'La solicitud fue aprobada y el empleado fue notificado.';
    } else {
      updates.status = 'notificado';
      emails.push(['lider_gestiono', { ...base, action: 'notificado', requiresDocs: 'true', rejectionReason: '' }]);
      resultMsg = 'La solicitud quedó como notificada y el empleado fue avisado.';
    }

    const { error: upErr } = await db.from('solicitudes').update(updates).eq('id', sol.id);
    if (upErr) {
      await db.from('email_action_tokens').update({ used_at: null, used_action: null }).eq('id', tok.id);
      console.error('update error', upErr);
      return json({ error: 'update_failed' }, 500);
    }
    // Invalidate any other open tokens for this stage
    await db.from('email_action_tokens').update({ used_at: new Date().toISOString(), used_action: 'superseded' })
      .eq('solicitud_id', sol.id).eq('stage', tok.stage).is('used_at', null);

    for (const [ev, d] of emails) await notify(ev, d);

    return json({ state: 'done', action, message: resultMsg, summary: { ...summary, status: updates.status } });
  } catch (e) {
    console.error('email-action error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
