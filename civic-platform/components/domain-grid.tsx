"use client";

import { motion, Variants } from "framer-motion";
import { mainDomains, emergencyDomains } from "@/data/domains";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type SectionProps = {
  title: string;
  items: typeof mainDomains;
  isEmergency?: boolean;
};

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } },
};

function Section({ title, items, isEmergency }: SectionProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
      >
        {items.map((domain) => (
          <Link href="/report" key={domain.title} passHref>
            <motion.div
              variants={itemVariants}
              className={`group flex h-full cursor-pointer flex-col justify-between rounded-3xl border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg ${
                isEmergency 
                ? "border-rose-100 bg-rose-50/50 hover:border-rose-300 hover:bg-white" 
                : "border-slate-200 bg-white hover:border-civic-primary/30"
              }`}
            >
              <div>
                <h3 className={`text-lg font-bold leading-tight ${isEmergency ? "text-rose-900" : "text-slate-800 group-hover:text-civic-primary"}`}>
                  {domain.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-500">
                  {domain.examples.slice(0, 2).join(", ")}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-end">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  isEmergency ? "bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white" : "bg-slate-100 text-slate-400 group-hover:bg-civic-primary group-hover:text-white"
                }`}>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>
    </section>
  );
}

export function DomainGrid() {
  return (
    <div className="space-y-12 pb-16 pt-8">
      <Section
        title="What would you like to report?"
        items={mainDomains}
      />
      <Section
        title="Emergency Issues"
        items={emergencyDomains}
        isEmergency={true}
      />
    </div>
  );
}
