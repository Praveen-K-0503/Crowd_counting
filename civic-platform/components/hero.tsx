"use client";

import { motion } from "framer-motion";
import { ArrowRight, Map } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0F172A] via-civic-primary to-[#1E3A8A] px-6 py-20 text-center text-white shadow-civic sm:px-12 sm:py-28 lg:py-36">
      <div className="absolute inset-x-0 bottom-0 top-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-civic-secondary/20 blur-[100px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto max-w-4xl space-y-8"
      >
        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-semibold tracking-wide text-white/90 backdrop-blur-md">
          See a problem in your street? Let's fix it.
        </div>
        <div className="space-y-6">
          <h1 className="mx-auto max-w-3xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-[4.5rem] lg:leading-[1.1]">
            Report civic issues instantly.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-300 sm:text-xl">
            Potholes, broken streetlights, or waste overflow. Drop a pin on the map, snap a photo, and the right authorities will be notified immediately.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
          <Link
            className="group flex items-center justify-center gap-2 rounded-full bg-white px-8 py-5 text-lg font-bold text-civic-primary shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl"
            href="/report"
          >
            Report an Issue
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            className="flex items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-8 py-5 text-lg font-bold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
            href="/map"
          >
            <Map className="h-5 w-5" />
            View Public Map
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
