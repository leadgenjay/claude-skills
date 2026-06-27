/**
 * Calendar Routing — country dial-code data for the phone field.
 *
 * Powers the optional country-code dropdown next to the phone input when a
 * RoutingConfig sets `contactFields.phoneCountry`. Selecting a country gives us
 * BOTH the dial code (to compose an E.164 number GHL's tel picker can prefill —
 * see src/app/machine/scripts.ts) AND the country name (captured for the lead).
 *
 * Not exhaustive — covers the markets LGJ actually sees. US is the default.
 */

export interface Country {
  /** ISO 3166-1 alpha-2 code — stable select value. */
  iso: string;
  /** Display name. */
  name: string;
  /** E.164 calling code WITHOUT the leading "+" (e.g. "1", "44"). */
  dialCode: string;
}

export const DEFAULT_COUNTRY_ISO = "US";

/** Ordered so the most common LGJ markets surface first, then alphabetical. */
export const COUNTRIES: ReadonlyArray<Country> = [
  { iso: "US", name: "United States", dialCode: "1" },
  { iso: "CA", name: "Canada", dialCode: "1" },
  { iso: "GB", name: "United Kingdom", dialCode: "44" },
  { iso: "AU", name: "Australia", dialCode: "61" },
  { iso: "NZ", name: "New Zealand", dialCode: "64" },
  { iso: "IE", name: "Ireland", dialCode: "353" },
  { iso: "AE", name: "United Arab Emirates", dialCode: "971" },
  { iso: "AR", name: "Argentina", dialCode: "54" },
  { iso: "AT", name: "Austria", dialCode: "43" },
  { iso: "BE", name: "Belgium", dialCode: "32" },
  { iso: "BR", name: "Brazil", dialCode: "55" },
  { iso: "CH", name: "Switzerland", dialCode: "41" },
  { iso: "CL", name: "Chile", dialCode: "56" },
  { iso: "CO", name: "Colombia", dialCode: "57" },
  { iso: "DE", name: "Germany", dialCode: "49" },
  { iso: "DK", name: "Denmark", dialCode: "45" },
  { iso: "ES", name: "Spain", dialCode: "34" },
  { iso: "FI", name: "Finland", dialCode: "358" },
  { iso: "FR", name: "France", dialCode: "33" },
  { iso: "HK", name: "Hong Kong", dialCode: "852" },
  { iso: "IL", name: "Israel", dialCode: "972" },
  { iso: "IN", name: "India", dialCode: "91" },
  { iso: "IT", name: "Italy", dialCode: "39" },
  { iso: "JP", name: "Japan", dialCode: "81" },
  { iso: "MX", name: "Mexico", dialCode: "52" },
  { iso: "MY", name: "Malaysia", dialCode: "60" },
  { iso: "NG", name: "Nigeria", dialCode: "234" },
  { iso: "NL", name: "Netherlands", dialCode: "31" },
  { iso: "NO", name: "Norway", dialCode: "47" },
  { iso: "PH", name: "Philippines", dialCode: "63" },
  { iso: "PK", name: "Pakistan", dialCode: "92" },
  { iso: "PL", name: "Poland", dialCode: "48" },
  { iso: "PT", name: "Portugal", dialCode: "351" },
  { iso: "SA", name: "Saudi Arabia", dialCode: "966" },
  { iso: "SE", name: "Sweden", dialCode: "46" },
  { iso: "SG", name: "Singapore", dialCode: "65" },
  { iso: "TH", name: "Thailand", dialCode: "66" },
  { iso: "TR", name: "Turkey", dialCode: "90" },
  { iso: "ZA", name: "South Africa", dialCode: "27" },
];

const COUNTRY_BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));

/** Look up a country by ISO code, falling back to the default (US). */
export function countryByIso(iso: string | undefined): Country {
  return (iso && COUNTRY_BY_ISO.get(iso)) || COUNTRY_BY_ISO.get(DEFAULT_COUNTRY_ISO)!;
}
