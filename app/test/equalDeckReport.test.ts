import assert from 'node:assert/strict';
import test from 'node:test';
import { sectionCounts, reportAccess, pairMembership } from '../src/features/compare/equalDeckReportModel';

test('draw access uses each actual library and distinguishes unknown from absent', () => {
  const sixty = sectionCounts([{card:'A',quantity:1},{card:'A',quantity:2},{card:'B',quantity:57}]);
  const larger = sectionCounts([{card:'A',quantity:3},{card:'B',quantity:62}]);
  assert.equal(sixty.get('A'),3);
  assert.ok(Math.abs(reportAccess(sixty,'A',10)! - 100 * (1 - (50 * 49 * 48) / (60 * 59 * 58))) < 0.00001);
  assert.ok(reportAccess(larger,'A',10)! < reportAccess(sixty,'A',10)!);
  assert.equal(reportAccess(sixty,'Missing',10),0);
  assert.equal(reportAccess(null,'A',10),null);
  assert.equal(reportAccess(new Map(),'A',10),null);
  assert.equal(reportAccess(sixty,'A',100),100);
});

test('pair groups are symmetric and preserve section-specific quantities', () => {
  const a=sectionCounts([{card:'Shared',quantity:4},{card:'Changed',quantity:2},{card:'Only A',quantity:1}]);
  const b=sectionCounts([{card:'Shared',quantity:4},{card:'Changed',quantity:3},{card:'Only B',quantity:2}]);
  const forward=pairMembership(a,b),reverse=pairMembership(b,a);
  assert.deepEqual(forward.map(r=>[r.name,r.group]),reverse.map(r=>[r.name,r.group]));
  assert.deepEqual(forward.map(r=>[r.first,r.second]),reverse.map(r=>[r.second,r.first]));
  assert.equal(forward.find(r=>r.name==='Changed')?.group,'Different quantities');
  assert.equal(forward.find(r=>r.name==='Only A')?.group,'Distinctive cards');
  assert.equal(forward.find(r=>r.name==='Shared')?.group,'Shared core');
});
