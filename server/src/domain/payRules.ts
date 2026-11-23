/**
 * The pay rules, in one place.
 *
 * These are this build's choice, not ACME policy, so they are constants
 * rather than literals scattered through the code. The outlier SQL receives
 * both of them as bound parameters, which is what stops the query and the
 * function below from drifting apart.
 */

/** A salary more than this far from its group's median is outside range. */
export const OUTLIER_THRESHOLD_PERCENT = 25;

/**
 * Groups smaller than this are skipped. A group of one sits exactly on its
 * own median, and a pair is barely more meaningful.
 */
export const MIN_GROUP_SIZE = 5;

/**
 * Whether a salary is outside the range for its job title and country.
 *
 * The comparison multiplies rather than divides so it stays in integers and
 * never touches a float. Strict `>` and `<` mean a salary *exactly* at the
 * threshold is inside the range, which is the boundary the acceptance
 * criteria call out.
 */
export function isOutsideRange(
  salaryMinor: number,
  medianMinor: number,
  thresholdPercent: number = OUTLIER_THRESHOLD_PERCENT,
): boolean {
  const scaledSalary = salaryMinor * 100;

  return (
    scaledSalary > medianMinor * (100 + thresholdPercent) ||
    scaledSalary < medianMinor * (100 - thresholdPercent)
  );
}

/** Whether a job-title-and-country group has enough people to judge. */
export function isGroupLargeEnough(groupSize: number): boolean {
  return groupSize >= MIN_GROUP_SIZE;
}
