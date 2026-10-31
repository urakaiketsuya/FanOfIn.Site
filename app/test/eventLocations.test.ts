import test from 'node:test';
import assert from 'node:assert/strict';
import { eventLocation, countryFlag } from '../src/features/timelines/eventLocations';

test('uses event locations rather than overseas organizer addresses', () => {
  assert.deepEqual(eventLocation('Ascent Manila', 42040), { city: 'Manila', country: 'PH', region: 'Asia-Pacific' });
  assert.equal(eventLocation('Ascent London', 43636).city, 'London');
  assert.equal(eventLocation('Ascent Niagara Falls', 36225).country, 'CA');
});
test('keeps regional events honest and separates known venues from unknown locations', () => {
  assert.equal(eventLocation('Worlds 2026', 60488).city, 'Singapore');
  assert.equal(eventLocation('North American Nationals 2026', 52777).city, 'Las Vegas');
  assert.deepEqual(eventLocation('European Nationals 2026', 54238), { city: 'Europe', region: 'Europe' });
  assert.deepEqual(eventLocation('New event'), { city: 'New event', region: 'Other' });
  assert.equal(countryFlag('GB'), '🇬🇧');
  assert.equal(countryFlag(), '');
});

test('recovered broadcasts remain discoverable in their geographic region', () => {
  assert.deepEqual(eventLocation('Ascent Melbourne 2026'), { city: 'Melbourne', country: 'AU', region: 'Asia-Pacific' });
  assert.deepEqual(eventLocation('Ascent Auckland'), { city: 'Auckland', country: 'NZ', region: 'Asia-Pacific' });
  assert.deepEqual(eventLocation('Ascent Los Angeles'), { city: 'Los Angeles', country: 'US', region: 'Americas' });
  assert.deepEqual(eventLocation('Oceania Nationals 2026'), { city: 'Oceania', region: 'Asia-Pacific' });
});
