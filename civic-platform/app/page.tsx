import { DomainGrid } from "@/components/domain-grid";
import { Hero } from "@/components/hero";
import { AppShell } from "@/components/app-shell";

export default function Home() {
  return (
    <AppShell>
      <Hero />

      <section id="domains" className="py-6">
        <DomainGrid />
      </section>
    </AppShell>
  );
}
