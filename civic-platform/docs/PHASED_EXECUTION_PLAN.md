# CivicPulse Phased Execution Plan

This project is a real-time civic operations platform, not a static website. The delivery plan below is structured for a production-grade public platform with citizen reporting, operator workflows, live operations, strong UI/UX, AI-assisted classification, and deployment readiness.

## Product Goal

Build a mobile-first, real-time public platform where citizens can report civic issues and emergency incidents using media, text, voice, and geo-location, while government teams can triage, route, act, and close complaints through a live operational dashboard.

## Product Principles

- Mobile-first for citizens, dashboard-first for operators
- Real-time and database-driven, never static
- Trustworthy, fast, and simple under stress
- Clear lifecycle and accountability for every complaint
- Good civic UX: low friction, high clarity, accessible language
- Extensible architecture for AI, analytics, and future channels

---

## Phase 1: Product Foundation and UX Hardening

### Objective

Turn the current prototype into a stable product foundation with a clean UX system, strong information architecture, consistent visual design, and tighter workflow polish for both citizen and operator experiences.

### UI/UX Scope

- Build a proper design system foundation
- Standardize spacing, typography, surfaces, status chips, action buttons, cards, forms, and empty states
- Remove remaining prototype-style guidance text from public-facing screens
- Improve navigation clarity for citizen and operator flows
- Improve mobile responsiveness across all major pages
- Improve loading, empty, and error states
- Make forms more guided and less intimidating
- Add trust-building visual patterns for a public-service product
- Improve landing page positioning for real public use
- Improve dashboard readability and scanning speed

### Citizen Experience Scope

- Refine report issue flow UI
- Improve report success screen
- Improve complaint timeline readability
- Improve complaint status visibility
- Improve complaint list filtering and scanning
- Improve emergency reporting screen

### Admin Experience Scope

- Improve dashboard visual hierarchy
- Improve queue usability
- Improve complaint detail information grouping
- Improve operator action clarity
- Reduce cognitive overload in complaint management screens

### Engineering Scope

- Refactor repeated UI patterns into reusable components
- Create standard status/color/token mappings
- Clean component props and page composition
- Remove remaining placeholder presentation blocks where possible
- Strengthen page structure for future dynamic expansion

### Deliverables

- Shared UI primitives and consistent design tokens
- Cleaner report flow
- Cleaner admin detail and queue experience
- Better public-facing information architecture
- UX baseline ready for realtime workflows

### Exit Criteria

- All core pages feel like one coherent product
- Mobile experience is clean across citizen flows
- Admin dashboard is visually scannable and operational
- Major mock/prototype feel is removed
- The system is ready to scale feature complexity without UI collapse

---

## Phase 2: Operational Workflow and Realtime Platform

### Objective

Complete the live operational backbone of the platform so complaints behave like real service records with real assignments, notifications, role restrictions, and near real-time updates.

### Workflow Scope

- Complete complaint lifecycle engine
- Enforce valid status transitions
- Add citizen verification flow
- Add reject, duplicate, on-hold, reopen, and escalation paths
- Add proof-of-resolution workflow
- Add stronger assignment state handling

### Role and Access Scope

- Complete role-based authorization on backend APIs
- Add signup/onboarding flow where needed
- Add field officer role workflows
- Restrict complaint access by role and ownership
- Improve session handling and protected routing

### Realtime Scope

- Live complaint queue refresh
- Live status refresh on citizen pages
- Live dashboard counters
- Real-time notifications or near-real-time polling layer
- Automatic refresh after critical actions

### Operations Scope

- Assign complaint to department and field officer
- Assignment acceptance flow
- Reassignment flow
- Officer task board
- Field notes
- Resolution proof uploads
- Queue-level SLA risk indicators

### Data Scope

- Stronger API validation
- Better pagination and filtering support
- Audit log usage for lifecycle changes
- Notification records for important events

### Deliverables

- Full operational complaint workflow
- Role-safe live dashboards
- Live complaint tracking for citizens
- Field execution flow for officers
- Realtime-ready platform foundation

### Exit Criteria

- Complaint can move end to end through the full lifecycle
- Citizens and operators see live state changes
- Field assignments work
- Role restrictions are enforced
- Queue and dashboard are operational, not demo-like

---

## Phase 3: Location, Media, Maps, and Public Utility

### Objective

Make the platform practical for real city use by strengthening maps, geo logic, public visibility, and media handling.

### Geo Scope

- Improve reverse geocoding
- Add ward/zone auto-detection
- Add location confidence handling
- Add nearby complaint lookup
- Add duplicate complaint proximity checks

### Map Scope

- Public issue map with filters
- Admin map with live issue markers
- Hotspot clustering
- Domain and status filtering on maps
- Emergency issue visibility

### Media Scope

- Production-style upload experience
- Upload progress
- Retry failed uploads
- Media previews
- Compression and optimization
- Resolution proof upload from field/admin side
- Media validation and safe handling

### Public Platform Scope

- Safe public complaint visibility rules
- Public browsing of civic issue trends
- Better landing/onboarding for public users
- Better complaint transparency without exposing sensitive internal data

### Deliverables

- Real map-driven issue experience
- Better geospatial operations
- Stronger media workflow
- Public utility features that feel city-ready

### Exit Criteria

- Maps are useful and dynamic, not placeholders
- Upload flow is robust
- Location intelligence is meaningful
- Public-facing experience is useful without exposing internal-only data

---

## Phase 4: Intelligence, AI, and Decision Assistance

### Objective

Add AI assistance where it creates operational value without making the system fragile.

### AI Scope

- Speech-to-text for voice complaints
- Text classification for domain and sub-problem
- Image classification for common issue types
- Severity estimation
- Duplicate complaint detection
- Routing suggestions
- Priority assistance

### ML Engineering Scope

- Training data strategy
- Dataset versioning
- Evaluation workflow
- Human override model for operators
- Confidence thresholds and fallbacks
- Queue-safe inference path

### Hugging Face / GitHub Scope

- Organize training data repositories
- Create model experimentation workflow
- Define evaluation benchmark set
- Separate offline training from production inference
- Keep AI as assistive, not destructive

### Product Scope

- Show AI suggestions clearly
- Allow operator override
- Display explainable reasons for classification/priority where useful
- Avoid confusing citizens with AI-heavy language

### Deliverables

- AI-assisted complaint understanding
- Smarter routing and priority suggestions
- Manageable training and evaluation workflow
- Human-in-the-loop operational safety

### Exit Criteria

- AI adds value without blocking core operations
- Operators can trust or override AI outputs
- Models have clear evaluation criteria
- System still works if AI is unavailable

---

## Phase 5: Analytics, Security, Scale, and Launch Readiness

### Objective

Prepare the platform for serious public use with analytics, performance, monitoring, security, and deployment readiness.

### Analytics Scope

- Complaint trend dashboards
- Hotspot analytics
- Department performance views
- Response-time analytics
- SLA breach analytics
- Reopen and repeat complaint analytics
- Emergency incident analytics
- Exportable reporting views

### Security Scope

- Hard validation and sanitization
- Rate limiting
- Abuse prevention
- Media safety checks
- Stronger session and credential handling
- Secure secret management
- Production role enforcement

### Performance Scope

- Query optimization
- Better indexes
- API performance tuning
- Caching where needed
- Asset optimization
- Background jobs for heavy work
- Realtime cost/performance balancing

### Release Scope

- Production environment setup
- Deployment pipeline
- Monitoring and alerting
- Backup and recovery setup
- Error tracking
- Smoke tests and regression checks
- Accessibility review
- Final UI polish for launch

### Deliverables

- Admin analytics and reporting suite
- Production-ready security baseline
- Scalable deployment posture
- Monitoring and launch checklist

### Exit Criteria

- Platform is safe, observable, and scalable
- Product metrics are visible
- Major user flows are tested
- The system is ready for public rollout or pilot deployment

---

## Phase Order Summary

### Phase 1
Product quality and UX foundation

### Phase 2
Real operational workflows and realtime behavior

### Phase 3
Maps, media, and public utility features

### Phase 4
AI-assisted classification and smart decisioning

### Phase 5
Analytics, security, performance, and launch readiness

---

## What Is Already Partially Done

- Core complaint creation
- Complaint lists and detail pages
- Admin dashboard and queue
- Assignment action
- Internal notes
- Assignment history
- Status history timeline
- Auth/login
- Media upload
- Geolocation map input
- Domain-aware complaint creation
- Initial routing and priority logic

These features should not be treated as final. They are the starting base for the phase plan above.

---

## Recommended Active Build Track

We should start by executing Phase 1 and Phase 2 in parallel-friendly order:

1. Finish product-quality UI/UX cleanup on all active pages
2. Tighten complaint lifecycle and status transitions
3. Add field officer workflow and assignment depth
4. Add real notifications and live refresh behavior
5. Harden auth and role-safe access

After that, Phase 3 becomes the next major track.

---

## Phase 1 Immediate Checklist

- Create shared status chip / priority chip / empty state primitives
- Clean remaining copy that feels like planning text
- Improve report, complaint list, complaint detail, dashboard, queue, and admin detail screens
- Improve mobile spacing and page density
- Improve navigation and app shell consistency
- Improve form affordances and error states
- Improve visual trust signals for a civic/public service product

## Phase 2 Immediate Checklist

- Enforce lifecycle transition rules
- Add citizen verification action
- Add officer assignment and officer-facing task flow
- Add resolution proof upload path
- Add live queue refresh
- Add role-safe backend restrictions
- Add notifications pipeline
