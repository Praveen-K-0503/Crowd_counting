import process from "node:process";

const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api";

type SmokeResult = {
  name: string;
  ok: boolean;
  status?: number;
  details?: string;
};

async function checkJson(path: string, name: string) {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    return {
      name,
      ok: false,
      status: response.status,
      details: await response.text(),
    } satisfies SmokeResult;
  }

  await response.json();

  return {
    name,
    ok: true,
    status: response.status,
  } satisfies SmokeResult;
}

async function checkText(path: string, name: string) {
  const response = await fetch(`${baseUrl}${path}`);

  return {
    name,
    ok: response.ok,
    status: response.status,
    details: response.ok ? "ok" : await response.text(),
  } satisfies SmokeResult;
}

async function main() {
  const checks = await Promise.all([
    checkJson("/health", "Health"),
    checkJson("/departments", "Departments"),
    checkJson("/domains", "Domains"),
    checkJson("/complaints/summary/dashboard", "Dashboard summary"),
    checkJson("/complaints/summary/analytics", "Analytics summary"),
    checkText("/complaints/summary/export.csv", "Analytics export"),
  ]);

  const failed = checks.filter((check) => !check.ok);

  for (const check of checks) {
    console.log(
      `${check.ok ? "PASS" : "FAIL"} ${check.name}${check.status ? ` (${check.status})` : ""}${
        check.details && !check.ok ? ` - ${check.details}` : ""
      }`,
    );
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Smoke test failed:", error);
  process.exitCode = 1;
});
