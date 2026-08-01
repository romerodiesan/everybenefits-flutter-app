import type { AppLocale } from "@pulse/i18n";

/**
 * Non-`.gov` hosts that are still authoritative for US insurance: the
 * regulators' own association, the national producer registry, and the handful
 * of state Departments of Insurance that publish outside `.gov`.
 */
const EXTRA_ALLOWED_HOSTS = new Set([
  "naic.org",
  "content.naic.org",
  "nipr.com",
  "pdb.nipr.com",
  "floir.com",
  "myfloridacfo.com",
  "insurance.ohio.gov",
  "scc.virginia.gov",
]);

/** Hosts we explicitly never treat as official, even under an allowed suffix. */
const BLOCKED_HOSTS = new Set(["translate.google.com", "webcache.googleusercontent.com"]);

/**
 * A URL is official when it is HTTPS and served by a US government domain or
 * one of the listed regulator-adjacent hosts. Everything the agent cites from
 * the open web passes through here first.
 */
export function isAllowedOfficialUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return false;
  if (host === "gov" || host.endsWith(".gov")) return true;
  if (host.endsWith(".state.us") || /\.[a-z]{2}\.us$/.test(host)) return true;
  return EXTRA_ALLOWED_HOSTS.has(host);
}

export function publisherOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export type OfficialSourceSeed = {
  /** Stable id; also the Firestore chunk source id. */
  slug: string;
  title: string;
  url: string;
  language: AppLocale;
  tags: string[];
  /** Plain-language summary of what the page authoritatively covers. */
  summary: string;
};

/**
 * Curated regulator and federal-program references.
 *
 * These are indexed as `official` chunks so the agent can ground answers and
 * point people at the primary source. Summaries describe scope rather than
 * quoting figures, because dollar amounts and deadlines change yearly — the
 * agent is instructed to send users to the live page for current numbers.
 */
export const OFFICIAL_SOURCE_SEEDS: OfficialSourceSeed[] = [
  {
    slug: "naic-about-state-regulation",
    title: "NAIC — State-based insurance regulation",
    url: "https://content.naic.org/consumer.htm",
    language: "en",
    tags: ["compliance", "regulacion", "naic"],
    summary:
      "The National Association of Insurance Commissioners is the standard-setting body of the chief insurance regulators of all fifty states, the District of Columbia and five territories. Insurance in the United States is regulated at the state level, not federally: each state licenses producers and carriers, reviews rates and forms, examines solvency, and handles consumer complaints. The NAIC publishes model laws and regulations that states may adopt in whole, in part or not at all, which is why requirements differ across state lines. Producers must confirm the rule that applies in the state where the risk is located.",
  },
  {
    slug: "naic-consumer-complaints",
    title: "NAIC — Filing a complaint with your state insurance department",
    url: "https://content.naic.org/article/consumer-insight-how-file-complaint-your-state-insurance-department.htm",
    language: "en",
    tags: ["compliance", "reclamos", "consumidor"],
    summary:
      "Consumers who disagree with a carrier's claim decision can file a complaint with the Department of Insurance in their state. The department reviews whether the carrier followed the policy contract and state law, but it cannot decide contract disputes that belong in court. Complaint records are public data used in market conduct examinations. Agents should document claim communications and direct clients to the state department rather than opining on the legal merits of a denial.",
  },
  {
    slug: "nipr-producer-licensing",
    title: "NIPR — Producer licensing and the National Producer Number",
    url: "https://nipr.com/help/about-npn",
    language: "en",
    tags: ["npn", "licencia", "licensing"],
    summary:
      "The National Insurance Producer Registry issues the National Producer Number, a unique identifier assigned to every licensed insurance producer and adjuster in the United States. The NPN follows the producer across states and lines of authority and is used for non-resident licensing, appointments with carriers and continuing-education tracking. It is not a licence by itself: a producer still needs an active resident licence, the relevant lines of authority, and a carrier appointment in each state where business is written.",
  },
  {
    slug: "medicare-parts",
    title: "Medicare.gov — Parts of Medicare",
    url: "https://www.medicare.gov/basics/get-started-with-medicare/medicare-basics/parts-of-medicare",
    language: "en",
    tags: ["medicare", "productos", "salud"],
    summary:
      "Original Medicare is Part A, hospital insurance, and Part B, medical insurance. Part C, Medicare Advantage, bundles Part A and Part B through a private plan approved by Medicare and usually adds prescription drug coverage and extras. Part D is standalone prescription drug coverage. Medicare Supplement, also called Medigap, is separate private coverage that pays some of the out-of-pocket costs Original Medicare leaves behind and cannot be combined with a Medicare Advantage plan. Eligibility, enrolment windows and cost sharing are set federally and change each plan year.",
  },
  {
    slug: "medicare-enrollment-periods",
    title: "Medicare.gov — When you can sign up",
    url: "https://www.medicare.gov/basics/get-started-with-medicare/sign-up/when-does-medicare-coverage-start",
    language: "en",
    tags: ["medicare", "inscripcion", "enrollment"],
    summary:
      "Medicare enrolment runs on fixed windows: the Initial Enrolment Period around a beneficiary's 65th birthday, the General Enrolment Period, the annual Open Enrolment Period in the autumn when plan changes take effect the following January, the Medicare Advantage Open Enrolment Period early in the year, and Special Enrolment Periods triggered by qualifying events such as losing employer coverage or moving out of a plan's service area. Missing a window can create lifetime late-enrolment penalties for Part B and Part D. Confirm current dates on the official page each plan year.",
  },
  {
    slug: "cms-medicare-marketing-rules",
    title: "CMS — Medicare communications and marketing requirements",
    url: "https://www.cms.gov/medicare/health-drug-plans/managed-care-marketing",
    language: "en",
    tags: ["medicare", "compliance", "marketing"],
    summary:
      "The Centers for Medicare & Medicaid Services set binding rules for how Medicare Advantage and Part D plans and the agents who sell them may communicate with beneficiaries. The requirements cover the Scope of Appointment that must be documented before a sales meeting, prohibitions on unsolicited contact and on cross-selling non-health products during a sales appointment, required disclaimers, recording of sales calls, and review of marketing materials. Violations expose both the agent and the plan to corrective action and termination. The rules are updated annually in the Medicare Communications and Marketing Guidelines.",
  },
  {
    slug: "cms-medicaid-eligibility",
    title: "Medicaid.gov — Eligibility",
    url: "https://www.medicaid.gov/medicaid/eligibility",
    language: "en",
    tags: ["medicaid", "salud", "elegibilidad"],
    summary:
      "Medicaid is a joint federal and state programme, so eligibility rules and covered benefits vary by state within federal minimums. Most eligibility is based on Modified Adjusted Gross Income, with separate non-MAGI pathways for people who are aged, blind or disabled and for long-term-care applicants. Some states expanded Medicaid to adults under a set share of the federal poverty level and some did not, which changes who falls into the coverage gap. Eligibility determinations are made by the state agency, never by an agent.",
  },
  {
    slug: "healthcare-gov-enrollment",
    title: "HealthCare.gov — Enrollment periods and special enrollment",
    url: "https://www.healthcare.gov/coverage-outside-open-enrollment/special-enrollment-period/",
    language: "en",
    tags: ["aca", "marketplace", "inscripcion"],
    summary:
      "Marketplace coverage under the Affordable Care Act is sold during an annual Open Enrolment Period. Outside it, a consumer needs a Special Enrolment Period triggered by a qualifying life event such as losing other coverage, moving, marriage, birth or adoption, or a change in income that affects eligibility. Most special enrolment periods run sixty days from the event and require documentation. Agents assisting Marketplace consumers must complete Marketplace registration and training each plan year.",
  },
  {
    slug: "healthcare-gov-subsidies",
    title: "HealthCare.gov — Premium tax credits and cost-sharing reductions",
    url: "https://www.healthcare.gov/lower-costs/",
    language: "en",
    tags: ["aca", "subsidios", "marketplace"],
    summary:
      "Marketplace consumers may qualify for an advance premium tax credit that lowers the monthly premium and, on silver-level plans, for cost-sharing reductions that lower deductibles, copays and out-of-pocket maximums. Eligibility depends on projected household income relative to the federal poverty level, household size, and whether affordable employer coverage is available. Advance credits are reconciled on the consumer's federal tax return, so an income estimate that is too low creates a repayment. Only the Marketplace determines eligibility.",
  },
  {
    slug: "healthcare-gov-glossary",
    title: "HealthCare.gov — Health insurance glossary",
    url: "https://www.healthcare.gov/glossary/",
    language: "en",
    tags: ["salud", "productos", "glosario"],
    summary:
      "The official federal glossary defines the core cost-sharing terms of health coverage. The deductible is what the member pays before the plan starts paying. A copay is a fixed amount per service; coinsurance is a percentage. The out-of-pocket maximum caps what a member pays in a plan year for covered in-network essential health benefits, after which the plan pays one hundred percent. Premiums do not count toward the out-of-pocket maximum. Network type — HMO, PPO, EPO or POS — determines whether out-of-network care is covered at all and whether referrals are required.",
  },
  {
    slug: "healthcare-gov-espanol",
    title: "CuidadoDeSalud.gov — Cómo funciona el Mercado de seguros",
    url: "https://www.cuidadodesalud.gov/es/get-coverage/",
    language: "es",
    tags: ["aca", "marketplace", "salud"],
    summary:
      "El Mercado de seguros médicos permite comprar cobertura de salud durante el Período de Inscripción Abierta anual o mediante un Período Especial de Inscripción si ocurre un evento de vida que califique. Los planes se agrupan en categorías de metal —bronce, plata, oro y platino— que describen cómo se reparten los costos entre el plan y el afiliado, no la calidad de la atención. Los créditos fiscales para la prima reducen el pago mensual y solo el Mercado determina la elegibilidad. Los agentes deben completar el registro y la capacitación del Mercado cada año.",
  },
  {
    slug: "dol-ebsa-cobra",
    title: "DOL EBSA — COBRA continuation coverage",
    url: "https://www.dol.gov/agencies/ebsa/laws-and-regulations/laws/cobra",
    language: "en",
    tags: ["cobra", "beneficios", "compliance"],
    summary:
      "COBRA lets employees and their families keep group health coverage temporarily after a qualifying event such as job loss, reduction in hours, divorce or a dependent aging out. It generally applies to private employers with twenty or more employees and to state and local government plans; smaller employers may be covered by state continuation laws instead. Continuation typically runs eighteen or thirty-six months depending on the event, and the individual usually pays the full premium plus an administrative percentage. Election and notice deadlines are strict and are enforced by the Employee Benefits Security Administration.",
  },
  {
    slug: "dol-ebsa-erisa",
    title: "DOL EBSA — ERISA and employee benefit plans",
    url: "https://www.dol.gov/general/topic/health-plans/erisa",
    language: "en",
    tags: ["erisa", "beneficios", "compliance"],
    summary:
      "The Employee Retirement Income Security Act sets federal minimum standards for most voluntarily established private-sector retirement and health plans. It requires plan documents and summary plan descriptions, imposes fiduciary duties on those who manage plan assets, and establishes claims and appeals procedures. ERISA generally preempts state insurance law for self-funded plans, which is why a self-funded employer plan and a fully insured plan sold in the same state can follow different rules. Church and government plans are typically exempt.",
  },
  {
    slug: "hhs-hipaa-privacy",
    title: "HHS — HIPAA Privacy Rule",
    url: "https://www.hhs.gov/hipaa/for-professionals/privacy/index.html",
    language: "en",
    tags: ["hipaa", "compliance", "privacidad"],
    summary:
      "The HIPAA Privacy Rule governs how covered entities and their business associates may use and disclose protected health information. Health plans and most health-care providers are covered entities; agencies that handle PHI on their behalf are business associates and need a written agreement. Use and disclosure must be limited to the minimum necessary, individuals have rights of access and amendment, and breaches must be reported. Life and property-casualty insurers are generally not covered entities, but they may still hold information protected by state privacy law.",
  },
  {
    slug: "irs-aca-employer",
    title: "IRS — Affordable Care Act employer shared responsibility",
    url: "https://www.irs.gov/affordable-care-act/employers/employer-shared-responsibility-provisions",
    language: "en",
    tags: ["aca", "beneficios", "compliance"],
    summary:
      "Applicable large employers — generally those with fifty or more full-time and full-time-equivalent employees — must offer minimum essential coverage that is affordable and provides minimum value to full-time employees and their dependents, or face a shared-responsibility payment. Affordability is measured against a percentage of household income that the IRS indexes annually and can be tested with safe harbours. Employers also file information returns reporting the coverage offered. Determining large-employer status is a tax question for the employer's advisers.",
  },
  {
    slug: "irs-life-insurance-tax",
    title: "IRS — Life insurance and annuity tax treatment",
    url: "https://www.irs.gov/faqs/interest-dividends-other-types-of-income/life-insurance-disability-insurance-proceeds",
    language: "en",
    tags: ["vida", "anualidades", "impuestos"],
    summary:
      "Life insurance death benefits paid because of the insured's death are generally not included in the beneficiary's gross income, though interest paid on delayed proceeds is taxable. Surrendering a policy or taking withdrawals above basis can create taxable income, and a policy that fails the modified endowment contract tests is taxed differently on distributions. Annuity payments are split between a tax-free return of the investment in the contract and taxable earnings. Tax outcomes turn on individual facts, so clients should be referred to a tax professional.",
  },
  {
    slug: "ssa-disability",
    title: "SSA — Social Security disability benefits",
    url: "https://www.ssa.gov/disability/",
    language: "en",
    tags: ["incapacidad", "disability", "beneficios"],
    summary:
      "Social Security Disability Insurance pays benefits to workers with a qualifying work history whose medical condition prevents substantial gainful activity and is expected to last at least twelve months or result in death; Supplemental Security Income is a needs-based programme for people with limited income and resources. Both use the Social Security Administration's own definition of disability, which is stricter than most private disability policies. Private long-term disability contracts often offset benefits against Social Security awards, so the two interact and the policy language controls.",
  },
  {
    slug: "fema-nfip-flood",
    title: "FEMA — National Flood Insurance Program",
    url: "https://www.floodsmart.gov/",
    language: "en",
    tags: ["inundacion", "flood", "propiedad"],
    summary:
      "Standard homeowners and renters policies exclude flood damage; flood coverage is bought separately through the National Flood Insurance Program or from private flood carriers. NFIP policies have separate limits for building and contents, generally exclude most basement contents and additional living expenses, and normally carry a thirty-day waiting period before coverage takes effect, with narrow exceptions such as loan closings. Rating reflects the property's flood risk rather than only its mapped zone. Mortgage lenders may require flood coverage in high-risk areas.",
  },
  {
    slug: "dol-workers-comp",
    title: "DOL — Workers' compensation overview",
    url: "https://www.dol.gov/general/topic/workcomp",
    language: "en",
    tags: ["workers-comp", "comercial", "compliance"],
    summary:
      "Workers' compensation pays medical care and wage replacement for employees injured on the job, on a no-fault basis, in exchange for limits on the employer's tort liability. Coverage for private employees is created and enforced by each state, with separate federal programmes for federal employees, longshore and harbour workers, energy workers and coal miners. Which employers must carry coverage, how premiums are rated by class code and experience modifier, and how disputes are resolved all vary by state.",
  },
  {
    slug: "ftc-tcpa-do-not-call",
    title: "FTC — National Do Not Call Registry rules for sellers",
    url: "https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule",
    language: "en",
    tags: ["ventas", "compliance", "tcpa"],
    summary:
      "Telemarketing of insurance is constrained by the Telemarketing Sales Rule and by the Telephone Consumer Protection Act. Sellers must scrub call lists against the National Do Not Call Registry, honour company-specific do-not-call requests, respect calling-hour restrictions, disclose identity and purpose promptly, and keep records. Prior express written consent is required for autodialled or prerecorded calls and texts to mobile numbers, and consent must be specific rather than bundled. Penalties are assessed per call, and states add their own stricter rules.",
  },
  {
    slug: "naic-suitability-annuity",
    title: "NAIC — Suitability and best interest in annuity transactions",
    url: "https://content.naic.org/cipr-topics/annuity-suitability-best-interest-standard",
    language: "en",
    tags: ["anualidades", "compliance", "idoneidad"],
    summary:
      "The NAIC's Suitability in Annuity Transactions Model Regulation, as revised to add a best-interest standard, requires a producer recommending an annuity to act in the consumer's best interest without placing their own financial interest ahead of it. The obligation breaks into care, disclosure, conflict-of-interest and documentation duties: gather consumer profile information, have a reasonable basis for the recommendation, disclose the producer's role and compensation on request, and keep records. Most states have adopted the revised model, with variations in effective dates and training requirements.",
  },
  {
    slug: "naic-life-replacement",
    title: "NAIC — Replacement of life insurance and annuities",
    url: "https://content.naic.org/cipr-topics/life-insurance",
    language: "en",
    tags: ["vida", "compliance", "reemplazo"],
    summary:
      "Replacing an existing life insurance policy or annuity with a new one triggers specific duties under state replacement regulations: the producer must ask whether a replacement is involved, provide the required replacement notice, submit replacement forms to both carriers, and give the existing insurer an opportunity to conserve the policy. New contracts restart contestability and suicide clauses and may carry new surrender charges, so an unsuitable replacement is a common market-conduct finding. Free-look periods let the consumer cancel within a state-set window.",
  },
  {
    slug: "usa-gov-state-insurance-departments",
    title: "USA.gov — Find your state insurance department",
    url: "https://www.usa.gov/state-insurance",
    language: "en",
    tags: ["doi", "regulacion", "estados"],
    summary:
      "Every state, the District of Columbia and the US territories maintain an insurance department that licenses producers, approves rates and forms, investigates complaints and publishes state-specific bulletins. Because insurance is regulated state by state, the department for the state where the risk or the consumer is located is the authoritative source for licence requirements, continuing-education hours, appointment procedures, filing deadlines and permitted policy language. This directory links to each department.",
  },
  {
    slug: "consumerfinance-insurance-escrow",
    title: "CFPB — Homeowners insurance, escrow and force-placed coverage",
    url: "https://www.consumerfinance.gov/ask-cfpb/what-is-force-placed-insurance-en-1749/",
    language: "en",
    tags: ["hogar", "propiedad", "compliance"],
    summary:
      "Mortgage servicers may buy force-placed hazard insurance when a borrower lets required homeowners coverage lapse. Force-placed policies protect the lender's interest, typically cost far more than a voluntary policy and often cover less, including nothing for the borrower's personal property or liability. Servicers must send advance notices before charging for it and must remove it once the borrower shows proof of acceptable coverage. Escrow accounts collect insurance premiums with the mortgage payment and are subject to federal servicing rules.",
  },
];
