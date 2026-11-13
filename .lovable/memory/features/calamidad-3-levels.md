---
name: Calamidad doméstica 5-step approval flow
description: Calamidad flow: Leader validates → TH approves permission → Employee uploads docs → TH final review (approve/deny/more info loop)
type: feature
---
## Calamidad doméstica grave — 5-step flow

### Step 1: Empleado crea solicitud
- Notify leader only (NOT TH)
- Status: pendiente

### Step 2: Líder valida calamidad
- Approve → en_revision_th, notify TH
- Deny → denegado, notify employee
- No "more info" option

### Step 3: TH aprueba permiso
- Approve → aprobado (permission granted), notify employee
- Deny → denegado, notify employee
- No "more info" option

### Step 4: Empleado toma calamidad y carga documentos
- Upload docs → soportes_en_revision, notify TH

### Step 5: TH revisa documentos (can loop)
- Approve → finalizado, notify employee
- Deny → denegado, notify employee
- More info → mas_info_requerida, notify employee with message
- If more info: employee re-uploads (→ soportes_en_revision), TH reviews again (loop)

### Timeline labels
Enviada → Validación líder → Validación TH → Permiso otorgado → Soportes cargados → Aprobación final

### HR Tabs in Aprobaciones
- Pendientes: en_revision_th (waiting for TH validation)
- Revisión de soportes: soportes_en_revision (docs to review)
- Gestionadas: aprobado, denegado, finalizado
