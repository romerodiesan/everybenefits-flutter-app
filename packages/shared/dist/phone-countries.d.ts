export type PhoneCountry = {
    iso2: string;
    dialCode: string;
    name: string;
    nameEs: string;
    flag: string;
    priority: number;
};
export declare function flagEmoji(iso2: string): string;
export declare const PHONE_COUNTRIES: PhoneCountry[];
export declare function phoneCountryByIso2(iso2: string | null | undefined): PhoneCountry | undefined;
export declare function normalizeDialCode(raw: string | null | undefined): string;
/** Prefer ISO2; fall back to the first country with that dial code (priority order). */
export declare function resolvePhoneCountry(input: {
    iso2?: string | null;
    dialCode?: string | null;
}): PhoneCountry;
export declare function filterPhoneCountries(query: string, locale: string): PhoneCountry[];
//# sourceMappingURL=phone-countries.d.ts.map