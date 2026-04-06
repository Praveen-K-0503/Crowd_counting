CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    code VARCHAR(40) NOT NULL UNIQUE,
    description TEXT,
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    code VARCHAR(40) NOT NULL UNIQUE,
    city_name VARCHAR(120) NOT NULL,
    state_name VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(160) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash TEXT,
    role_id UUID NOT NULL REFERENCES roles(id),
    department_id UUID REFERENCES departments(id),
    ward_id UUID REFERENCES wards(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sub_problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    severity_hint VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sub_problem_per_domain UNIQUE (domain_id, name)
);

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_code VARCHAR(40) NOT NULL UNIQUE,
    citizen_id UUID NOT NULL REFERENCES users(id),
    domain_id UUID REFERENCES domains(id),
    sub_problem_id UUID REFERENCES sub_problems(id),
    title VARCHAR(220) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL,
    priority_level VARCHAR(2) NOT NULL,
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    department_id UUID REFERENCES departments(id),
    ward_id UUID REFERENCES wards(id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    reopened_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT complaints_status_check CHECK (
        status IN (
            'submitted',
            'validated',
            'classified',
            'prioritized',
            'assigned',
            'accepted',
            'in_progress',
            'resolved',
            'citizen_verified',
            'closed',
            'escalated',
            'reopened',
            'duplicate',
            'rejected',
            'on_hold'
        )
    ),
    CONSTRAINT complaints_priority_check CHECK (priority_level IN ('P1', 'P2', 'P3', 'P4'))
);

CREATE TABLE complaint_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL UNIQUE REFERENCES complaints(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    address_line TEXT,
    landmark VARCHAR(220),
    city_name VARCHAR(120),
    state_name VARCHAR(120),
    postal_code VARCHAR(20),
    ward_id UUID REFERENCES wards(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE complaint_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    media_type VARCHAR(20) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT,
    mime_type VARCHAR(120),
    is_resolution_proof BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT complaint_media_type_check CHECK (media_type IN ('image', 'video', 'audio'))
);

CREATE TABLE complaint_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    old_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    changed_by UUID REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id),
    assigned_to_user_id UUID REFERENCES users(id),
    assigned_by_user_id UUID REFERENCES users(id),
    assignment_status VARCHAR(20) NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    CONSTRAINT assignments_status_check CHECK (
        assignment_status IN ('assigned', 'accepted', 'in_progress', 'completed', 'reassigned')
    )
);

CREATE TABLE routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES domains(id),
    sub_problem_id UUID REFERENCES sub_problems(id),
    ward_id UUID REFERENCES wards(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    priority_override VARCHAR(2),
    is_emergency_route BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT routing_rules_priority_check CHECK (priority_override IS NULL OR priority_override IN ('P1', 'P2', 'P3', 'P4'))
);

CREATE TABLE priority_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES domains(id),
    sub_problem_id UUID REFERENCES sub_problems(id),
    base_priority VARCHAR(2) NOT NULL,
    near_sensitive_zone_boost INTEGER NOT NULL DEFAULT 0,
    repeat_complaint_boost INTEGER NOT NULL DEFAULT 0,
    reopened_boost INTEGER NOT NULL DEFAULT 0,
    sla_breach_boost INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT priority_rules_base_check CHECK (base_priority IN ('P1', 'P2', 'P3', 'P4'))
);

CREATE TABLE complaint_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    note_type VARCHAR(20) NOT NULL,
    note_text TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT complaint_notes_type_check CHECK (
        note_type IN ('operator_note', 'field_note', 'citizen_note', 'system_note')
    )
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    title VARCHAR(220) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    reopen_requested BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    action VARCHAR(120) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_ward_id ON users(ward_id);
CREATE INDEX idx_sub_problems_domain_id ON sub_problems(domain_id);
CREATE INDEX idx_complaints_citizen_id ON complaints(citizen_id);
CREATE INDEX idx_complaints_domain_id ON complaints(domain_id);
CREATE INDEX idx_complaints_department_id ON complaints(department_id);
CREATE INDEX idx_complaints_ward_id ON complaints(ward_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_priority_level ON complaints(priority_level);
CREATE INDEX idx_complaints_submitted_at ON complaints(submitted_at);
CREATE INDEX idx_complaint_media_complaint_id ON complaint_media(complaint_id);
CREATE INDEX idx_complaint_status_history_complaint_id ON complaint_status_history(complaint_id);
CREATE INDEX idx_assignments_complaint_id ON assignments(complaint_id);
CREATE INDEX idx_assignments_department_id ON assignments(department_id);
CREATE INDEX idx_routing_rules_department_id ON routing_rules(department_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_feedback_complaint_id ON feedback(complaint_id);
CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
