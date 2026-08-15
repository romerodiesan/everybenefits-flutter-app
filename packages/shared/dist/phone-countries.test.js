"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const phone_countries_1 = require("./phone-countries");
(0, vitest_1.describe)("phone countries catalog", () => {
    (0, vitest_1.it)("keys rows by iso2 and prefers LATAM", () => {
        (0, vitest_1.expect)((0, phone_countries_1.phoneCountryByIso2)("cr")?.dialCode).toBe("+506");
        (0, vitest_1.expect)((0, phone_countries_1.phoneCountryByIso2)("US")?.iso2).toBe("US");
        (0, vitest_1.expect)((0, phone_countries_1.phoneCountryByIso2)("DO")?.iso2).toBe("DO");
        (0, vitest_1.expect)((0, phone_countries_1.phoneCountryByIso2)("BR")?.dialCode).toBe("+55");
        const first = (0, phone_countries_1.filterPhoneCountries)("", "en")[0];
        (0, vitest_1.expect)(first?.iso2).toBe("CR");
    });
    (0, vitest_1.it)("resolves +1 collisions via iso2", () => {
        (0, vitest_1.expect)((0, phone_countries_1.resolvePhoneCountry)({ iso2: "DO", dialCode: "+1" }).iso2).toBe("DO");
        (0, vitest_1.expect)((0, phone_countries_1.resolvePhoneCountry)({ iso2: "US", dialCode: "+1" }).iso2).toBe("US");
        (0, vitest_1.expect)((0, phone_countries_1.resolvePhoneCountry)({ dialCode: "+1" }).iso2).toBe("US");
    });
    (0, vitest_1.it)("filters by name or digits", () => {
        const es = (0, phone_countries_1.filterPhoneCountries)("espa", "es");
        (0, vitest_1.expect)(es.some((c) => c.iso2 === "ES")).toBe(true);
        const plus = (0, phone_countries_1.filterPhoneCountries)("506", "en");
        (0, vitest_1.expect)(plus.map((c) => c.iso2)).toContain("CR");
        (0, vitest_1.expect)((0, phone_countries_1.filterPhoneCountries)("zzzz", "en")).toEqual([]);
    });
});
