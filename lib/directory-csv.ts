export function directoryCsv(headers: string[], rows: Array<Array<string | number | boolean>>): string {
  const cell = (value: string | number | boolean) => {
    const raw = String(value);
    const safe = typeof value === "string" && /^\s*[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function downloadDirectoryCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean>>): void {
  const url = URL.createObjectURL(new Blob([directoryCsv(headers, rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
