# Civic Platform

A mobile-first civic issue reporting and resolution platform for day-to-day public problems and emergency incidents.

## Vision

Citizens report issues with photo, video, voice, text, and geo-location. The system classifies the complaint, assigns priority, routes it to the correct government department, and tracks the full lifecycle from submission to closure.

## Core goals

- Make complaint reporting simple and fast
- Support day-to-day civic domains and emergency domains
- Route complaints to the correct department with priority
- Provide transparent status tracking to citizens
- Give officials a fast dashboard for triage, assignment, and monitoring
- Keep the system scalable, low-latency, and future-ready

## Main domains

1. Roads and Transportation
2. Sanitation and Waste Management
3. Water Supply, Sewerage, and Drainage
4. Street Lighting and Electrical Infrastructure
5. Public Infrastructure and Amenities
6. Environment and Public Health

## Emergency domains

1. Fire Emergencies
2. Flood and Water Disaster
3. Structural and Infrastructure Hazard
4. Electrical Hazard
5. Disaster and Rescue

## Complaint lifecycle

1. Draft
2. Submitted
3. Validated
4. Classified
5. Prioritized
6. Assigned
7. Accepted
8. In Progress
9. Resolved
10. Citizen Verified
11. Closed

Additional states:

- Escalated
- Reopened
- Duplicate
- Rejected
- On Hold

## Proposed stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Leaflet with OpenStreetMap

### Platform

- Supabase Auth
- Supabase Postgres
- PostGIS
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions

### AI

- Whisper for speech-to-text
- DistilBERT or similar lightweight text classifier
- YOLOv8n or MobileNet for image classification

## App areas

- Citizen portal
- Department dashboard
- Field officer workspace
- Super admin configuration
- Analytics and SLA dashboard

## Folder plan

- `app/` Next.js App Router pages
- `components/` shared UI sections
- `lib/` config, types, and helpers
- `data/` static seed content used by the frontend
- `docs/` architecture, lifecycle, and page planning

## Planning docs

- `docs/PROJECT_BLUEPRINT.md`
- `docs/FRONTEND_PLAN.md`
- `docs/PAGE_MAP.md`
- `docs/ROLES_AND_PERMISSIONS.md`
- `docs/COMPLAINT_LIFECYCLE.md`
- `docs/DOMAIN_ROUTING_MAP.md`
- `docs/PRIORITY_SCORING.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/BACKEND_STRUCTURE.md`
- `docs/LOCAL_DATABASE_SETUP.md`

## Next build steps

1. Finalize data model and routing rules
2. Build the design system and page structure
3. Implement citizen report flow
4. Add admin dashboard and complaint lifecycle updates
5. Connect Supabase auth, database, storage, and realtime
6. Add AI-assisted classification after the MVP workflow is stable
