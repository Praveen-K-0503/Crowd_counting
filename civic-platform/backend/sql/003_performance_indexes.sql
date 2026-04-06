CREATE INDEX IF NOT EXISTS idx_complaints_status_submitted_at
  ON complaints (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_complaints_department_status
  ON complaints (department_id, status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_complaints_domain_submitted_at
  ON complaints (domain_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_complaints_priority_status
  ON complaints (priority_level, status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_assigned_to_status
  ON assignments (assigned_to_user_id, assignment_status, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_complaint_assigned_at
  ON assignments (complaint_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_history_complaint_created
  ON complaint_status_history (complaint_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_complaint_created
  ON feedback (complaint_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_complaint_created
  ON complaint_notes (complaint_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_locations_lat_lng
  ON complaint_locations (latitude, longitude);
