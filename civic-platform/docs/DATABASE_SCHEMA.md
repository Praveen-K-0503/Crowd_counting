# Database Schema

## Goal

Define the core PostgreSQL schema for the `civicpulse` database so the application can store users, complaints, lifecycle history, routing, assignments, and notifications in a normalized way.

## Database name

- `civicpulse`

## Design principles

- Keep the first version relational and clear
- Store lifecycle history separately from the current complaint status
- Keep domains, sub-problems, departments, and routing rules configurable
- Make assignments auditable
- Support future AI, analytics, and emergency workflows without breaking the core model

## Core tables

### 1. roles

Defines user roles.

Fields:

- `id`
- `name`
- `description`
- `created_at`

### 2. departments

Defines civic and emergency departments.

Fields:

- `id`
- `name`
- `code`
- `description`
- `is_emergency`
- `is_active`
- `created_at`

### 3. wards

Defines wards or operational zones.

Fields:

- `id`
- `name`
- `code`
- `city_name`
- `state_name`
- `created_at`

### 4. users

Application users for citizens and staff.

Fields:

- `id`
- `full_name`
- `email`
- `phone`
- `password_hash`
- `role_id`
- `department_id`
- `ward_id`
- `is_active`
- `created_at`
- `updated_at`

### 5. domains

Main complaint categories.

Fields:

- `id`
- `name`
- `description`
- `is_emergency`
- `is_active`
- `created_at`

### 6. sub_problems

Sub-categories under each domain.

Fields:

- `id`
- `domain_id`
- `name`
- `description`
- `severity_hint`
- `is_active`
- `created_at`

### 7. complaints

Main complaint record.

Fields:

- `id`
- `complaint_code`
- `citizen_id`
- `domain_id`
- `sub_problem_id`
- `title`
- `description`
- `status`
- `priority_level`
- `is_emergency`
- `department_id`
- `ward_id`
- `location_id`
- `submitted_at`
- `resolved_at`
- `closed_at`
- `reopened_count`
- `created_at`
- `updated_at`

### 8. complaint_locations

Geo and address data for complaints.

Fields:

- `id`
- `complaint_id`
- `latitude`
- `longitude`
- `address_line`
- `landmark`
- `city_name`
- `state_name`
- `postal_code`
- `ward_id`
- `created_at`

### 9. complaint_media

Stores uploaded evidence and proof.

Fields:

- `id`
- `complaint_id`
- `uploaded_by`
- `media_type`
- `file_path`
- `file_url`
- `mime_type`
- `is_resolution_proof`
- `created_at`

### 10. complaint_status_history

Stores every lifecycle transition.

Fields:

- `id`
- `complaint_id`
- `old_status`
- `new_status`
- `changed_by`
- `change_reason`
- `created_at`

### 11. assignments

Stores department and staff assignment history.

Fields:

- `id`
- `complaint_id`
- `department_id`
- `assigned_to_user_id`
- `assigned_by_user_id`
- `assignment_status`
- `assigned_at`
- `accepted_at`
- `completed_at`
- `notes`

### 12. routing_rules

Defines domain and sub-problem based routing.

Fields:

- `id`
- `domain_id`
- `sub_problem_id`
- `ward_id`
- `department_id`
- `priority_override`
- `is_emergency_route`
- `is_active`
- `created_at`

### 13. priority_rules

Stores configurable scoring logic.

Fields:

- `id`
- `domain_id`
- `sub_problem_id`
- `base_priority`
- `near_sensitive_zone_boost`
- `repeat_complaint_boost`
- `reopened_boost`
- `sla_breach_boost`
- `is_active`
- `created_at`

### 14. complaint_notes

Internal and external notes.

Fields:

- `id`
- `complaint_id`
- `author_id`
- `note_type`
- `note_text`
- `is_internal`
- `created_at`

### 15. notifications

Tracks user-facing notifications.

Fields:

- `id`
- `user_id`
- `complaint_id`
- `title`
- `message`
- `notification_type`
- `is_read`
- `created_at`

### 16. feedback

Citizen closure feedback.

Fields:

- `id`
- `complaint_id`
- `citizen_id`
- `rating`
- `comment`
- `reopen_requested`
- `created_at`

### 17. audit_logs

Stores important system actions for accountability.

Fields:

- `id`
- `actor_user_id`
- `entity_type`
- `entity_id`
- `action`
- `details`
- `created_at`

## Key relationships

- `users.role_id -> roles.id`
- `users.department_id -> departments.id`
- `users.ward_id -> wards.id`
- `sub_problems.domain_id -> domains.id`
- `complaints.citizen_id -> users.id`
- `complaints.domain_id -> domains.id`
- `complaints.sub_problem_id -> sub_problems.id`
- `complaints.department_id -> departments.id`
- `complaints.ward_id -> wards.id`
- `complaint_locations.complaint_id -> complaints.id`
- `complaint_media.complaint_id -> complaints.id`
- `complaint_status_history.complaint_id -> complaints.id`
- `assignments.complaint_id -> complaints.id`
- `routing_rules.department_id -> departments.id`
- `feedback.complaint_id -> complaints.id`

## Recommended enums or controlled values

### Complaint status

- `submitted`
- `validated`
- `classified`
- `prioritized`
- `assigned`
- `accepted`
- `in_progress`
- `resolved`
- `citizen_verified`
- `closed`
- `escalated`
- `reopened`
- `duplicate`
- `rejected`
- `on_hold`

### Priority level

- `P1`
- `P2`
- `P3`
- `P4`

### Media type

- `image`
- `video`
- `audio`

### Assignment status

- `assigned`
- `accepted`
- `in_progress`
- `completed`
- `reassigned`

### Note type

- `operator_note`
- `field_note`
- `citizen_note`
- `system_note`

## MVP required tables

For version 1, these are enough to start:

- `roles`
- `departments`
- `wards`
- `users`
- `domains`
- `sub_problems`
- `complaints`
- `complaint_locations`
- `complaint_media`
- `complaint_status_history`
- `assignments`
- `routing_rules`
- `feedback`

## Notes

- Keep the `complaints.status` field for current state and use `complaint_status_history` for the full timeline.
- Keep department names configurable because different cities use different naming.
- Use UUIDs for primary keys in application-facing tables.
