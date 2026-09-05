/**
 * Pure RFC-4180 compliant CSV generator.
 * @param {Array<{ key: string, header: string }>} columns - Column definitions
 * @param {Array<Object>} rows - Data objects
 * @returns {string} CSV text
 */
export function toCsv(columns, rows = []) {
  if (!columns || columns.length === 0) return '';

  function escapeField(value) {
    if (value == null) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headerLine = columns.map((col) => escapeField(col.header || col.key)).join(',');
  const rowLines = rows.map((row) =>
    columns.map((col) => escapeField(row[col.key])).join(',')
  );

  return [headerLine, ...rowLines].join('\r\n');
}
