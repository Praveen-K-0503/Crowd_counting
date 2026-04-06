"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, LogIn, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AuthMode = "login" | "register";

const quickAccounts = [
  {
    role: "Citizen",
    email: "citizen@example.com",
    description: "Report issues, track updates, and confirm resolutions.",
    color: "from-sky-500 to-blue-600",
    badge: "Citizen",
  },
  {
    role: "Admin",
    email: "admin@example.com",
    description: "Full platform control — departments, users, analytics.",
    color: "from-violet-500 to-purple-600",
    badge: "Admin",
  },
  {
    role: "Operator",
    email: "operator@example.com",
    description: "Manage queues, assign teams, and monitor service delivery.",
    color: "from-amber-500 to-orange-500",
    badge: "Operator",
  },
  {
    role: "Field Officer",
    email: "officer@example.com",
    description: "Pick up assignments, upload proof, and close on-ground work.",
    color: "from-emerald-500 to-green-600",
    badge: "Officer",
  },
];

function getRedirectPath(role: string) {
  return role === "citizen" ? "/complaints" : role === "field_officer" ? "/tasks" : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("citizen@example.com");
  const [password, setPassword] = useState("civicpulse123");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeAccount = quickAccounts.find((account) => account.email === email) ?? null;

  function resetMessages() {
    setError(null);
    setSuccess(null);
  }

  function handleModeChange(nextMode: AuthMode) {
    setMode(nextMode);
    resetMessages();

    if (nextMode === "login") {
      setPassword("civicpulse123");
    } else {
      setPassword("");
      setConfirmPassword("");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(mode === "login" ? "/api/session/login" : "/api/session/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            mode === "login"
              ? { email, password }
              : {
                  fullName,
                  email,
                  phone,
                  password,
                },
          ),
        });

        const payload = (await response.json()) as { data?: { role: string }; error?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? (mode === "login" ? "Login failed" : "Account creation failed"));
        }

        if (mode === "register") {
          setSuccess("Your account is ready. Taking you to your complaint dashboard...");
        }

        router.push(getRedirectPath(payload.data.role));
        router.refresh();
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-full border border-slate-200/50 bg-white/50 p-1 shadow-inner backdrop-blur-sm">
        <button
          type="button"
          onClick={() => handleModeChange("login")}
          className={[
            "rounded-full px-5 py-2.5 text-sm font-semibold transition",
            mode === "login" ? "bg-white text-civic-primary shadow-sm" : "text-civic-muted hover:text-civic-text",
          ].join(" ")}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("register")}
          className={[
            "rounded-full px-5 py-2.5 text-sm font-semibold transition",
            mode === "register" ? "bg-white text-civic-primary shadow-sm" : "text-civic-muted hover:text-civic-text",
          ].join(" ")}
        >
          Create account
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "login" ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <section className="rounded-[1.5rem] border border-slate-100 bg-white/50 p-4 shadow-sm backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-civic-text">Quick access</h3>
                  <p className="text-xs text-civic-muted">Select a demo role — password: civicpulse123</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {quickAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword("civicpulse123");
                    }}
                    className={[
                      "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all",
                      email === account.email
                        ? "border-civic-primary bg-white shadow-md ring-1 ring-civic-primary/30"
                        : "border-slate-100 bg-white/60 hover:border-slate-300 hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-full bg-gradient-to-r ${account.color} px-2 py-0.5 text-[10px] font-bold text-white`}>
                        {account.badge}
                      </span>
                      {email === account.email ? <CheckCircle2 className="h-3.5 w-3.5 text-civic-primary" /> : null}
                    </div>
                    <p className="text-xs text-slate-500 leading-tight">{account.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-civic-text">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary focus:bg-white"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-civic-text">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary focus:bg-white"
                  />
                </label>
              </div>

              {error ? <p className="animate-in fade-in rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p> : null}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  {isPending ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <section className="rounded-[1.5rem] border border-cyan-100 bg-cyan-50/50 p-4">
              <h3 className="text-sm font-semibold text-cyan-900">Create citizen account</h3>
              <p className="mt-1 text-xs text-cyan-700">
                You will get immediate access to report issues and track resolutions.
              </p>
            </section>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-civic-text">Full name</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary focus:bg-white"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-civic-text">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary focus:bg-white"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-civic-text">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary focus:bg-white"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-civic-text">Confirm password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat your password"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary focus:bg-white"
                  />
                </label>
              </div>

              {error ? <p className="animate-in fade-in rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p> : null}
              {success ? <p className="animate-in fade-in rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</p> : null}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-civic-primary px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {isPending ? "Creating account..." : "Create account"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
