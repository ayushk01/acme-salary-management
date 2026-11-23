import type { AppDatabase } from '../db/connection.js';
import { countries, departments, employees, jobTitles, salaryChanges } from '../db/schema.js';
import { formatEmployeeCode } from '../domain/employeeCode.js';
import { type Random, createRandom } from './random.js';

export const DEFAULT_EMPLOYEE_COUNT = 10_000;

/** Fixed, so every run of the seed produces byte-identical data. */
const RANDOM_SEED = 20_261_123;

/** Fixed, so generated dates and timestamps do not move with the clock. */
const SEEDED_AT = '2026-11-01T00:00:00.000Z';
const SEEDED_ON = '2026-11-01';
const SEEDED_BY = 'Seed script';

/**
 * The discrepancies screen is useless if nothing is out of range, and a
 * random spread rarely produces a clear case inside a group big enough to
 * judge. So one group is built explicitly: enough active people for the
 * minimum group size, with two deliberate outliers.
 */
export const DEMO_OUTLIER_GROUP = { countryCode: 'IN', jobTitle: 'SDE2' } as const;
const DEMO_GROUP_SIZE = 9;

/** Typical annual pay, in each country's major units, for an SDE2. */
const COUNTRY_BASE_PAY: Record<string, number> = {
  IN: 1_800_000,
  US: 140_000,
  GB: 75_000,
  DE: 80_000,
  JP: 8_000_000,
  SG: 110_000,
  AU: 130_000,
  BR: 180_000,
};

/** Pay for each title relative to an SDE2 in the same country. */
const TITLE_MULTIPLIER: Record<string, number> = {
  SDE1: 0.7,
  SDE2: 1,
  SDE3: 1.4,
  'Engineering Manager': 1.7,
  'Product Manager': 1.3,
  Designer: 1,
  'Data Analyst': 0.9,
  'QA Engineer': 0.85,
  'DevOps Engineer': 1.1,
  'Technical Writer': 0.75,
  Recruiter: 0.8,
  'Finance Analyst': 0.95,
};

// 60 x 60 gives 3,600 combinations across 10,000 people, so no one name
// fills a page. At 24 x 22 the default name-sorted first page was twenty
// people all called the same thing, which reads as a bug rather than as the
// duplicate names a real 10,000-person company genuinely has.
// prettier-ignore
const FIRST_NAMES = [
  'Asha', 'Ravi', 'Meera', 'Arjun', 'Priya', 'Vikram', 'Neha', 'Rahul',
  'Ananya', 'Karthik', 'Divya', 'Siddharth', 'Emma', 'Liam', 'Olivia',
  'Noah', 'Sofia', 'Lucas', 'Hannah', 'Felix', 'Clara', 'Jonas', 'Lena',
  'Max', 'Yuki', 'Haruto', 'Mei', 'Kenji', 'Sakura', 'Ren', 'Aoi',
  'Daichi', 'Chloe', 'Ethan', 'Isabel', 'Mateo', 'Camila', 'Diego',
  'Lucia', 'Tomas', 'Grace', 'Oliver', 'Amara', 'Kwame', 'Zara', 'Omar',
  'Layla', 'Yusuf', 'Wei', 'Jing', 'Hao', 'Lin', 'Nadia', 'Ivan', 'Petra',
  'Marek', 'Sven', 'Astrid', 'Elena', 'Marco',
];

// prettier-ignore
const LAST_NAMES = [
  'Rao', 'Sharma', 'Patel', 'Nair', 'Iyer', 'Gupta', 'Desai', 'Menon',
  'Reddy', 'Chopra', 'Banerjee', 'Kulkarni', 'Smith', 'Jones', 'Brown',
  'Taylor', 'Wilson', 'Davies', 'Mueller', 'Schmidt', 'Fischer', 'Weber',
  'Becker', 'Hoffmann', 'Tanaka', 'Suzuki', 'Sato', 'Watanabe',
  'Yamamoto', 'Nakamura', 'Silva', 'Santos', 'Oliveira', 'Souza', 'Costa',
  'Pereira', 'Chen', 'Lim', 'Tan', 'Ng', 'Wong', 'Koh', 'Novak', 'Rossi',
  'Dubois', 'Khan', 'Ahmed', 'Ali', 'Okafor', 'Mensah', 'Nguyen', 'Tran',
  'Kowalski', 'Nowak', 'Andersson', 'Nilsson', 'Petrov', 'Ivanov',
  'Garcia', 'Martinez',
];

export interface SeedOptions {
  employeeCount?: number;
}

export interface SeedSummary {
  employeesCreated: number;
  salaryChangesCreated: number;
}

interface Reference {
  countries: { code: string; minorUnit: number }[];
  jobTitles: { id: number; name: string }[];
  departmentIds: number[];
}

type EmployeeRow = typeof employees.$inferInsert;
type SalaryChangeRow = typeof salaryChanges.$inferInsert;

/** Major units to minor units, staying in integers. */
const toMinor = (major: number, minorUnit: number): number => Math.round(major) * 10 ** minorUnit;

const payFor = (baseMajor: number, multiplier: number, variation: number): number =>
  Math.round(baseMajor * multiplier * variation);

const dateFrom = (random: Random): string => {
  const year = random.intBetween(2015, 2026);
  const month = String(random.intBetween(1, 12)).padStart(2, '0');
  const day = String(random.intBetween(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Fills an empty database with employees.
 *
 * Runs only when there are none, so it is safe at every boot: with no
 * persistent disk that means every cold start, and if a disk is attached
 * later it will quietly stop re-running instead of wiping real edits.
 *
 * Everything happens in one transaction. Ten thousand individual inserts
 * would each be their own transaction and take orders of magnitude longer.
 */
export function seedDatabase(db: AppDatabase, options: SeedOptions = {}): SeedSummary {
  const employeeCount = options.employeeCount ?? DEFAULT_EMPLOYEE_COUNT;

  const existing = db.select({ id: employees.id }).from(employees).limit(1).all();
  if (existing.length > 0) {
    return { employeesCreated: 0, salaryChangesCreated: 0 };
  }

  const reference: Reference = {
    countries: db
      .select({ code: countries.code, minorUnit: countries.currencyMinorUnit })
      .from(countries)
      .all(),
    jobTitles: db.select({ id: jobTitles.id, name: jobTitles.name }).from(jobTitles).all(),
    departmentIds: db
      .select({ id: departments.id })
      .from(departments)
      .all()
      .map((row) => row.id),
  };

  const random = createRandom(RANDOM_SEED);
  const rows = buildEmployees(employeeCount, reference, random);
  const changes = buildSalaryHistory(rows, random);

  db.transaction((tx) => {
    insertInChunks(rows, (chunk) => tx.insert(employees).values(chunk).run());
    if (changes.length > 0) {
      insertInChunks(changes, (chunk) => tx.insert(salaryChanges).values(chunk).run());
    }
  });

  return { employeesCreated: rows.length, salaryChangesCreated: changes.length };
}

function buildEmployees(count: number, reference: Reference, random: Random): EmployeeRow[] {
  const rows: EmployeeRow[] = [];

  const demoCountry = reference.countries.find((c) => c.code === DEMO_OUTLIER_GROUP.countryCode);
  const demoTitle = reference.jobTitles.find((t) => t.name === DEMO_OUTLIER_GROUP.jobTitle);

  // The demo group comes first, so it exists even at small counts.
  if (demoCountry && demoTitle) {
    const base = COUNTRY_BASE_PAY[demoCountry.code] ?? 100_000;
    const demoSize = Math.min(DEMO_GROUP_SIZE, count);

    for (let index = 0; index < demoSize; index += 1) {
      // Two deliberate outliers, the rest tightly clustered so the median
      // sits with the cluster and the two stand out against it.
      const variation = index === 0 ? 1.7 : index === 1 ? 0.55 : 0.98 + index * 0.01;

      rows.push(
        makeEmployee({
          number: rows.length + 1,
          countryCode: demoCountry.code,
          minorUnit: demoCountry.minorUnit,
          jobTitleId: demoTitle.id,
          departmentId: reference.departmentIds[0] ?? 1,
          payMajor: payFor(base, 1, variation),
          random,
          neverLeft: true,
        }),
      );
    }
  }

  while (rows.length < count) {
    const country = random.pick(reference.countries);
    const title = random.pick(reference.jobTitles);
    const base = COUNTRY_BASE_PAY[country.code] ?? 100_000;
    const multiplier = TITLE_MULTIPLIER[title.name] ?? 1;

    rows.push(
      makeEmployee({
        number: rows.length + 1,
        countryCode: country.code,
        minorUnit: country.minorUnit,
        jobTitleId: title.id,
        departmentId: random.pick(reference.departmentIds),
        // ±10%, so an ordinary employee is never mistaken for an outlier.
        payMajor: payFor(base, multiplier, 0.9 + random.next() * 0.2),
        random,
        neverLeft: false,
      }),
    );
  }

  return rows;
}

interface MakeEmployee {
  number: number;
  countryCode: string;
  minorUnit: number;
  jobTitleId: number;
  departmentId: number;
  payMajor: number;
  random: Random;
  neverLeft: boolean;
}

function makeEmployee(input: MakeEmployee): EmployeeRow {
  const { random } = input;
  const code = formatEmployeeCode(input.number);
  const firstName = random.pick(FIRST_NAMES);
  const lastName = random.pick(LAST_NAMES);
  const hireDate = dateFrom(random);

  // Roughly one in twelve has left. Their leaving date is after their hire
  // date, so the record stays coherent.
  const hasLeft = !input.neverLeft && random.chance(0.08);
  const leftDate = hasLeft ? laterThan(hireDate, random) : null;

  return {
    employeeCode: code,
    fullName: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${code.toLowerCase()}@acme.example`,
    jobTitleId: input.jobTitleId,
    departmentId: input.departmentId,
    countryCode: input.countryCode,
    salaryMinor: toMinor(input.payMajor, input.minorUnit),
    hireDate,
    status: hasLeft ? 'left' : 'active',
    leftDate,
    createdAt: SEEDED_AT,
    createdBy: SEEDED_BY,
    updatedAt: SEEDED_AT,
    updatedBy: SEEDED_BY,
  };
}

function laterThan(date: string, random: Random): string {
  const year = Math.min(2026, Number(date.slice(0, 4)) + random.intBetween(1, 4));
  const month = String(random.intBetween(1, 12)).padStart(2, '0');
  const day = String(random.intBetween(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gives about a third of employees one to three raises.
 *
 * Built backwards from the current salary, so the newest change always
 * lands on what the employee is actually paid today. Generating forwards
 * would leave the history disagreeing with the employee record.
 */
function buildSalaryHistory(rows: EmployeeRow[], random: Random): SalaryChangeRow[] {
  const changes: SalaryChangeRow[] = [];

  rows.forEach((row, index) => {
    if (!random.chance(0.35)) {
      return;
    }

    const steps = random.intBetween(1, 3);
    const salaries: number[] = [row.salaryMinor];
    for (let step = 0; step < steps; step += 1) {
      const previous = salaries[0] ?? row.salaryMinor;
      salaries.unshift(Math.round(previous / 1.08));
    }

    for (let step = 0; step < steps; step += 1) {
      const oldSalary = salaries[step];
      const newSalary = salaries[step + 1];
      if (oldSalary === undefined || newSalary === undefined) {
        continue;
      }

      changes.push({
        employeeId: index + 1,
        oldSalaryMinor: oldSalary,
        newSalaryMinor: newSalary,
        effectiveDate: laterThan(row.hireDate, random),
        reason: random.pick(['raise', 'raise', 'promotion', 'correction'] as const),
        changedBy: SEEDED_BY,
        changedAt: SEEDED_AT,
      });
    }
  });

  return changes;
}

/** SQLite binds a limited number of parameters per statement. */
const CHUNK_SIZE = 400;

function insertInChunks<T>(rows: T[], insert: (chunk: T[]) => void): void {
  for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
    insert(rows.slice(start, start + CHUNK_SIZE));
  }
}

export { SEEDED_ON };
