import { describe, expect, it } from "vitest";
import {
  filterPhoneCountries,
  phoneCountryByIso2,
  resolvePhoneCountry,
} from "./phone-countries";

describe("phone countries catalog", () => {
  it("keys rows by iso2 and prefers LATAM", () => {
    expect(phoneCountryByIso2("cr")?.dialCode).toBe("+506");
    expect(phoneCountryByIso2("US")?.iso2).toBe("US");
    expect(phoneCountryByIso2("DO")?.iso2).toBe("DO");
    expect(phoneCountryByIso2("BR")?.dialCode).toBe("+55");
    const first = filterPhoneCountries("", "en")[0];
    expect(first?.iso2).toBe("CR");
  });

  it("resolves +1 collisions via iso2", () => {
    expect(resolvePhoneCountry({ iso2: "DO", dialCode: "+1" }).iso2).toBe("DO");
    expect(resolvePhoneCountry({ iso2: "US", dialCode: "+1" }).iso2).toBe("US");
    expect(resolvePhoneCountry({ dialCode: "+1" }).iso2).toBe("US");
  });

  it("filters by name or digits", () => {
    const es = filterPhoneCountries("espa", "es");
    expect(es.some((c) => c.iso2 === "ES")).toBe(true);
    const plus = filterPhoneCountries("506", "en");
    expect(plus.map((c) => c.iso2)).toContain("CR");
    expect(filterPhoneCountries("zzzz", "en")).toEqual([]);
  });
});
