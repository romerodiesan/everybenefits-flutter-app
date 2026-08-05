export type PhoneCountry = {
  name: string;
  nameEs: string;
  dialCode: string;
  flag: string;
};

/** LATAM-focused dial list (mirrors mobile `phone_countries.dart`). */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { name: "Costa Rica", nameEs: "Costa Rica", dialCode: "+506", flag: "🇨🇷" },
  {
    name: "United States",
    nameEs: "Estados Unidos",
    dialCode: "+1",
    flag: "🇺🇸",
  },
  { name: "Mexico", nameEs: "México", dialCode: "+52", flag: "🇲🇽" },
  { name: "Colombia", nameEs: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { name: "Panama", nameEs: "Panamá", dialCode: "+507", flag: "🇵🇦" },
  { name: "Guatemala", nameEs: "Guatemala", dialCode: "+502", flag: "🇬🇹" },
  { name: "El Salvador", nameEs: "El Salvador", dialCode: "+503", flag: "🇸🇻" },
  { name: "Honduras", nameEs: "Honduras", dialCode: "+504", flag: "🇭🇳" },
  { name: "Nicaragua", nameEs: "Nicaragua", dialCode: "+505", flag: "🇳🇮" },
  {
    name: "Dominican Republic",
    nameEs: "República Dominicana",
    dialCode: "+1",
    flag: "🇩🇴",
  },
  { name: "Spain", nameEs: "España", dialCode: "+34", flag: "🇪🇸" },
  { name: "Argentina", nameEs: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { name: "Chile", nameEs: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { name: "Peru", nameEs: "Perú", dialCode: "+51", flag: "🇵🇪" },
  { name: "Ecuador", nameEs: "Ecuador", dialCode: "+593", flag: "🇪🇨" },
];

export function phoneCountryByDialCode(
  dialCode: string | null | undefined,
): PhoneCountry {
  const normalized = (dialCode ?? "").trim();
  const withPlus = normalized.startsWith("+")
    ? normalized
    : normalized
      ? `+${normalized}`
      : "";
  return (
    PHONE_COUNTRIES.find((c) => c.dialCode === withPlus) ?? PHONE_COUNTRIES[0]
  );
}

export function filterPhoneCountries(
  query: string,
  locale: string,
): PhoneCountry[] {
  const q = query.trim().toLowerCase();
  if (!q) return PHONE_COUNTRIES;
  return PHONE_COUNTRIES.filter((c) => {
    const name = locale.startsWith("es") ? c.nameEs : c.name;
    return (
      name.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.dialCode.replace("+", "").includes(q)
    );
  });
}
