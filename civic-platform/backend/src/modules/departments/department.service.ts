import { listDepartments } from "./department.repository.js";

export async function listDepartmentsService() {
  return listDepartments();
}
