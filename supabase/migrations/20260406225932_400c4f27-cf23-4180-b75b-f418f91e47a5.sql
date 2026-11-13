
-- Enum types
CREATE TYPE public.request_status AS ENUM (
  'pendiente', 'notificado', 'en_revision_th', 'aprobado', 'denegado',
  'soportes_pendientes', 'soportes_en_revision', 'finalizado', 'mas_info_requerida'
);

CREATE TYPE public.document_status AS ENUM (
  'sin_documentos', 'documentos_cargados', 'aprobado_finalizado', 'mas_info'
);

CREATE TYPE public.user_role AS ENUM ('employee', 'leader', 'hr');

-- Usuarios table (not tied to auth.users - this is for the demo/notification system)
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  notification_email TEXT,
  cedula TEXT,
  area TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'employee',
  initials TEXT NOT NULL,
  leader_id UUID REFERENCES public.usuarios(id),
  leader_name TEXT,
  leader_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solicitudes table
CREATE TABLE public.solicitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.usuarios(id),
  employee_name TEXT NOT NULL,
  employee_initials TEXT NOT NULL,
  employee_area TEXT NOT NULL,
  type TEXT NOT NULL,
  motivo TEXT NOT NULL,
  fecha_solicitud TEXT NOT NULL,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  dias_habiles NUMERIC NOT NULL DEFAULT 1,
  status public.request_status NOT NULL DEFAULT 'pendiente',
  approver TEXT NOT NULL,
  approver_email TEXT NOT NULL,
  document_status public.document_status NOT NULL DEFAULT 'sin_documentos',
  document_deadline TEXT,
  rejection_reason TEXT,
  info_request_message TEXT,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  calamidad_subcategoria TEXT,
  calamidad_tipo TEXT,
  calamidad_descripcion TEXT,
  luto_familiar TEXT,
  hora_inicio TEXT,
  hora_fin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documentos table
CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES public.solicitudes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- App config table (replaces localStorage for real mode)
CREATE TABLE public.app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies: public read for now (demo app, no auth.users tied)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon/authenticated (demo app without real auth)
CREATE POLICY "Allow all read on usuarios" ON public.usuarios FOR SELECT USING (true);
CREATE POLICY "Allow all insert on usuarios" ON public.usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on usuarios" ON public.usuarios FOR UPDATE USING (true);

CREATE POLICY "Allow all read on solicitudes" ON public.solicitudes FOR SELECT USING (true);
CREATE POLICY "Allow all insert on solicitudes" ON public.solicitudes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on solicitudes" ON public.solicitudes FOR UPDATE USING (true);

CREATE POLICY "Allow all read on documentos" ON public.documentos FOR SELECT USING (true);
CREATE POLICY "Allow all insert on documentos" ON public.documentos FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all read on app_config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Allow all insert on app_config" ON public.app_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on app_config" ON public.app_config FOR UPDATE USING (true);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);

CREATE POLICY "Allow all uploads to documentos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "Allow all reads from documentos" ON storage.objects FOR SELECT USING (bucket_id = 'documentos');
