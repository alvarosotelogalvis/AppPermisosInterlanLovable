import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type Summary = {
  employeeName: string; motivo: string; type: string;
  fechaInicio: string; fechaFin: string; horaInicio?: string; horaFin?: string;
  diasHabiles: number; status: string; stage: 'lider' | 'th' | 'docs'; notifyOnly: boolean;
};
type State = 'loading' | 'ok' | 'invalid' | 'used' | 'expired' | 'already_managed' | 'done' | 'error';

const MESSAGES: Record<string, { title: string; text: string }> = {
  invalid: { title: 'Enlace no válido', text: 'Este enlace no existe o está incompleto. Gestiona la solicitud desde el portal.' },
  used: { title: 'Enlace ya utilizado', text: 'Esta acción ya se realizó desde el correo. Cada botón solo funciona una vez.' },
  expired: { title: 'Enlace vencido', text: 'Este enlace venció. Gestiona la solicitud desde el portal.' },
  already_managed: { title: 'Esta solicitud ya fue gestionada', text: 'La solicitud ya no está pendiente de tu gestión. Puedes ver su estado en el portal.' },
  error: { title: 'No se pudo completar', text: 'Ocurrió un problema. Intenta de nuevo o gestiona la solicitud desde el portal.' },
};

const AccionCorreo = () => {
  const [params] = useSearchParams();
  const t = params.get('t') || '';
  const a = params.get('a');
  const action = a === 'rechazar' ? 'rechazar' : a === 'info' ? 'info' : 'aprobar';
  const [state, setState] = useState<State>('loading');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [doneMsg, setDoneMsg] = useState('');

  useEffect(() => {
    if (!t) { setState('invalid'); return; }
    supabase.functions.invoke('email-action', { body: { t, mode: 'info' } }).then(({ data, error }) => {
      if (error || !data) { setState('error'); return; }
      setSummary(data.summary || null);
      setState(data.state || 'error');
    });
  }, [t]);

  const execute = async () => {
    if (action !== 'aprobar' && !reason.trim()) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke('email-action', {
      body: { t, mode: 'execute', action, reason: reason.trim(), appUrl: window.location.origin },
    });
    setSending(false);
    if (error || !data) { setState('error'); return; }
    if (data.summary) setSummary(data.summary);
    if (data.state === 'done') setDoneMsg(data.message);
    setState(data.state || 'error');
  };

  const approveLabel = summary?.stage === 'docs' ? 'Aprobar y finalizar' : summary?.notifyOnly ? 'Dar por notificado' : 'Aprobar';

  return (
    <div className="min-h-screen bg-interlan-light-gray flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] bg-background border border-interlan-border-gray rounded-xl p-6">
        <p className="font-nunito text-[12px] font-semibold text-interlan-blue uppercase tracking-wide mb-2">Portal de Permisos Interlan</p>

        {state === 'loading' && <p className="font-nunito text-[14px] text-interlan-text-secondary">Cargando solicitud...</p>}

        {summary && state !== 'loading' && (
          <div className="mb-5 p-4 bg-interlan-light-blue rounded-lg font-nunito text-[14px] space-y-1">
            <p><strong>Empleado:</strong> {summary.employeeName}</p>
            <p><strong>Motivo:</strong> {summary.motivo}</p>
            <p><strong>Fechas:</strong> {summary.fechaInicio}{summary.fechaFin && summary.fechaFin !== summary.fechaInicio ? ` a ${summary.fechaFin}` : ''}</p>
            {summary.horaInicio && summary.horaFin && <p><strong>Horario:</strong> {summary.horaInicio} a {summary.horaFin}</p>}
            <p><strong>Gestión:</strong> {summary.stage === 'th' ? 'Talento Humano' : summary.stage === 'docs' ? 'Talento Humano (revisión de documentos)' : 'Líder'}</p>
          </div>
        )}

        {state === 'ok' && action === 'aprobar' && (
          <>
            <h1 className="font-inter font-bold text-[20px] mb-2">Confirmar: {approveLabel.toLowerCase()}</h1>
            <p className="font-nunito text-[14px] text-interlan-text-secondary mb-5">El empleado será notificado por correo.</p>
            <button disabled={sending} onClick={execute} className="w-full px-4 py-3 font-nunito text-[15px] font-bold bg-interlan-blue text-white rounded-[6px] disabled:opacity-50">
              {sending ? 'Procesando...' : approveLabel}
            </button>
          </>
        )}

        {state === 'ok' && action === 'rechazar' && (
          <>
            <h1 className="font-inter font-bold text-[20px] mb-2">Rechazar solicitud</h1>
            <label className="block font-nunito text-[13px] font-semibold text-interlan-text-secondary mb-1.5">Motivo del rechazo <span className="text-[#E53935]">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} maxLength={1000}
              className="w-full px-3 py-2 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background resize-none mb-4"
              placeholder="Escribe el motivo..." />
            <button disabled={sending || !reason.trim()} onClick={execute} className="w-full px-4 py-3 font-nunito text-[15px] font-bold bg-[#E53935] text-white rounded-[6px] disabled:opacity-50">
              {sending ? 'Procesando...' : 'Rechazar'}
            </button>
          </>
        )}

        {state === 'ok' && action === 'info' && (
          <>
            <h1 className="font-inter font-bold text-[20px] mb-2">Solicitar más información</h1>
            <label className="block font-nunito text-[13px] font-semibold text-interlan-text-secondary mb-1.5">¿Qué información necesitas del empleado? <span className="text-[#E53935]">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} maxLength={1000}
              className="w-full px-3 py-2 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background resize-none mb-4"
              placeholder="Escribe el mensaje para el empleado..." />
            <button disabled={sending || !reason.trim()} onClick={execute} className="w-full px-4 py-3 font-nunito text-[15px] font-bold bg-interlan-blue text-white rounded-[6px] disabled:opacity-50">
              {sending ? 'Procesando...' : 'Enviar solicitud de información'}
            </button>
          </>
        )}

        {state === 'done' && (
          <>
            <h1 className="font-inter font-bold text-[20px] mb-2">{action === 'rechazar' ? 'Solicitud rechazada' : 'Listo'}</h1>
            <p className="font-nunito text-[14px] text-interlan-text-secondary">{doneMsg}</p>
          </>
        )}

        {MESSAGES[state] && (
          <>
            <h1 className="font-inter font-bold text-[20px] mb-2">{MESSAGES[state].title}</h1>
            <p className="font-nunito text-[14px] text-interlan-text-secondary">{MESSAGES[state].text}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AccionCorreo;
