export const STATUS_TRANSITIONS: Record<string, string[]> = {
  submitted: ["validated", "escalated", "rejected"],
  validated: ["classified", "prioritized", "assigned", "escalated"],
  classified: ["prioritized", "assigned"],
  prioritized: ["assigned", "escalated", "on_hold"],
  assigned: ["accepted", "in_progress", "escalated", "on_hold"],
  accepted: ["in_progress", "escalated", "on_hold"],
  in_progress: ["resolved", "escalated", "on_hold"],
  resolved: ["citizen_verified", "closed", "reopened"],
  citizen_verified: ["closed"],
  reopened: ["assigned", "in_progress", "escalated"],
  escalated: ["assigned", "in_progress", "resolved"],
  on_hold: ["assigned", "in_progress", "escalated"],
  rejected: ["reopened"],
  duplicate: ["reopened"],
  closed: ["reopened"],
};

export const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  validated: "Validated",
  classified: "Classified",
  prioritized: "Prioritized",
  assigned: "Assigned",
  accepted: "Accepted",
  in_progress: "In Progress",
  resolved: "Resolved",
  citizen_verified: "Citizen Verified",
  closed: "Closed",
  escalated: "Escalated",
  reopened: "Reopened",
  duplicate: "Duplicate",
  rejected: "Rejected",
  on_hold: "On Hold",
};

export function formatStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function toRawStatus(status: string) {
  return status.toLowerCase().replace(/\s+/g, "_");
}

export function getNextStatusOptions(currentStatus: string) {
  const rawStatus = toRawStatus(currentStatus);
  const nextStatuses = STATUS_TRANSITIONS[rawStatus] ?? ["assigned", "in_progress", "resolved"];

  return nextStatuses.map((status) => ({
    value: status,
    label: formatStatusLabel(status),
  }));
}
