# Roles And Permissions

## Goal

Define a clear access model for the civic platform so authentication, authorization, dashboards, and data security can be implemented cleanly.

## Core roles

1. Citizen
2. Field Officer
3. Department Operator
4. Department Head
5. Municipal Admin
6. Emergency Responder
7. Super Admin

## Role descriptions

### Citizen

The public user who reports issues and tracks their complaint lifecycle.

### Field Officer

The on-ground worker responsible for visiting locations, updating task progress, and uploading proof of work.

### Department Operator

The staff member who reviews incoming complaints, validates them, assigns tasks, and updates the complaint workflow.

### Department Head

The departmental authority who monitors team workload, handles escalations, and manages department-level performance.

### Municipal Admin

The cross-department city administrator with visibility into all complaint queues, SLA trends, and system performance.

### Emergency Responder

The specialized user responsible for urgent incidents such as fire, flood, collapse, or hazardous electrical situations.

### Super Admin

The system-level administrator who manages platform configuration, roles, departments, and domain settings.

## Access principles

- Citizens should only see their own complaint history and public-safe map data.
- Staff should only access complaints relevant to their department or jurisdiction unless elevated by role.
- Emergency complaints should be visible to emergency responders and relevant admins immediately.
- Every state change must be auditable.
- Sensitive internal notes should never be visible to citizens.

## Permission matrix

### Citizen permissions

- Create complaint
- Upload media
- Add voice note
- View own complaints
- View own complaint timeline
- Reopen own resolved complaint
- Submit feedback on closure
- Update profile

Citizen restrictions:

- Cannot assign complaints
- Cannot edit department actions
- Cannot view internal notes
- Cannot view other citizens' private complaint details

### Field Officer permissions

- View assigned tasks
- View complaint location and media
- Update field progress
- Mark task as started
- Upload completion proof
- Mark work completed
- Request escalation

Field Officer restrictions:

- Cannot change routing rules
- Cannot access complaints outside assignment scope unless granted
- Cannot close complaint permanently without department workflow

### Department Operator permissions

- View department complaint queue
- Validate complaint
- Classify complaint
- Assign field officer
- Change complaint status
- Add internal notes
- Request escalation
- Merge duplicates

Department Operator restrictions:

- Cannot change citywide settings
- Cannot manage user roles globally

### Department Head permissions

- View all department complaints
- Reassign work
- Approve escalations
- Override priority within department
- Monitor SLA and workload
- Review team performance

Department Head restrictions:

- Cannot modify platform-wide system configuration

### Municipal Admin permissions

- View all city complaint data
- View all dashboards and analytics
- Override routing when needed
- Monitor emergency queues
- Audit complaint lifecycle changes
- Access cross-department reporting

Municipal Admin restrictions:

- Should not directly edit system schema or low-level platform settings

### Emergency Responder permissions

- View emergency queue
- Accept emergency assignments
- Update emergency response status
- Upload evidence
- Escalate multi-agency incidents

Emergency Responder restrictions:

- Limited to emergency incidents or authorized cross-access

### Super Admin permissions

- Manage roles and permissions
- Manage departments and zones
- Manage domains and sub-problems
- Manage routing rules
- Configure SLA and escalation settings
- Configure notification settings
- Access platform-wide audit logs

## Suggested data access model

## Citizens

- Read only their own complaints
- Read public complaint map data with privacy-safe fields
- Write only to their own complaint submissions, feedback, and reopen requests

## Staff roles

- Read complaints within allowed department and ward scope
- Write to assignment, status, and internal notes within their authority

## Admin roles

- Broader read access across departments
- Controlled write access to routing and operations

## Super admin

- Full system configuration access

## Supabase implementation direction

Use:

- `auth.users` for authentication identity
- a `profiles` table for role and user metadata
- Row Level Security on all core tables
- department and ward scope fields in staff profiles
- server-side checks for sensitive actions

## Recommended profile fields

- `id`
- `full_name`
- `phone`
- `email`
- `role`
- `department_id`
- `ward_id`
- `is_active`

## Role-based workflow examples

### Example 1: Citizen complaint

Citizen creates complaint -> complaint enters `Submitted` -> department operator validates and assigns -> field officer updates progress -> department marks `Resolved` -> citizen verifies -> complaint closes

### Example 2: Emergency complaint

Citizen reports live wire -> emergency responder and electrical unit receive incident -> priority becomes `P1 Critical` -> operator assigns fast response -> resolution proof uploaded -> admin audit trail updated

## MVP role scope

For the first build, implement these roles first:

1. Citizen
2. Department Operator
3. Municipal Admin

Add later:

4. Field Officer
5. Department Head
6. Emergency Responder
7. Super Admin advanced controls

## Notes

- Keep the initial role model simple.
- Avoid over-complicating permissions before the main workflow works.
- Design the schema to support future fine-grained access, but launch with a clean minimum set.
