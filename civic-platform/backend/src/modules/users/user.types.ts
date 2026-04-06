export type UserContext = {
  id: string;
  fullName: string;
  email: string | null;
  role: "citizen" | "department_operator" | "municipal_admin" | "field_officer";
  departmentId: string | null;
  departmentName: string | null;
  wardId: string | null;
};

