import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === "citizen" ? "/complaints" : user.role === "field_officer" ? "/tasks" : "/dashboard");
  }

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[75vh] w-full max-w-[420px] flex-col justify-center py-10 px-4 sm:px-0">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-civic-primary to-[#0b5d87] text-white shadow-xl shadow-civic-primary/20">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Sign in or create an account to participate
          </p>
        </div>

        <div className="relative w-full">
          {/* Subtle background glow */}
          <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-br from-civic-primary/15 via-transparent to-civic-secondary/10 blur-xl"></div>
          
          <div className="relative rounded-[2.5rem] border border-white/60 bg-white/70 p-6 shadow-2xl shadow-sky-900/5 backdrop-blur-2xl sm:p-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
