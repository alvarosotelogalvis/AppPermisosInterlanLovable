# Project Memory

## Core
Interlan employee permissions portal. Colombian company. Spanish UI.
Colors: Primary #0041FF, Black #000, Light Blue #EDF1FF, Light Gray #F7F8FF, Border #E8E8E8.
Fonts: Inter (headings bold), Nunito Sans (body). No gradients, no shadows. Flat design.
Auth context with 3 mock roles: employee, leader, hr. Role switcher in navbar.
RULE: Only modify what is explicitly requested. Never touch unrelated functionality.

## Memories
- [Brand design system](mem://design/brand) — Full color palette, typography specs, border radius, spacing rules
- [Status system](mem://design/status) — 5 statuses with bg/text/border colors
- [Permission types](mem://features/permissions) — 3 types with subtypes, document requirements, validation rules
- [Routes](mem://features/routes) — All 8 routes with role-based protection
- [DB and notifications](mem://features/db-and-notifications) — DB tables, edge function, demo/real mode toggle
- [Licencia remunerada logic](mem://features/licencia-remunerada-logic) — Dynamic fields, validations, flows per motivo
- [Email notifications](mem://features/email-notifications) — Email recipients per role and flow per permission type
- [Calamidad 3-level flow](mem://features/calamidad-3-levels) — 3 levels: Leader+TH validate → permission granted → final doc approval
- [No-touch rule](mem://features/no-touch-rule) — Only modify what is explicitly requested; never remove unrelated functionality
