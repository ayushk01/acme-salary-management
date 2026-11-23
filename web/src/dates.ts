/**
 * Today in the browser's own calendar.
 *
 * `toISOString().slice(0, 10)` gives UTC's date, which between midnight and
 * 05:30 in India is still yesterday — so a salary change saved late at night
 * would default to the wrong day.
 */
export function localDateIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
