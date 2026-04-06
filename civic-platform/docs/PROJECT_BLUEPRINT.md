# Project Blueprint

## Product statement

Build a mobile-first civic issue reporting platform that lets citizens report daily civic problems and emergency incidents through media, location, and short descriptions. The platform should route complaints to the correct public department, maintain a clear lifecycle, and provide real-time updates and analytics.

## User roles

### Citizens

- Submit complaints
- Track complaint history
- View status timeline
- Reopen unresolved complaints
- Provide closure feedback

### Field officers

- View assigned complaints
- Update progress from field
- Upload proof of work
- Mark work as completed

### Department operators

- Validate and classify complaints
- Assign tasks
- Re-route complaints
- Escalate unresolved items

### Department heads

- Monitor team workload
- Track SLA performance
- Approve escalations

### Municipal admins

- Manage all departments
- Configure routing rules and priorities
- Monitor citywide trends

### Emergency responders

- Handle fire, flood, collapse, and hazard incidents

### Super admin

- Manage domains, wards, departments, and system settings

## Main modules

### 1. Citizen reporting

- Complaint submission form
- Media upload
- Voice note upload
- Location capture and map confirmation
- Complaint history and tracking

### 2. Complaint intelligence

- Speech-to-text
- Text parsing
- Issue classification
- Duplicate detection
- Severity estimation

### 3. Routing and priority

- Domain-to-department mapping
- Ward and zone mapping
- Priority scoring
- Emergency escalation

### 4. Operations dashboard

- Live complaint queue
- Map view
- Filters and search
- Assignment panel
- Status timeline

### 5. Notifications

- Submission confirmation
- Assignment updates
- Status updates
- Closure request
- Reopen notifications

### 6. Analytics

- Hotspots
- Resolution times
- Department performance
- SLA breaches
- Repeated complaint patterns

## Delivery phases

### Phase 1: Foundation

- App structure
- UI kit
- Domain model
- Lifecycle model
- Supabase setup

### Phase 2: MVP

- Citizen complaint flow
- Admin complaint management
- Status history
- Assignment and routing

### Phase 3: Smart workflows

- Priority engine
- Notifications
- Field officer experience
- Reopen and feedback

### Phase 4: AI assistance

- Speech-to-text
- Text classification
- Image classification
- Duplicate and hotspot intelligence

### Phase 5: Scale and polish

- Performance tuning
- Accessibility
- Security hardening
- Better analytics and reporting
