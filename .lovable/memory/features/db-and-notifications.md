---
name: Database and notification architecture
description: DB tables (usuarios, solicitudes, documentos, app_config), edge function for notifications, demo/real mode toggle
type: feature
---
## DB Tables
- `usuarios` — id, name, email, notification_email, cedula, area, role (enum), initials, leader_id, leader_name, leader_email
- `solicitudes` — mirrors PermissionRequest with snake_case columns, JSONB timeline
- `documentos` — linked to solicitudes, stores file metadata
- `app_config` — key-value config store

## Demo/Real Mode
- Toggle in Administración under Configuración
- Demo mode: uses mockRequests in-memory, no emails sent
- Real mode: reads/writes from DB, sends notification emails via edge function
- Mode (`app_mode`), emails switch (`emails_active`) and electoral period are global, stored in `app_config` (shared by all browsers)

## Notification System
- Edge function: `send-notification` — receives event + recipientEmail + data
- Service layer: `src/services/notificationService.ts` — helper functions per event
- Only sends in real mode
- Email domain NOT YET configured — emails are logged but not delivered

## Notification Emails (NOT login)
- felipeulloa33@hotmail.com → employee notifications
- felipeullo33@gmail.com → leader notifications
- andrearivascardona@gmail.com → TH notifications

## RLS
- All tables have permissive `USING (true)` policies (demo app, no real auth)
- Storage bucket `documentos` created with open policies
