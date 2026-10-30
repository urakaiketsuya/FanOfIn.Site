/** State-based competitive areas; these are product groupings, not coastal boundaries. */
export const US_REGION_STATES = {
  "us-west": "AK AZ CA CO HI ID MT NM NV OR UT WA WY".split(" "),
  "us-central": "AR IA IL IN KS LA MI MN MO ND NE OH OK SD TX WI".split(" "),
  "us-east": "AL CT DC DE FL GA KY MA MD ME MS NC NH NJ NY PA RI SC TN VA VT WV".split(" "),
} as const;

const STATE_NAMES = "Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming".split("|");
const STATE_CODES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");
const stateByName = new Map(STATE_NAMES.map((name, i) => [name.toUpperCase(), STATE_CODES[i]]));
const regionByState = new Map(Object.entries(US_REGION_STATES).flatMap(([region, states]) => states.map(state => [state, region] as const)));

/** Read the state from the address tail, never from a street or venue name. */
export function usStateFromAddress(address: string): string | null {
  const tail = address.trim().toUpperCase()
    .replace(/(?:[,\s]+)(?:USA|U\.?S\.?A\.?|UNITED STATES(?: OF AMERICA)?)\s*$/, "")
    .trim();
  // Standard postal tail, including comma-separated state/ZIP and malformed short ZIPs.
  const postal = tail.match(/(?:^|[,\s])([A-Z]{2})[,\s]+\d{1,5}(?:-\d{4})?$/);
  if (postal && regionByState.has(postal[1])) return postal[1];
  const lastPart = tail.split(/[,\n]/).at(-1)?.trim().replace(/\s+\d{5}(?:-\d{4})?$/, "");
  return lastPart ? stateByName.get(lastPart) ?? (regionByState.has(lastPart) ? lastPart : null) : null;
}

export function usRegionForEvent(event: { hostAddress: string; setting: string }): string {
  if (event.setting === "online") return "us-online";
  const state = usStateFromAddress(event.hostAddress);
  return state ? regionByState.get(state)! : "us-unknown";
}
