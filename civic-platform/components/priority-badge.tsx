type PriorityBadgeProps = {
  priority: string;
};

function priorityClasses(priority: string) {
  switch (priority) {
    case "P1 Critical":
      return "bg-red-600 text-white ring-1 ring-red-500/20";
    case "P2 High":
      return "bg-amber-500 text-white ring-1 ring-amber-400/20";
    case "P3 Medium":
      return "bg-slate-900 text-white ring-1 ring-slate-800/20";
    default:
      return "bg-slate-200 text-slate-700 ring-1 ring-slate-300";
  }
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className={["inline-flex rounded-full px-3 py-1 text-xs font-semibold", priorityClasses(priority)].join(" ")}>
      {priority}
    </span>
  );
}
