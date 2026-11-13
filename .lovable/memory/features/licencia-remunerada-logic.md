---
name: Licencia remunerada por ley - full spec
description: Complete form logic, holidays 2025-2036, work schedule, duration calc, approval flows, email events per motivo
type: feature
---

## Work Schedule (updated)
- Lunes:      08:00–12:30 (4.5h) + 13:30–17:00 (3.5h) = **8h** (480 min)
- Mar–Vie:    08:00–12:30 (4.5h) + 13:30–17:30 (4h)   = **8h 30min** (510 min)
- Almuerzo:   12:30–13:30 (no cuenta)
- Media jornada: lunes = 4h (240 min); mar–vie = 4h 15min (255 min)
- Sábado/Domingo excluidos. Festivos hardcoded 2025–2036.
- Helpers en src/data/colombianHolidays.ts: `getFullDayMinutes(date)`, `getHalfDayMinutes(date)`, `getAfternoonEndMinutes(date)`, `getAfternoonEndTime(date)`, `sumBusinessMinutesRange(start,end)`.

## Duration Rules
- RULE 1 (hours): Deduct lunch only if range crosses 12:30–13:30
- RULE 2 (days): Count business days Mon–Fri excluding holidays; sum real jornada per day for multi-day totals
- Regreso: si hora fin ≥ fin de jornada del día → siguiente día hábil 08:00; si cae en 12:30–13:30 → 13:30 mismo día

## 10 Motivos with Flows
1. Calamidad doméstica grave — Programada/No programada, min 1h max 3 días, DOUBLE APPROVAL (Líder→TH), 5 días hábiles soportes
2. Cita escolar acudiente — Future only, 1h–4h, NOTIFICATION flow, 5 días hábiles soportes
3. Cita judicial o administrativa — Future only, no duration limit, NOTIFICATION flow, 5 días hábiles soportes
4. Cita médica acudiente — Future only, 1h–4h, NOTIFICATION flow, 5 días hábiles soportes
5. Cita médica programada — Future only, 1h–4h, NOTIFICATION flow, 5 días hábiles soportes
6. Derecho por jurado de votación — Electoral flag, fixed 1 full day (depende del día), NOTIFICATION flow
7. Derecho por votación — Electoral flag, fixed half day (depende del día), NOTIFICATION flow
8. Luto — Future only, max 5 días hábiles, NOTIFICATION flow, 30 días CALENDARIO soportes
9. Sepelio compañeros — Future only, max media jornada (depende del día), LEADER-ONLY APPROVAL
10. Uso de bicicleta — Future only, fixed 1 full day (depende del día), 1x per semester, NOTIFICATION flow, 5 días hábiles soportes

## Document upload removed from form — only in post-submission view

## Pending (requires Lovable Cloud)
- Database persistence for requests
- Email notifications (11 event types, all to andrearc@interlan.com.co in test)
- Automated reminders (5h hábiles before start, 1 day before support deadline)
- Semester validation for bicicleta against DB
- Support document configurable list per admin
