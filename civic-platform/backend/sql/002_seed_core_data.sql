INSERT INTO roles (id, name, description)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'citizen', 'Citizen user who reports and tracks complaints'),
    ('10000000-0000-0000-0000-000000000002', 'department_operator', 'Department operator who validates and assigns complaints'),
    ('10000000-0000-0000-0000-000000000003', 'municipal_admin', 'Municipal administrator with cross-department access'),
    ('10000000-0000-0000-0000-000000000004', 'field_officer', 'Field officer who executes assigned work on the ground')
ON CONFLICT (name) DO NOTHING;

INSERT INTO departments (id, name, code, description, is_emergency)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'Roads and Public Works', 'roads-public-works', 'Handles roads, potholes, and transport infrastructure issues', FALSE),
    ('20000000-0000-0000-0000-000000000002', 'Sanitation and Solid Waste', 'sanitation-solid-waste', 'Handles waste collection, garbage overflow, and sanitation complaints', FALSE),
    ('20000000-0000-0000-0000-000000000003', 'Water and Sewerage', 'water-sewerage', 'Handles water leakage, sewage, and drainage issues', FALSE),
    ('20000000-0000-0000-0000-000000000004', 'Electrical and Street Lighting', 'electrical-street-lighting', 'Handles streetlight and public electrical complaints', FALSE),
    ('20000000-0000-0000-0000-000000000005', 'Municipal Maintenance', 'municipal-maintenance', 'Handles open manholes and civic infrastructure maintenance', FALSE),
    ('20000000-0000-0000-0000-000000000006', 'Disaster Management Authority', 'disaster-management', 'Handles flood, collapse, rescue, and emergency coordination', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO wards (id, name, code, city_name, state_name)
VALUES
    ('30000000-0000-0000-0000-000000000001', 'Ward 4', 'ward-4', 'Sample City', 'Sample State'),
    ('30000000-0000-0000-0000-000000000002', 'Ward 8', 'ward-8', 'Sample City', 'Sample State'),
    ('30000000-0000-0000-0000-000000000003', 'Ward 12', 'ward-12', 'Sample City', 'Sample State')
ON CONFLICT (code) DO NOTHING;

INSERT INTO domains (id, name, description, is_emergency)
VALUES
    ('40000000-0000-0000-0000-000000000001', 'Roads and Transportation', 'Road safety, traffic support, and mobility complaints', FALSE),
    ('40000000-0000-0000-0000-000000000002', 'Sanitation and Waste Management', 'Waste collection, cleanliness, and sanitation complaints', FALSE),
    ('40000000-0000-0000-0000-000000000003', 'Water Supply, Sewerage, and Drainage', 'Water access, sewage, and drainage complaints', FALSE),
    ('40000000-0000-0000-0000-000000000004', 'Street Lighting and Electrical Infrastructure', 'Public lighting and electrical safety complaints', FALSE),
    ('40000000-0000-0000-0000-000000000005', 'Public Infrastructure and Amenities', 'Maintenance needs for public assets and shared facilities', FALSE),
    ('40000000-0000-0000-0000-000000000006', 'Environment and Public Health', 'Public hygiene and environmental safety concerns', FALSE),
    ('40000000-0000-0000-0000-000000000007', 'Fire Emergencies', 'Emergency fire and smoke incidents', TRUE),
    ('40000000-0000-0000-0000-000000000008', 'Flood and Water Disaster', 'Critical flood and water disaster events', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (id, full_name, email, phone, password_hash, role_id, department_id, ward_id)
VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        'Sample Citizen',
        'citizen@example.com',
        '9000000001',
        'dev-placeholder-hash',
        '10000000-0000-0000-0000-000000000001',
        NULL,
        '30000000-0000-0000-0000-000000000003'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'Sample Operator',
        'operator@example.com',
        '9000000002',
        'dev-placeholder-hash',
        '10000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000005',
        '30000000-0000-0000-0000-000000000001'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Sample Field Officer',
        'officer@example.com',
        '9000000003',
        'dev-placeholder-hash',
        '10000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000005',
        '30000000-0000-0000-0000-000000000001'
    ),
    (
        '22222222-2222-2222-2222-222222222223',
        'Road Field Officer',
        'roads.officer@example.com',
        '9000000004',
        'dev-placeholder-hash',
        '10000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001'
    ),
    (
        '22222222-2222-2222-2222-222222222224',
        'Sanitation Field Officer',
        'sanitation.officer@example.com',
        '9000000005',
        'dev-placeholder-hash',
        '10000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000002'
    ),
    (
        '22222222-2222-2222-2222-222222222225',
        'Water Field Officer',
        'water.officer@example.com',
        '9000000006',
        'dev-placeholder-hash',
        '10000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000003',
        '30000000-0000-0000-0000-000000000002'
    ),
    (
        '22222222-2222-2222-2222-222222222226',
        'Electrical Field Officer',
        'electrical.officer@example.com',
        '9000000007',
        'dev-placeholder-hash',
        '10000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000004',
        '30000000-0000-0000-0000-000000000003'
    )
ON CONFLICT (email) DO NOTHING;

INSERT INTO routing_rules (domain_id, sub_problem_id, ward_id, department_id, priority_override, is_emergency_route)
VALUES
    ('40000000-0000-0000-0000-000000000001', NULL, NULL, '20000000-0000-0000-0000-000000000001', NULL, FALSE),
    ('40000000-0000-0000-0000-000000000002', NULL, NULL, '20000000-0000-0000-0000-000000000002', NULL, FALSE),
    ('40000000-0000-0000-0000-000000000003', NULL, NULL, '20000000-0000-0000-0000-000000000003', NULL, FALSE),
    ('40000000-0000-0000-0000-000000000004', NULL, NULL, '20000000-0000-0000-0000-000000000004', NULL, FALSE),
    ('40000000-0000-0000-0000-000000000005', NULL, NULL, '20000000-0000-0000-0000-000000000005', 'P1', FALSE),
    ('40000000-0000-0000-0000-000000000006', NULL, NULL, '20000000-0000-0000-0000-000000000002', NULL, FALSE),
    ('40000000-0000-0000-0000-000000000007', NULL, NULL, '20000000-0000-0000-0000-000000000006', 'P1', TRUE),
    ('40000000-0000-0000-0000-000000000008', NULL, NULL, '20000000-0000-0000-0000-000000000006', 'P1', TRUE);

INSERT INTO priority_rules (domain_id, sub_problem_id, base_priority)
VALUES
    ('40000000-0000-0000-0000-000000000001', NULL, 'P3'),
    ('40000000-0000-0000-0000-000000000002', NULL, 'P3'),
    ('40000000-0000-0000-0000-000000000003', NULL, 'P2'),
    ('40000000-0000-0000-0000-000000000004', NULL, 'P3'),
    ('40000000-0000-0000-0000-000000000005', NULL, 'P2'),
    ('40000000-0000-0000-0000-000000000006', NULL, 'P3'),
    ('40000000-0000-0000-0000-000000000007', NULL, 'P1'),
    ('40000000-0000-0000-0000-000000000008', NULL, 'P1')
ON CONFLICT DO NOTHING;
