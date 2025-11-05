export type SessionRole = "ADMIN" | "UNIT_LEAD";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: SessionRole;
  unitId: string | null;
  unitName: string | null;
};
