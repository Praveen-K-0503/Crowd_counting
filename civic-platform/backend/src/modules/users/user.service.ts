import { getUserContext, listFieldOfficers } from "./user.repository.js";

export async function getUserContextService(userId: string) {
  if (!userId) {
    throw new Error("userId is required");
  }

  return getUserContext(userId);
}

export async function listFieldOfficersService(departmentId?: string) {
  return listFieldOfficers(departmentId);
}

