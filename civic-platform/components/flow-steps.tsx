type FlowStepsProps = {
  currentStep: number;
  steps: string[];
};

export function FlowSteps({ currentStep, steps }: FlowStepsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isComplete = stepNumber < currentStep;

        return (
          <div
            key={step}
            className={[
              "rounded-2xl border p-4 transition",
              isActive
                ? "border-civic-primary bg-blue-50 shadow-sm"
                : isComplete
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-white",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                  isActive
                    ? "bg-civic-primary text-white"
                    : isComplete
                      ? "bg-civic-success text-white"
                      : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                {stepNumber}
              </div>
              <p
                className={[
                  "text-sm font-semibold",
                  isActive ? "text-civic-primary" : "text-civic-text",
                ].join(" ")}
              >
                {step}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
