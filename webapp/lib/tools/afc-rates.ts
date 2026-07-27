/** Practice rates from AFC7010-FLBRSP (training quote tool — not official). */

export const AFC_AGES = [
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
  "60",
  "64",
] as const;

export type AfcAge = (typeof AFC_AGES)[number];

export const AFC_TIERS = [
  "classic",
  "classic_plus",
  "elite",
  "elite_plus",
] as const;

export type AfcTier = (typeof AFC_TIERS)[number];

export const AFC_COVERAGES = [
  "individual",
  "individual_spouse",
  "individual_children",
  "individual_family",
  "child_only",
] as const;

export type AfcCoverage = (typeof AFC_COVERAGES)[number];

type AgeBandRates = Record<AfcCoverage, number>;
type TierRates = Record<AfcAge, AgeBandRates>;

/** Monthly premiums by tier → issue age → coverage. */
export const AFC_MONTHLY_RATES: Record<AfcTier, TierRates> = {
  elite_plus: {
    "20": {
      individual: 160.48,
      individual_spouse: 304.39,
      individual_children: 283.81,
      individual_family: 449.21,
      child_only: 194.49,
    },
    "25": {
      individual: 181.84,
      individual_spouse: 342.54,
      individual_children: 318.9,
      individual_family: 505.19,
      child_only: 194.49,
    },
    "30": {
      individual: 204.92,
      individual_spouse: 392.85,
      individual_children: 356.67,
      individual_family: 565.33,
      child_only: 194.49,
    },
    "35": {
      individual: 227.59,
      individual_spouse: 435.43,
      individual_children: 393.71,
      individual_family: 624.24,
      child_only: 194.49,
    },
    "40": {
      individual: 248.65,
      individual_spouse: 474.58,
      individual_children: 427.82,
      individual_family: 678.23,
      child_only: 194.49,
    },
    "45": {
      individual: 273.89,
      individual_spouse: 521.25,
      individual_children: 468.52,
      individual_family: 742.46,
      child_only: 194.49,
    },
    "50": {
      individual: 315.85,
      individual_spouse: 597.96,
      individual_children: 535.56,
      individual_family: 847.67,
      child_only: 194.49,
    },
    "55": {
      individual: 357.81,
      individual_spouse: 674.67,
      individual_children: 602.6,
      individual_family: 952.88,
      child_only: 194.49,
    },
    "60": {
      individual: 401.2,
      individual_spouse: 753.89,
      individual_children: 671.84,
      individual_family: 1061.46,
      child_only: 194.49,
    },
    "64": {
      individual: 440.29,
      individual_spouse: 824.86,
      individual_children: 733.94,
      individual_family: 1158.58,
      child_only: 194.49,
    },
  },
  elite: {
    "20": {
      individual: 128.73,
      individual_spouse: 240.91,
      individual_children: 225.09,
      individual_family: 355.07,
      child_only: 147.48,
    },
    "25": {
      individual: 145.22,
      individual_spouse: 269.32,
      individual_children: 251.4,
      individual_family: 396.88,
      child_only: 147.48,
    },
    "30": {
      individual: 163.09,
      individual_spouse: 309.21,
      individual_children: 279.79,
      individual_family: 441.85,
      child_only: 147.48,
    },
    "35": {
      individual: 180.67,
      individual_spouse: 341.6,
      individual_children: 307.65,
      individual_family: 485.93,
      child_only: 147.48,
    },
    "40": {
      individual: 197.09,
      individual_spouse: 371.49,
      individual_children: 333.42,
      individual_family: 526.44,
      child_only: 147.48,
    },
    "45": {
      individual: 216.85,
      individual_spouse: 407.19,
      individual_children: 364.24,
      individual_family: 574.71,
      child_only: 147.48,
    },
    "50": {
      individual: 249.92,
      individual_spouse: 466.12,
      individual_children: 415.26,
      individual_family: 654.04,
      child_only: 147.48,
    },
    "55": {
      individual: 282.99,
      individual_spouse: 525.05,
      individual_children: 466.28,
      individual_family: 733.36,
      child_only: 147.48,
    },
    "60": {
      individual: 317.22,
      individual_spouse: 585.93,
      individual_children: 519.01,
      individual_family: 815.26,
      child_only: 147.48,
    },
    "64": {
      individual: 348.14,
      individual_spouse: 640.59,
      individual_children: 566.41,
      individual_family: 888.63,
      child_only: 147.48,
    },
  },
  classic_plus: {
    "20": {
      individual: 98.09,
      individual_spouse: 184.48,
      individual_children: 169.21,
      individual_family: 267.53,
      child_only: 109.2,
    },
    "25": {
      individual: 110.34,
      individual_spouse: 206.76,
      individual_children: 188.91,
      individual_family: 299.34,
      child_only: 109.2,
    },
    "30": {
      individual: 123.57,
      individual_spouse: 235.14,
      individual_children: 210.12,
      individual_family: 333.51,
      child_only: 109.2,
    },
    "35": {
      individual: 136.56,
      individual_spouse: 259.73,
      individual_children: 230.91,
      individual_family: 366.96,
      child_only: 109.2,
    },
    "40": {
      individual: 148.59,
      individual_spouse: 282.31,
      individual_children: 250.02,
      individual_family: 397.59,
      child_only: 109.2,
    },
    "45": {
      individual: 162.99,
      individual_spouse: 309.2,
      individual_children: 272.81,
      individual_family: 434.02,
      child_only: 109.2,
    },
    "50": {
      individual: 186.85,
      individual_spouse: 353.32,
      individual_children: 310.29,
      individual_family: 493.6,
      child_only: 109.2,
    },
    "55": {
      individual: 210.71,
      individual_spouse: 397.44,
      individual_children: 347.77,
      individual_family: 553.19,
      child_only: 109.2,
    },
    "60": {
      individual: 235.38,
      individual_spouse: 442.99,
      individual_children: 386.46,
      individual_family: 614.68,
      child_only: 109.2,
    },
    "64": {
      individual: 257.57,
      individual_spouse: 483.76,
      individual_children: 421.15,
      individual_family: 669.65,
      child_only: 109.2,
    },
  },
  classic: {
    "20": {
      individual: 70.09,
      individual_spouse: 128.52,
      individual_children: 116.9,
      individual_family: 183.93,
      child_only: 74.42,
    },
    "25": {
      individual: 79.33,
      individual_spouse: 144.76,
      individual_children: 131.38,
      individual_family: 207.19,
      child_only: 74.42,
    },
    "30": {
      individual: 89.32,
      individual_spouse: 166.67,
      individual_children: 147.0,
      individual_family: 232.21,
      child_only: 74.42,
    },
    "35": {
      individual: 99.14,
      individual_spouse: 184.93,
      individual_children: 162.32,
      individual_family: 256.72,
      child_only: 74.42,
    },
    "40": {
      individual: 108.3,
      individual_spouse: 201.76,
      individual_children: 176.47,
      individual_family: 279.22,
      child_only: 74.42,
    },
    "45": {
      individual: 119.29,
      individual_spouse: 221.84,
      individual_children: 193.37,
      individual_family: 306.02,
      child_only: 74.42,
    },
    "50": {
      individual: 137.63,
      individual_spouse: 254.91,
      individual_children: 221.31,
      individual_family: 349.99,
      child_only: 74.42,
    },
    "55": {
      individual: 155.97,
      individual_spouse: 287.99,
      individual_children: 249.24,
      individual_family: 393.97,
      child_only: 74.42,
    },
    "60": {
      individual: 174.94,
      individual_spouse: 322.15,
      individual_children: 278.11,
      individual_family: 439.37,
      child_only: 74.42,
    },
    "64": {
      individual: 192.06,
      individual_spouse: 352.8,
      individual_children: 304.03,
      individual_family: 480.01,
      child_only: 74.42,
    },
  },
};

export type AfcBenefits = {
  hospitalDaily: number;
  observation24to47: number;
  observation48Plus: number;
  erAmount: number;
  erPerYear: number;
  rxPerDay: number;
};

export const AFC_BENEFITS: Record<AfcTier, AfcBenefits> = {
  elite_plus: {
    hospitalDaily: 6000,
    observation24to47: 3000,
    observation48Plus: 4500,
    erAmount: 300,
    erPerYear: 2,
    rxPerDay: 75,
  },
  elite: {
    hospitalDaily: 4000,
    observation24to47: 2000,
    observation48Plus: 3000,
    erAmount: 300,
    erPerYear: 2,
    rxPerDay: 50,
  },
  classic_plus: {
    hospitalDaily: 3000,
    observation24to47: 1500,
    observation48Plus: 2250,
    erAmount: 250,
    erPerYear: 1,
    rxPerDay: 50,
  },
  classic: {
    hospitalDaily: 2000,
    observation24to47: 1000,
    observation48Plus: 1500,
    erAmount: 250,
    erPerYear: 1,
    rxPerDay: 25,
  },
};

export function lookupAfcPremium(
  tier: AfcTier,
  age: AfcAge,
  coverage: AfcCoverage,
): number {
  return AFC_MONTHLY_RATES[tier][age][coverage];
}

export function formatUsd(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
