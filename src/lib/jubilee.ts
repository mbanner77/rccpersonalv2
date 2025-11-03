export type EmployeeLike = {
  id: string;
  firstName: string;
  lastName: string;
  startDate: Date;
  birthDate: Date;
  email: string | null;
  lockAll: boolean;
  lockFirstName: boolean;
  lockLastName: boolean;
  lockStartDate: boolean;
  lockBirthDate: boolean;
  lockEmail: boolean;
};

export type SettingLike = { jubileeYearsCsv: string } | null | undefined;

export function parseJubileeYears(setting?: SettingLike): number[] {
  const csv = setting?.jubileeYearsCsv?.trim() || "5,10,15,20,25,30,35,40";
  return csv
    .split(",")
    .map((s: string) => parseInt(s.trim(), 10))
    .filter((n: number) => Number.isFinite(n) && n > 0)
    .sort((a: number, b: number) => a - b);
}

export function yearsBetween(start: Date, end: Date): number {
  let years = end.getFullYear() - start.getFullYear();
  const m1 = start.getMonth();
  const d1 = start.getDate();
  const m2 = end.getMonth();
  const d2 = end.getDate();
  if (m2 < m1 || (m2 === m1 && d2 < d1)) years--;
  return years;
}

export function isSameMonthDay(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

export type JubileeHit = {
  employee: EmployeeLike;
  years: number;
  anniversaryDate: Date;
};

export function findJubileesOnDay(
  employees: EmployeeLike[],
  yearsList: number[],
  day: Date
): JubileeHit[] {
  const hits: JubileeHit[] = [];
  for (const e of employees) {
    for (const y of yearsList) {
      const target = addYears(e.startDate, y);
      if (isSameMonthDay(target, day) && target.getFullYear() === day.getFullYear()) {
        hits.push({ employee: e, years: y, anniversaryDate: target });
      }
    }
  }
  return hits;
}

export function findUpcomingJubilees(
  employees: EmployeeLike[],
  yearsList: number[],
  withinDays: number
): JubileeHit[] {
  const now = new Date();
  const until = new Date(now);
  until.setDate(until.getDate() + withinDays);
  const hits: JubileeHit[] = [];
  for (const e of employees) {
    for (const y of yearsList) {
      const target = addYears(e.startDate, y);
      if (target >= now && target <= until) {
        hits.push({ employee: e, years: y, anniversaryDate: target });
      }
    }
  }
  hits.sort((a, b) => a.anniversaryDate.getTime() - b.anniversaryDate.getTime());
  return hits;
}

export function isBirthday(date: Date, today = new Date()): boolean {
  return isSameMonthDay(date, today);
}
