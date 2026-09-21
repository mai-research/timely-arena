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
  compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { newSession, decodeHistory } = load('../src/lib/arena/history.ts');
const { fixtureAnswers } = load('../src/lib/arena/fixtures.ts');
const { POST } = load('../src/app/api/arena/route.ts');
const user = text => ({ id: 'u1', role: 'user', parts: [{ type: 'text', text }] });
const request = body => new Request('http://localhost/api/arena', { method: 'POST', body: JSON.stringify(body) });

test('independent sessions and both A/B assignments survive history restore', () => {
  const a = newSession('AKI', 0.1), b = newSession('AKI', 0.9);
  assert.notEqual(a.id, b.id);
  assert.deepEqual(a.methods, ['llm', 'graph']);
  assert.deepEqual(b.methods, ['graph', 'llm']);
  a.vote = 'both-good'; a.state = 'ready'; a.messages = [user('AKI')];
  const saved = decodeHistory(JSON.stringify([a,b]));
  assert.deepEqual(saved[0], a);
  assert.equal(saved[1].state, 'interrupted');
  assert.deepEqual(saved[1].methods, b.methods);
});
test('invalid history is rejected or filtered without trusting message structure', () => {
  assert.throws(() => decodeHistory('{broken'));
  assert.throws(() => decodeHistory('{}'));
  const s = newSession('AKI');
  s.messages = [{ id: 'bad', role: 'assistant', parts: [{type:'data-comparison', data:{ answers:null }}] }];
  assert.deepEqual(decodeHistory(JSON.stringify([s])), []);
});
test('fixed followups preserve both case identities and unsupported prompts are explicit', () => {
  assert.equal(fixtureAnswers('AKI', true).length, 2);
  const labs = fixtureAnswers('Compare the lab findings', false);
  assert.match(labs.find(a=>a.method==='llm').text, /3\.2/);
  assert.match(labs.find(a=>a.method==='graph').text, /2\.8/);
  for (const q of ['Explain the key clues','Make the cases shorter']) {
    assert.equal(fixtureAnswers(q,false).length,2);
    assert.doesNotMatch(fixtureAnswers(q,false)[0].text,/not connected/);
  }
  assert.match(fixtureAnswers('unrelated question',false)[0].text,/not connected/);
});
test('API validates empty, malformed, and oversized prompts', async () => {
  for (const body of [{}, {messages:[]}, {messages:[user('')]}, {messages:[user('x'.repeat(6001))]}]) {
    assert.equal((await POST(request(body))).status,400);
  }
});
test('AI SDK response streams partial pairs and finishes exactly one complete pair', async () => {
  const response = await POST(request({messages:[user('AKI')]}));
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/event-stream/);
  const events = (await response.text()).split('\n').filter(l=>l.startsWith('data: {')).map(l=>JSON.parse(l.slice(6)));
  const comparisons = events.filter(e=>e.type==='data-comparison');
  assert.ok(comparisons.length > 2);
  assert.equal(comparisons[0].data.complete,false);
  assert.equal(comparisons.at(-1).data.complete,true);
  assert.equal(comparisons.filter(e=>e.data.complete).length,1);
  assert.deepEqual(comparisons.at(-1).data.answers,fixtureAnswers('AKI',true));
  assert.equal(events.filter(e=>e.type==='start').length,1);
  assert.equal(events.filter(e=>e.type==='finish').length,1);
});
test('request cancellation does not claim a complete response', async () => {
  const controller = new AbortController();
  const req = new Request('http://localhost/api/arena', {method:'POST',body:JSON.stringify({messages:[user('AKI')]}),signal:controller.signal});
  controller.abort();
  assert.doesNotMatch(await (await POST(req)).text(), /"complete":true/);
});

test('failed AI SDK requests retry the saved question without duplicating it', async () => {
  const { Chat } = load('@ai-sdk/react');
  const { DefaultChatTransport } = load('ai');
  let offline = true;
  const chat = new Chat({ transport: new DefaultChatTransport({ api: 'http://localhost/api/arena', fetch: async (url, init) => {
    if (offline) throw new Error('offline');
    return POST(new Request(url, init));
  } }) });
  await chat.sendMessage({text:'AKI'});
  assert.equal(chat.status,'error');
  assert.equal(chat.messages.filter(m=>m.role==='user').length,1);
  offline = false;
  await chat.regenerate();
  assert.equal(chat.status,'ready');
  assert.equal(chat.messages.filter(m=>m.role==='user').length,1);
  assert.equal(chat.messages.at(-1).parts.find(p=>p.type==='data-comparison').data.complete,true);
});
test('stopping an AI SDK stream preserves the turn and retry finishes it', async () => {
  const { Chat } = load('@ai-sdk/react');
  const { DefaultChatTransport } = load('ai');
  const chat = new Chat({ transport: new DefaultChatTransport({ api: 'http://localhost/api/arena', fetch: (url,init) => POST(new Request(url,init)) }) });
  const sending = chat.sendMessage({text:'AKI'});
  await new Promise(resolve=>setTimeout(resolve,100));
  await chat.stop(); await sending;
  assert.equal(chat.messages.filter(m=>m.role==='user').length,1);
  assert.notEqual(chat.messages.at(-1).parts.find(p=>p.type==='data-comparison')?.data.complete,true);
  await chat.regenerate();
  assert.equal(chat.messages.filter(m=>m.role==='user').length,1);
  assert.equal(chat.messages.at(-1).parts.find(p=>p.type==='data-comparison').data.complete,true);
});
test('unavailable local storage still permits in-memory create, rename, and delete', () => {
  global.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const store = load('../src/components/arena/history-store.ts');
  store.initializeHistory();
  const id = store.createSession('AKI');
  const methods = store.findSession(id).methods;
  store.updateSession(id,{ title:'Renamed',vote:'a' });
  assert.equal(store.findSession(id).title,'Renamed');
  assert.deepEqual(store.findSession(id).methods,methods);
  store.deleteSession(id);
  assert.equal(store.findSession(id),undefined);
  delete global.localStorage;
});
