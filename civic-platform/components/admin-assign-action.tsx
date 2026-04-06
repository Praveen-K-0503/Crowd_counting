"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { assignComplaint, getDepartments, getFieldOfficers, type DepartmentOption, type UserOption } from "@/lib/api";

export function AdminAssignAction({
  complaintId,
  suggestedDepartment,
  operatorId,
}: {
  complaintId: string;
  suggestedDepartment?: string;
  operatorId: string;
}) {
  const router = useRouter();
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [officers, setOfficers] = useState<UserOption[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resolvedSuggestion = useMemo(() => suggestedDepartment ?? "Department suggestion pending", [suggestedDepartment]);

  useEffect(() => {
    async function loadDepartments() {
      try {
        const result = await getDepartments();
        setDepartments(result);

        if (result.length > 0) {
          const suggestedMatch = result.find((department) => department.name === suggestedDepartment);
          setSelectedDepartment(suggestedMatch?.id ?? result[0].id);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load departments");
      }
    }

    void loadDepartments();
  }, [suggestedDepartment]);

  useEffect(() => {
    async function loadOfficers() {
      if (!selectedDepartment) {
        setOfficers([]);
        setSelectedOfficer("");
        return;
      }

      try {
        const result = await getFieldOfficers(selectedDepartment);
        setOfficers(result);
        setSelectedOfficer((current) => (result.some((officer) => officer.id === current) ? current : ""));
      } catch (loadError) {
        setOfficers([]);
        setSelectedOfficer("");
        setError(loadError instanceof Error ? loadError.message : "Failed to load field officers");
      }
    }

    void loadOfficers();
  }, [selectedDepartment]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await assignComplaint({
          complaintId,
          departmentId: selectedDepartment,
          assignedToUserId: selectedOfficer || undefined,
          assignedByUserId: operatorId,
          notes: notes.trim() || undefined,
        });

        setSuccess(selectedOfficer ? "Complaint assigned to the department and field officer." : "Complaint assigned successfully.");
        router.refresh();
      } catch (assignError) {
        setError(assignError instanceof Error ? assignError.message : "Failed to assign complaint");
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-civic-text">
        Suggested department: <span className="font-semibold">{resolvedSuggestion}</span>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-civic-text">Assign department</span>
        <select
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary"
          value={selectedDepartment}
          onChange={(event) => setSelectedDepartment(event.target.value)}
        >
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-civic-text">Field officer</span>
        <select
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary"
          value={selectedOfficer}
          onChange={(event) => setSelectedOfficer(event.target.value)}
          disabled={!selectedDepartment}
        >
          <option value="">Keep with department queue</option>
          {officers.map((officer) => (
            <option key={officer.id} value={officer.id}>
              {officer.fullName}
              {officer.departmentName ? ` · ${officer.departmentName}` : ""}
            </option>
          ))}
        </select>
        <p className="text-xs leading-5 text-civic-muted">
          Choose a field officer for immediate dispatch, or leave this in the department queue.
        </p>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-civic-text">Assignment note</span>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add an internal assignment or routing note."
        />
      </label>

      <button
        type="submit"
        disabled={isPending || !selectedDepartment}
        className="inline-flex items-center gap-2 rounded-full bg-civic-primary px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Assigning..." : "Assign complaint"}
      </button>

      {success ? <p className="text-sm font-medium text-civic-success">{success}</p> : null}
      {error ? <p className="text-sm font-medium text-civic-danger">{error}</p> : null}
    </form>
  );
}
