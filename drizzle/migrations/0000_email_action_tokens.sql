CREATE TABLE public.email_action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  solicitud_id uuid NOT NULL REFERENCES public.solicitudes(id) ON DELETE CASCADE,
  stage text NOT NULL,
  used_at timestamptz,
  used_action text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_action_tokens TO service_role;
ALTER TABLE public.email_action_tokens ENABLE ROW LEVEL SECURITY;