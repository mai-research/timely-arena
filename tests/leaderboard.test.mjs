import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const load = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve the same local TypeScript modules as Next, without a second test build.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, parent, ...rest) {
  if (name.startsWith('@/')) name = path.join(dirname, '../src', name.slice(2));
  return resolve.call(this, name, parent, ...rest);
};
load.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { SNAPSHOTS, rankedEntries, selectEntries, dailyUsage, summary } = load('../src/lib/leaderboard/data.ts');

test('demo snapshot totals reconcile with pairwise votes and daily token buckets', () => {
  for (const snapshot of Object.values(SNAPSHOTS)) {
    const rows = rankedEntries(snapshot), totals = summary(snapshot), days = dailyUsage(snapshot,30);
    assert.equal(days.length,30);
    assert.equal(days.at(-1).date,snapshot.date);
    assert.equal(totals.tokens,days.reduce((s,d)=>s+d.tokens,0));
    assert.equal(totals.votes,rows.reduce((s,r)=>s+r.votes,0)/2);
    assert.equal(rows.reduce((s,r)=>s+r.wins,0),rows.reduce((s,r)=>s+r.losses,0));
    assert.equal(rows.reduce((s,r)=>s+r.ties,0)%2,0);
    assert.ok(rows.every(r=>r.profile.every(x=>x>=0&&x<=100)));
    assert.deepEqual(dailyUsage(snapshot,7),days.slice(-7));
  }
});
test('search and every numeric sort preserve the full Elo ranking and source order', () => {
  const snapshot=SNAPSHOTS.models, original=JSON.stringify(snapshot);
  for(const key of ['rank','elo','votes','tokens','winRate']) for(const dir of ['asc','desc']) {
    const rows=selectEntries(snapshot,'',key,dir);
    for(let i=1;i<rows.length;i++) assert.ok(dir==='asc'?rows[i][key]>=rows[i-1][key]:rows[i][key]<=rows[i-1][key]);
    for(const row of rows) assert.equal(row.rank,rankedEntries(snapshot).find(r=>r.id===row.id).rank);
  }
  assert.equal(selectEntries(snapshot,'  OPENAI  ','elo','desc')[0].rank,2);
  assert.equal(selectEntries(snapshot,'not a model','elo','desc').length,0);
  assert.equal(JSON.stringify(snapshot),original);
});
test('ties receive half a point, zero votes have no rate, tied Elo shares rank', () => {
  const entry=SNAPSHOTS.models.entries[0];
  const snapshot={kind:'models',date:'2026-09-06',entries:[
    {...entry,id:'a',wins:2,losses:1,ties:1,elo:1200},
    {...entry,id:'b',wins:0,losses:0,ties:0,elo:1200},
    {...entry,id:'c',wins:1,losses:1,ties:0,elo:1100},
  ]};
  const rows=rankedEntries(snapshot);
  assert.equal(rows[0].winRate,.625); assert.equal(rows[1].winRate,null);
  assert.deepEqual(rows.map(r=>r.rank),[1,1,3]);
  for(const dir of ['asc','desc']) assert.equal(selectEntries(snapshot,'','winRate',dir).at(-1).id,'b');
});
test('model and method snapshots stay separate with stable date and identities', () => {
  assert.equal(SNAPSHOTS.models.entries.length,6); assert.equal(SNAPSHOTS.methods.entries.length,2);
  assert.deepEqual(SNAPSHOTS.methods.entries.map(r=>r.id).sort(),['graph','llm']);
  assert.equal(new Set([...SNAPSHOTS.models.entries,...SNAPSHOTS.methods.entries].map(r=>r.id)).size,8);
  assert.equal(SNAPSHOTS.models.date,SNAPSHOTS.methods.date);
});
