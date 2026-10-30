import assert from 'node:assert/strict';
import test from 'node:test';
import { startBuildComparison } from '../src/features/decks/startBuildComparison';
import { runBuildComparison, type BuildComparisonInput, type BuildComparisonResponse } from '../src/features/decks/deckBuildComparisonJob';

const input: BuildComparisonInput = {
  target: { main: [], material: [] }, clusters: [], partitions: new Map(), cards: new Map(),
};
const response: BuildComparisonResponse = { result: runBuildComparison(input) };
function worker() {
  return {
    onmessage: null as Worker['onmessage'], onerror: null as Worker['onerror'],
    onmessageerror: null as Worker['onmessageerror'],
    posted: [] as unknown[], terminated: 0,
    postMessage(value: unknown) { this.posted.push(value); },
    terminate() { this.terminated++; },
    reply(value = response) { this.onmessage?.call(this as unknown as Worker, { data: value } as MessageEvent); },
    fail(kind: 'onerror' | 'onmessageerror') { (this[kind] as (() => void) | null)?.(); },
  };
}

test('completion publishes once and terminates the worker, including duplicate/error events', () => {
  const port = worker(); const results: BuildComparisonResponse[] = [];
  const cancel = startBuildComparison(input, value => results.push(value), () => port);
  assert.deepEqual(port.posted, [input]);
  port.reply(); port.reply(); port.fail('onerror'); port.fail('onmessageerror');
  assert.deepEqual(results, [response]);
  assert.equal(port.terminated, 1);
  cancel(); port.reply();
  assert.equal(results.length, 1);
});

test('switching decks or closing prevents late results and errors from publishing', () => {
  const old = worker(); const current = worker(); const results: BuildComparisonResponse[] = [];
  const cancel = startBuildComparison(input, value => results.push(value), () => old);
  cancel();
  const cancelCurrent = startBuildComparison({ ...input }, value => results.push(value), () => current);
  old.reply(); old.fail('onerror'); old.fail('onmessageerror');
  assert.equal(results.length, 0);
  assert.equal(old.terminated, 1);
  current.reply();
  assert.deepEqual(results, [response]);
  cancelCurrent();
});

for (const failure of ['construction', 'postMessage', 'onerror', 'onmessageerror'] as const) {
  test(`${failure} failure can retry with a fresh worker; the failed attempt stays inactive`, () => {
    const failed = worker(); const retry = worker(); const results: BuildComparisonResponse[] = [];
    if (failure === 'postMessage') failed.postMessage = () => { throw new Error('Clone failed'); };
    startBuildComparison(input, value => results.push(value), () => {
      if (failure === 'construction') throw new Error('Unavailable');
      return failed;
    });
    if (failure === 'onerror' || failure === 'onmessageerror') failed.fail(failure);
    assert.deepEqual(results, [{ error: 'Comparison could not run. Try again.' }]);
    assert.equal(failed.terminated, failure === 'construction' ? 0 : 1);
    startBuildComparison(input, value => results.push(value), () => retry);
    failed.reply(); failed.fail('onerror');
    assert.equal(results.length, 1);
    retry.reply();
    assert.deepEqual(results, [{ error: 'Comparison could not run. Try again.' }, response]);
    assert.equal(retry.terminated, 1);
  });
}

test('worker-reported calculation failures terminate and allow a fresh successful attempt', () => {
  const failed = worker(); const retry = worker(); const results: BuildComparisonResponse[] = [];
  startBuildComparison(input, value => results.push(value), () => failed);
  const error: BuildComparisonResponse = { error: 'Comparison could not run. Try again.' };
  failed.reply(error);
  startBuildComparison(input, value => results.push(value), () => retry);
  failed.reply(); retry.reply();
  assert.deepEqual(results, [error, response]);
  assert.equal(failed.terminated, 1);
  assert.equal(retry.terminated, 1);
});
