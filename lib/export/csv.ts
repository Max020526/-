const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

function cell(value: unknown) {
  if (value == null) return "";
  const raw = String(value);
  const safe = DANGEROUS_PREFIX.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function createCsv(headers: string[], rows: unknown[][]) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}`;
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const blob = new Blob([createCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
