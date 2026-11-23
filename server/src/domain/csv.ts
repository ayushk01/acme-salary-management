/**
 * CSV, written the way Excel reads it.
 *
 * A field is quoted when it contains a comma, a quote, or a line break, and
 * its own quotes are doubled. Skipping this is the classic CSV bug: it works
 * on every tidy name and silently splits "Rao, Asha" across two columns.
 */
export function csvField(value: string | number | null): string {
  if (value === null) {
    return '';
  }

  const text = String(value);

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Excel expects CRLF line endings, not the bare newline a Unix tool writes. */
export function csvLine(fields: (string | number | null)[]): string {
  return `${fields.map(csvField).join(',')}\r\n`;
}

/**
 * Excel assumes the local codepage unless a UTF-8 file announces itself with
 * a byte order mark, and mangles every non-ASCII name without one.
 */
export const UTF8_BOM = '﻿';
