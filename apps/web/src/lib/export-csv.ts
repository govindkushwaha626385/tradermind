// ──────────────────────────────────────────────
// TradeMind — Universal Client CSV Exporter
// Clean, robust CSV file generator with proper escaping
// ──────────────────────────────────────────────

export interface CsvColumn<T = any> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

/**
 * Escapes a cell value for standard RFC 4180 CSV compliance
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Downloads data as a CSV file in the browser
 */
export function downloadCsv<T = any>(
  filename: string,
  data: T[],
  columns: CsvColumn<T>[]
): boolean {
  if (!data || data.length === 0) {
    return false;
  }

  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const rowLines = data.map((item) =>
    columns.map((c) => escapeCsvCell(c.accessor(item))).join(',')
  );

  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
