/** Event-name locations take precedence over organizer addresses (which may be abroad). */
export function eventLocation(name: string, id?: number) {
  const places = [
    ['Las Vegas', 'US', 'Americas'], ['Niagara Falls', 'CA', 'Americas'],
    ['London', 'GB', 'Europe'], ['Manila', 'PH', 'Asia-Pacific'],
    ['Akihabara', 'JP', 'Asia-Pacific'], ['Taipei', 'TW', 'Asia-Pacific'],
  ] as const;
  const place = places.find(([city]) => name.includes(city));
  if (place) return { city: place[0], country: place[1], region: place[2] };
  // These event snapshots explicitly place the venue at Singapore Expo / Las Vegas.
  if (id === 60488 || id === 60363) return { city: 'Singapore', country: 'SG', region: 'Asia-Pacific' };
  if (id === 52777) return { city: 'Las Vegas', country: 'US', region: 'Americas' };
  if (/Southeast Asia|SEA National/i.test(name)) return { city: 'Southeast Asia', region: 'Asia-Pacific' };
  if (/European|EU National/i.test(name)) return { city: 'Europe', region: 'Europe' };
  if (/North American/i.test(name)) return { city: 'North America', region: 'Americas' };
  return { city: name, region: 'Other' };
}

export function countryFlag(country?: string) {
  return country ? [...country].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('') : '';
}
