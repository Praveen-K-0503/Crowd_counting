# Page Map

## Goal

Define the first complete information architecture for the civic platform so design, backend schema, and routing can follow a clear structure.

## Main app sections

1. Public marketing and awareness
2. Citizen reporting and tracking
3. Department operations
4. Field officer workspace
5. Super admin and system configuration

## Public pages

### `/`

- Landing page
- Project overview
- Domain highlights
- Complaint lifecycle overview
- Call to action to report an issue

### `/about`

- Platform purpose
- How reporting works
- Citizen benefits
- Department benefits

### `/map`

- Public-facing issue map
- Recent issue markers
- Issue filters by domain and status

## Citizen pages

### `/auth/sign-in`

- Citizen sign in
- Department sign in
- Admin sign in entry point

### `/auth/sign-up`

- Citizen registration
- Name, phone, email
- Password or OTP flow placeholder

### `/report`

- Main issue reporting form
- Domain selection
- Photo or video upload
- Voice note upload
- Text description
- Priority hint and safety note

### `/report/location`

- GPS detection
- Manual location pin drop
- Address confirmation

### `/report/review`

- Review complaint data before submission
- Confirm domain, media, and location

### `/report/success`

- Complaint submitted confirmation
- Complaint ID
- Next steps

### `/complaints`

- My complaints list
- Filters by active, resolved, reopened

### `/complaints/[id]`

- Complaint detail
- Status timeline
- Assigned department
- Uploaded media
- Resolution proof
- Reopen button
- Feedback form

### `/emergency`

- Emergency complaint flow
- Minimal fields for speed
- Strong warning and escalation messaging

## Department and admin pages

### `/dashboard`

- Admin dashboard overview
- Total complaints
- Active emergencies
- Pending assignments
- SLA alerts

### `/dashboard/complaints`

- Master complaint queue
- Filters by domain, department, status, location, priority

### `/dashboard/complaints/[id]`

- Complaint detail panel
- Classification
- Assignment
- Status history
- Citizen notes
- Internal actions

### `/dashboard/map`

- Live operations map
- Ward or zone filtering
- Hotspots
- Emergency overlays

### `/dashboard/analytics`

- Trends
- Resolution performance
- Department KPIs
- Domain distribution

### `/dashboard/routing`

- Domain to department rules
- Ward and jurisdiction rules
- Priority score tuning

## Field officer pages

### `/field/tasks`

- Assigned complaint list
- Sorted by urgency and due time

### `/field/tasks/[id]`

- Task detail
- Navigation support
- Status update
- Work started
- Work completed
- Proof upload

## Super admin pages

### `/admin/users`

- User and role management

### `/admin/departments`

- Department setup
- Jurisdiction mapping

### `/admin/domains`

- Domain and sub-problem management

### `/admin/settings`

- SLA settings
- Notification settings
- Storage rules
- AI feature flags

## MVP page priority

Build these first:

1. `/`
2. `/report`
3. `/report/location`
4. `/report/review`
5. `/report/success`
6. `/complaints`
7. `/complaints/[id]`
8. `/dashboard`
9. `/dashboard/complaints`
10. `/dashboard/complaints/[id]`

## Deferred pages

These can come after the MVP workflow is stable:

- `/about`
- `/map`
- `/emergency`
- `/dashboard/map`
- `/dashboard/analytics`
- `/dashboard/routing`
- `/field/tasks`
- `/field/tasks/[id]`
- `/admin/*`

## Notes

- The citizen flow should be completable in under 60 seconds for common complaints.
- Emergency flow should remain shorter than standard reporting.
- Every complaint detail page must expose the full lifecycle clearly.
