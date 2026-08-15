"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHONE_COUNTRIES = void 0;
exports.flagEmoji = flagEmoji;
exports.phoneCountryByIso2 = phoneCountryByIso2;
exports.normalizeDialCode = normalizeDialCode;
exports.resolvePhoneCountry = resolvePhoneCountry;
exports.filterPhoneCountries = filterPhoneCountries;
/** ISO2 codes shown first in pickers (LATAM + US + ES + CA/PR). */
const PRIORITY_ISO2 = [
    "CR",
    "US",
    "MX",
    "CO",
    "PA",
    "GT",
    "SV",
    "HN",
    "NI",
    "DO",
    "ES",
    "AR",
    "CL",
    "PE",
    "EC",
    "BR",
    "UY",
    "PY",
    "BO",
    "VE",
    "CA",
    "PR",
];
/** ITU E.164 entities keyed by ISO 3166-1 alpha-2 (plus a few territories). */
const ROWS = [
    ["AF", "+93", "Afghanistan", "Afganistán"],
    ["AL", "+355", "Albania", "Albania"],
    ["DZ", "+213", "Algeria", "Argelia"],
    ["AD", "+376", "Andorra", "Andorra"],
    ["AO", "+244", "Angola", "Angola"],
    ["AR", "+54", "Argentina", "Argentina"],
    ["AM", "+374", "Armenia", "Armenia"],
    ["AU", "+61", "Australia", "Australia"],
    ["AT", "+43", "Austria", "Austria"],
    ["AZ", "+994", "Azerbaijan", "Azerbaiyán"],
    ["BS", "+1", "Bahamas", "Bahamas"],
    ["BH", "+973", "Bahrain", "Baréin"],
    ["BD", "+880", "Bangladesh", "Bangladés"],
    ["BB", "+1", "Barbados", "Barbados"],
    ["BY", "+375", "Belarus", "Bielorrusia"],
    ["BE", "+32", "Belgium", "Bélgica"],
    ["BZ", "+501", "Belize", "Belice"],
    ["BJ", "+229", "Benin", "Benín"],
    ["BO", "+591", "Bolivia", "Bolivia"],
    ["BA", "+387", "Bosnia and Herzegovina", "Bosnia y Herzegovina"],
    ["BW", "+267", "Botswana", "Botsuana"],
    ["BR", "+55", "Brazil", "Brasil"],
    ["BN", "+673", "Brunei", "Brunéi"],
    ["BG", "+359", "Bulgaria", "Bulgaria"],
    ["BF", "+226", "Burkina Faso", "Burkina Faso"],
    ["BI", "+257", "Burundi", "Burundi"],
    ["KH", "+855", "Cambodia", "Camboya"],
    ["CM", "+237", "Cameroon", "Camerún"],
    ["CA", "+1", "Canada", "Canadá"],
    ["CV", "+238", "Cape Verde", "Cabo Verde"],
    ["CL", "+56", "Chile", "Chile"],
    ["CN", "+86", "China", "China"],
    ["CO", "+57", "Colombia", "Colombia"],
    ["KM", "+269", "Comoros", "Comoras"],
    ["CG", "+242", "Congo", "Congo"],
    ["CD", "+243", "Congo (DRC)", "Congo (RDC)"],
    ["CR", "+506", "Costa Rica", "Costa Rica"],
    ["CI", "+225", "Côte d'Ivoire", "Costa de Marfil"],
    ["HR", "+385", "Croatia", "Croacia"],
    ["CU", "+53", "Cuba", "Cuba"],
    ["CY", "+357", "Cyprus", "Chipre"],
    ["CZ", "+420", "Czechia", "Chequia"],
    ["DK", "+45", "Denmark", "Dinamarca"],
    ["DJ", "+253", "Djibouti", "Yibuti"],
    ["DO", "+1", "Dominican Republic", "República Dominicana"],
    ["EC", "+593", "Ecuador", "Ecuador"],
    ["EG", "+20", "Egypt", "Egipto"],
    ["SV", "+503", "El Salvador", "El Salvador"],
    ["GQ", "+240", "Equatorial Guinea", "Guinea Ecuatorial"],
    ["EE", "+372", "Estonia", "Estonia"],
    ["SZ", "+268", "Eswatini", "Esuatini"],
    ["ET", "+251", "Ethiopia", "Etiopía"],
    ["FJ", "+679", "Fiji", "Fiyi"],
    ["FI", "+358", "Finland", "Finlandia"],
    ["FR", "+33", "France", "Francia"],
    ["GA", "+241", "Gabon", "Gabón"],
    ["GM", "+220", "Gambia", "Gambia"],
    ["GE", "+995", "Georgia", "Georgia"],
    ["DE", "+49", "Germany", "Alemania"],
    ["GH", "+233", "Ghana", "Ghana"],
    ["GR", "+30", "Greece", "Grecia"],
    ["GT", "+502", "Guatemala", "Guatemala"],
    ["GN", "+224", "Guinea", "Guinea"],
    ["GY", "+592", "Guyana", "Guyana"],
    ["HT", "+509", "Haiti", "Haití"],
    ["HN", "+504", "Honduras", "Honduras"],
    ["HK", "+852", "Hong Kong", "Hong Kong"],
    ["HU", "+36", "Hungary", "Hungría"],
    ["IS", "+354", "Iceland", "Islandia"],
    ["IN", "+91", "India", "India"],
    ["ID", "+62", "Indonesia", "Indonesia"],
    ["IR", "+98", "Iran", "Irán"],
    ["IQ", "+964", "Iraq", "Irak"],
    ["IE", "+353", "Ireland", "Irlanda"],
    ["IL", "+972", "Israel", "Israel"],
    ["IT", "+39", "Italy", "Italia"],
    ["JM", "+1", "Jamaica", "Jamaica"],
    ["JP", "+81", "Japan", "Japón"],
    ["JO", "+962", "Jordan", "Jordania"],
    ["KZ", "+7", "Kazakhstan", "Kazajistán"],
    ["KE", "+254", "Kenya", "Kenia"],
    ["KW", "+965", "Kuwait", "Kuwait"],
    ["KG", "+996", "Kyrgyzstan", "Kirguistán"],
    ["LA", "+856", "Laos", "Laos"],
    ["LV", "+371", "Latvia", "Letonia"],
    ["LB", "+961", "Lebanon", "Líbano"],
    ["LY", "+218", "Libya", "Libia"],
    ["LT", "+370", "Lithuania", "Lituania"],
    ["LU", "+352", "Luxembourg", "Luxemburgo"],
    ["MO", "+853", "Macao", "Macao"],
    ["MG", "+261", "Madagascar", "Madagascar"],
    ["MW", "+265", "Malawi", "Malaui"],
    ["MY", "+60", "Malaysia", "Malasia"],
    ["MV", "+960", "Maldives", "Maldivas"],
    ["ML", "+223", "Mali", "Malí"],
    ["MT", "+356", "Malta", "Malta"],
    ["MR", "+222", "Mauritania", "Mauritania"],
    ["MU", "+230", "Mauritius", "Mauricio"],
    ["MX", "+52", "Mexico", "México"],
    ["MD", "+373", "Moldova", "Moldavia"],
    ["MC", "+377", "Monaco", "Mónaco"],
    ["MN", "+976", "Mongolia", "Mongolia"],
    ["ME", "+382", "Montenegro", "Montenegro"],
    ["MA", "+212", "Morocco", "Marruecos"],
    ["MZ", "+258", "Mozambique", "Mozambique"],
    ["MM", "+95", "Myanmar", "Myanmar"],
    ["NA", "+264", "Namibia", "Namibia"],
    ["NP", "+977", "Nepal", "Nepal"],
    ["NL", "+31", "Netherlands", "Países Bajos"],
    ["NZ", "+64", "New Zealand", "Nueva Zelanda"],
    ["NI", "+505", "Nicaragua", "Nicaragua"],
    ["NE", "+227", "Niger", "Níger"],
    ["NG", "+234", "Nigeria", "Nigeria"],
    ["KP", "+850", "North Korea", "Corea del Norte"],
    ["MK", "+389", "North Macedonia", "Macedonia del Norte"],
    ["NO", "+47", "Norway", "Noruega"],
    ["OM", "+968", "Oman", "Omán"],
    ["PK", "+92", "Pakistan", "Pakistán"],
    ["PS", "+970", "Palestine", "Palestina"],
    ["PA", "+507", "Panama", "Panamá"],
    ["PG", "+675", "Papua New Guinea", "Papúa Nueva Guinea"],
    ["PY", "+595", "Paraguay", "Paraguay"],
    ["PE", "+51", "Peru", "Perú"],
    ["PH", "+63", "Philippines", "Filipinas"],
    ["PL", "+48", "Poland", "Polonia"],
    ["PT", "+351", "Portugal", "Portugal"],
    ["PR", "+1", "Puerto Rico", "Puerto Rico"],
    ["QA", "+974", "Qatar", "Catar"],
    ["RO", "+40", "Romania", "Rumanía"],
    ["RU", "+7", "Russia", "Rusia"],
    ["RW", "+250", "Rwanda", "Ruanda"],
    ["SA", "+966", "Saudi Arabia", "Arabia Saudita"],
    ["SN", "+221", "Senegal", "Senegal"],
    ["RS", "+381", "Serbia", "Serbia"],
    ["SG", "+65", "Singapore", "Singapur"],
    ["SK", "+421", "Slovakia", "Eslovaquia"],
    ["SI", "+386", "Slovenia", "Eslovenia"],
    ["SO", "+252", "Somalia", "Somalia"],
    ["ZA", "+27", "South Africa", "Sudáfrica"],
    ["KR", "+82", "South Korea", "Corea del Sur"],
    ["SS", "+211", "South Sudan", "Sudán del Sur"],
    ["ES", "+34", "Spain", "España"],
    ["LK", "+94", "Sri Lanka", "Sri Lanka"],
    ["SD", "+249", "Sudan", "Sudán"],
    ["SR", "+597", "Suriname", "Surinam"],
    ["SE", "+46", "Sweden", "Suecia"],
    ["CH", "+41", "Switzerland", "Suiza"],
    ["SY", "+963", "Syria", "Siria"],
    ["TW", "+886", "Taiwan", "Taiwán"],
    ["TJ", "+992", "Tajikistan", "Tayikistán"],
    ["TZ", "+255", "Tanzania", "Tanzania"],
    ["TH", "+66", "Thailand", "Tailandia"],
    ["TL", "+670", "Timor-Leste", "Timor Oriental"],
    ["TG", "+228", "Togo", "Togo"],
    ["TT", "+1", "Trinidad and Tobago", "Trinidad y Tobago"],
    ["TN", "+216", "Tunisia", "Túnez"],
    ["TR", "+90", "Turkey", "Turquía"],
    ["TM", "+993", "Turkmenistan", "Turkmenistán"],
    ["UG", "+256", "Uganda", "Uganda"],
    ["UA", "+380", "Ukraine", "Ucrania"],
    ["AE", "+971", "United Arab Emirates", "Emiratos Árabes Unidos"],
    ["GB", "+44", "United Kingdom", "Reino Unido"],
    ["US", "+1", "United States", "Estados Unidos"],
    ["UY", "+598", "Uruguay", "Uruguay"],
    ["UZ", "+998", "Uzbekistan", "Uzbekistán"],
    ["VE", "+58", "Venezuela", "Venezuela"],
    ["VN", "+84", "Vietnam", "Vietnam"],
    ["YE", "+967", "Yemen", "Yemen"],
    ["ZM", "+260", "Zambia", "Zambia"],
    ["ZW", "+263", "Zimbabwe", "Zimbabue"],
];
function flagEmoji(iso2) {
    const code = iso2.toUpperCase();
    if (!/^[A-Z]{2}$/.test(code))
        return "🏳️";
    const base = 0x1f1e6;
    return String.fromCodePoint(base + code.charCodeAt(0) - 65, base + code.charCodeAt(1) - 65);
}
function priorityOf(iso2) {
    const index = PRIORITY_ISO2.indexOf(iso2);
    return index === -1 ? PRIORITY_ISO2.length + 1 : index;
}
exports.PHONE_COUNTRIES = ROWS.map(([iso2, dialCode, name, nameEs]) => ({
    iso2,
    dialCode,
    name,
    nameEs,
    flag: flagEmoji(iso2),
    priority: priorityOf(iso2),
})).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
const BY_ISO2 = new Map(exports.PHONE_COUNTRIES.map((c) => [c.iso2, c]));
function phoneCountryByIso2(iso2) {
    const key = (iso2 ?? "").trim().toUpperCase();
    return BY_ISO2.get(key);
}
function normalizeDialCode(raw) {
    const trimmed = (raw ?? "").trim();
    if (!trimmed)
        return "";
    return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}
/** Prefer ISO2; fall back to the first country with that dial code (priority order). */
function resolvePhoneCountry(input) {
    const byIso = phoneCountryByIso2(input.iso2);
    if (byIso)
        return byIso;
    const dial = normalizeDialCode(input.dialCode);
    return exports.PHONE_COUNTRIES.find((c) => c.dialCode === dial) ?? exports.PHONE_COUNTRIES[0];
}
function filterPhoneCountries(query, locale) {
    const q = query.trim().toLowerCase();
    if (!q)
        return exports.PHONE_COUNTRIES;
    const digits = q.replace(/\D/g, "");
    return exports.PHONE_COUNTRIES.filter((c) => {
        const name = locale.toLowerCase().startsWith("es") ? c.nameEs : c.name;
        return (name.toLowerCase().includes(q) ||
            c.iso2.toLowerCase().includes(q) ||
            c.dialCode.includes(q) ||
            (digits.length > 0 && c.dialCode.replace("+", "").includes(digits)));
    });
}
