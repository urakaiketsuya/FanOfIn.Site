import test from 'node:test';
import assert from 'node:assert/strict';
import { US_REGION_STATES, usStateFromAddress } from '@gatcg/shared';
import { regionKeyForEvent, regionLabelForKey } from '../src/lib/regions';
const event = (hostAddress: string, setting = 'physical', hostCountry = 'US') => ({ hostAddress, setting, hostCountry });
test('all states and DC belong to exactly one area', () => {
  const states = Object.values(US_REGION_STATES).flat();
  assert.equal(states.length, 51);
  assert.equal(new Set(states).size, 51);
});
test('postal and full state names map to East, Central and West', () => {
  for (const [address, key] of [
    ['6610 Springfield Mall, Springfield, VA 22150, USA', 'us-east'],
    ['1314 Inwood Rd, Dallas, TX 75247, USA', 'us-central'],
    ['123 Main St, Chicago, Illinois, United States', 'us-central'],
    ['2085 Solano Ave\nVallejo, CA, 94509\nUnited States', 'us-west'],
    ['123 Main St, Seattle, WA 98101-1234, USA', 'us-west'],
    ['1445 Royalton Rd, Salyersville, KY 0, USA', 'us-east'],
  ]) assert.equal(regionKeyForEvent(event(address), 'region'), key);
});
test('unresolved and online locations are not assigned a coast', () => {
  for (const address of ['', 'Westin Seattle\nUnited States', '123 California Street, USA', 'Worlds\nU.S.A.']) {
    assert.equal(usStateFromAddress(address), null);
    assert.equal(regionKeyForEvent(event(address), 'region'), 'us-unknown');
  }
  assert.equal(regionKeyForEvent(event('Seattle, WA 98101, USA', 'online'), 'region'), 'us-online');
});
test('country grouping and other countries remain unchanged', () => {
  assert.equal(regionKeyForEvent(event('Dallas, TX 75247, USA'), 'country'), 'US');
  assert.equal(regionKeyForEvent(event('', 'physical', 'CA'), 'region'), 'north-america');
  assert.equal(regionKeyForEvent(event('', 'physical', '??'), 'region'), 'unknown');
  assert.equal(regionLabelForKey('us-west', 'region'), 'US West');
});
