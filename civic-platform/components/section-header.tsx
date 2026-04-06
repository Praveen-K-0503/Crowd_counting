import type { LucideIcon } from "lucide-react";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
};

export function SectionHeader({ eyebrow, title, icon: Icon, iconClassName }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={[
          "flex h-11 w-11 items-center justify-center rounded-2xl",
          iconClassName ?? "bg-civic-secondary/15 text-civic-secondary",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">{eyebrow}</p>
        <h2 className="text-xl font-semibold text-civic-text">{title}</h2>
      </div>
    </div>
  );
}
