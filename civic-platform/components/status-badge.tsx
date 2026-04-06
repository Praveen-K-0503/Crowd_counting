type StatusBadgeProps = {
  status: string;
};

function statusClasses(status: string) {
  switch (status) {
    case "Resolved":
    case "Citizen Verified":
    case "Closed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "Reopened":
    case "Escalated":
      return "bg-red-50 text-red-700 ring-1 ring-red-200";
    case "In Progress":
    case "Prioritized":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
    case "Assigned":
    case "Accepted":
    case "Validated":
      return "bg-blue-50 text-civic-primary ring-1 ring-blue-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={["inline-flex rounded-full px-3 py-1 text-xs font-semibold", statusClasses(status)].join(" ")}>
      {status}
    </span>
  );
}
