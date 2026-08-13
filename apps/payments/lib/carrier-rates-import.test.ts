import { describe, expect, it } from "vitest";
import {
  CARRIER_RATES_TEMPLATE_CSV,
  CARRIER_RATES_TEMPLATE_HEADERS,
  parseCarrierRatesCsv,
  sanitizeCarrierRatesRows,
} from "./carrier-rates-import";

describe("carrier-rates-import", () => {
  it("exposes template headers", () => {
    expect(CARRIER_RATES_TEMPLATE_HEADERS).toContain("carrier_code");
    expect(CARRIER_RATES_TEMPLATE_CSV.split("\n")[0]).toContain("commission_rate");
  });

  it("parses template CSV into rows", () => {
    const rows = parseCarrierRatesCsv(CARRIER_RATES_TEMPLATE_CSV);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0]).toMatchObject({
      carrier_code: "1001",
      state: "FL",
    });
  });

  it("sanitizes row maps via shared schema", () => {
    const sanitized = sanitizeCarrierRatesRows([
      {
        carrier_code: "1001",
        carrier_name: "Aetna",
        state: "fl",
        commission_rate: "25",
        commission_unit: "pmpm",
        override_rate: "18",
        override_unit: "pmpm",
      },
    ]);
    expect(sanitized[0]).toBeTruthy();
  });
});
