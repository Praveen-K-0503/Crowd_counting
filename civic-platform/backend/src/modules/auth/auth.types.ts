export type AuthUser = {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  departmentId: string | null;
  wardId: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
};
