/** Carrier state-rate spreadsheet helpers (CSV + XLSX). */

import { sanitizeCarrierStateRateImportRow } from "@pulse/shared";

export const CARRIER_RATES_TEMPLATE_HEADERS = [
  "carrier_code",
  "carrier_name",
  "state",
  "commission_rate",
  "commission_unit",
  "override_rate",
  "override_unit",
] as const;

export const CARRIER_RATES_TEMPLATE_CSV = `${CARRIER_RATES_TEMPLATE_HEADERS.join(",")}
1001,Aetna,FL,25,pmpm,18,pmpm
1001,Aetna,TX,22,pmpm,15,pmpm
1002,Oscar,FL,20,flat,10,flat
`;

export function sanitizeCarrierRatesRows(
  rows: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return rows.map((row) => sanitizeCarrierStateRateImportRow(row));
}

function rowsFromMatrix(matrix: unknown[][]): Array<Record<string, unknown>> {
  if (matrix.length < 2) return [];
  const headerRow = matrix[0]!.map((h) =>
    String(h ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_"),
  );
  const out: Array<Record<string, unknown>> = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r]!;
    if (line.every((c) => c == null || String(c).trim() === "")) continue;
    const row: Record<string, unknown> = {};
    for (let c = 0; c < headerRow.length; c++) {
      let key = headerRow[c]!;
      if (!key) continue;
      // Common header aliases from Sheets/Excel exports.
      if (key === "code") key = "carrier_code";
      if (key === "name" || key === "carrier") key = "carrier_name";
      if (key === "commission" || key === "commissionrate") {
        key = "commission_rate";
      }
      if (key === "commissionunit") key = "commission_unit";
      if (key === "override" || key === "overriderate") key = "override_rate";
      if (key === "overrideunit") key = "override_unit";
      const raw = line[c];
      // Drop empty optional cells so Zod defaults apply.
      if (raw == null || (typeof raw === "string" && raw.trim() === "")) {
        continue;
      }
      row[key] = raw;
    }
    out.push(row);
  }
  return out;
}

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semis = (headerLine.match(/;/g) ?? []).length;
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  if (tabs > commas && tabs > semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function splitDelimitedLine(
  line: string,
  delimiter: "," | ";" | "\t",
): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

export function parseCarrierRatesCsv(
  text: string,
): Array<Record<string, unknown>> {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(lines[0]!);
  const matrix = lines.map((l) => splitDelimitedLine(l, delimiter));
  return rowsFromMatrix(matrix);
}

export async function parseCarrierRatesFile(
  file: File,
): Promise<Array<Record<string, unknown>>> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseCarrierRatesCsv(await file.text());
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const matrix = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });
    return rowsFromMatrix(matrix as unknown[][]);
  }
  throw new Error("unsupported_file");
}

export function downloadCarrierRatesTemplate() {
  const blob = new Blob([CARRIER_RATES_TEMPLATE_CSV], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "carrier-state-rates-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
