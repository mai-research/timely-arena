import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const load = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, parent, ...rest) {
  if (name.startsWith('@/')) name = path.join(dirname, '../src', name.slice(2));
  return resolve.call(this, name, parent, ...rest);
};
load.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);

const { newSession, decodeHistory } = load('../src/lib/arena/history.ts');
const { readChatConfig, TRAJECTORY_FOLLOWUPS } = load('../src/lib/arena/types.ts');
const { trajectoryAnswers, trajectoryFollowup, fixtureTrajectory } = load('../src/lib/arena/trajectory-fixtures.ts');
const { STAGES, READING_FIELDS, PATIENT_PROFILES, validTrajectory, trajectoryText, formatReading } = load('../src/lib/arena/trajectory.ts');
const { POST } = load('../src/app/api/arena/route.ts');
const graph = load('../src/lib/admin/snapshots/synthetic-demo.json');
const configs = [
  { kind:'trajectory', patientMode:'shared', sharedPatientId:'patient-71f' },
  { kind:'trajectory', patientMode:'shared', sharedPatientId:'patient-68m' },
  { kind:'trajectory', patientMode:'paired' },
];
const user = (text = 'Create trajectories', id = 'u1') => ({ id, role:'user', parts:[{ type:'text', text }] });
const assistant = (answers, complete = true) => ({ id:'a1', role:'assistant', parts:[{ type:'data-comparison', data:{ answers, complete } }] });
const request = (config, messages = [user()], signal) => new Request('http://localhost/api/arena', { method:'POST', body:JSON.stringify({ ...config, messages }), signal });
const events = async response => (await response.text()).split('\n').filter(l => l.startsWith('data: {')).map(l => JSON.parse(l.slice(6)));

test('shared courses preserve canonical backgrounds but have independent readings and time courses', () => {
  for (const config of configs.slice(0,2)) {
    const [a,b] = trajectoryAnswers(config);
    assert.deepEqual(a.trajectory.profile, b.trajectory.profile);
    assert.deepEqual(a.trajectory.profile, PATIENT_PROFILES[config.sharedPatientId]);
    assert.notDeepEqual(a.trajectory.stages.map(s=>s.readings), b.trajectory.stages.map(s=>s.readings));
    assert.notDeepEqual(a.trajectory.stages.map(s=>s.offsetHours), b.trajectory.stages.map(s=>s.offsetHours));
  }
  const paired = trajectoryAnswers(configs[2]);
  assert.equal(paired.find(a=>a.method==='llm').trajectory.profile.id,'patient-68m');
  assert.equal(paired.find(a=>a.method==='graph').trajectory.profile.id,'patient-71f');
  assert.equal(paired[0].trajectory.stages[2].readings.creatinine,3.2);
  assert.equal(paired[1].trajectory.stages[2].readings.creatinine,2.8);
});

test('courses use five ordered phases, consistent units and explicit missing observations', () => {
  for (const config of configs) for (const { trajectory:t, text } of trajectoryAnswers(config)) {
    assert.equal(validTrajectory(t,true),true);
    assert.deepEqual(t.stages.map(s=>s.id),STAGES.map(s=>s.id));
    assert.equal(t.stages[2].offsetHours,0);
    assert.ok(t.stages[0].offsetHours < t.stages[1].offsetHours);
    assert.ok(t.stages[3].offsetHours >= 24);
    assert.ok(t.stages[4].offsetHours > t.stages[3].offsetHours);
    const [baseline,,arrival,review,recovery] = t.stages.map(s=>s.readings);
    assert.ok(arrival.creatinine >= 1.5 * baseline.creatinine);
    assert.ok(arrival.creatinine > review.creatinine && review.creatinine > recovery.creatinine);
    assert.ok(arrival.urineOutput < review.urineOutput && review.urineOutput < recovery.urineOutput);
    assert.ok(recovery.creatinine - baseline.creatinine < 0.3);
    assert.equal(baseline.urineOutput,null);
    assert.equal(text,trajectoryText(t));
    assert.match(text,/Not recorded/);
    assert.doesNotMatch(text,/mL\/kg|Stage [123]|dialysis required/i);
    for (const s of t.stages) for (const f of READING_FIELDS) assert.ok(f.key in s.readings);
    assert.equal(READING_FIELDS.find(f=>f.key==='urineOutput').unit,'mL/24 h');
    assert.equal(formatReading('creatinine',1),'1.0');
  }
});

test('provenance resolves to the pinned graph and uses only project-authored synthetic evidence', () => {
  const nodes = new Map(graph.nodes.map(n=>[n.id,n]));
  const edges = new Map(graph.edges.map(e=>[e.id,e]));
  for (const config of configs) for (const { trajectory:t } of trajectoryAnswers(config)) {
    assert.equal(t.provenance.kind,'authored-synthetic');
    assert.equal(t.provenance.graphVersion,graph.version);
    for (const id of t.provenance.nodeIds) assert.ok(nodes.has(id),id);
    for (const id of t.provenance.edgeIds) {
      assert.ok(edges.has(id),id);
      assert.ok(['demo_source'].includes(edges.get(id).source_id),id);
    }
    for (const name of ['Serum creatinine','Urine output','Potassium','Sodium','Bicarbonate']) {
      assert.ok(t.provenance.nodeIds.some(id=>nodes.get(id).name===name),name);
    }
  }
});

test('fixtures are deterministic and independent of caller mutation; follow-ups reuse their observations', () => {
  for (const config of configs) {
    const saved = trajectoryAnswers(config);
    const altered = trajectoryAnswers(config);
    altered[0].trajectory.profile.medications.push('changed');
    altered[0].trajectory.stages[2].readings.creatinine = 999;
    assert.deepEqual(trajectoryAnswers(config),saved);
    for (const q of TRAJECTORY_FOLLOWUPS) {
      const reply = trajectoryFollowup(q,config);
      assert.equal(reply.length,2);
      for (const a of reply) {
        assert.equal(a.trajectory,undefined);
        const t=saved.find(s=>s.method===a.method).trajectory;
        assert.match(a.text,new RegExp(String(t.profile.age)));
        assert.ok(a.text.includes(formatReading('creatinine',t.stages[2].readings.creatinine)));
      }
    }
    assert.match(trajectoryFollowup('Prescribe treatment',config)[0].text,/not connected/);
    assert.deepEqual(trajectoryAnswers(config),saved);
  }
});

test('both A/B assignments, all patient configurations, votes and interrupted prefixes restore', () => {
  for (const config of configs) for (const random of [0.1,0.9]) {
    const s = newSession('Create trajectories',random,config);
    const answers = trajectoryAnswers(config);
    s.messages=[user(),assistant(answers)]; s.state='ready'; s.vote='both-good';
    assert.deepEqual(decodeHistory(JSON.stringify([s])),[s]);
    assert.deepEqual(s.methods,random<0.5?['llm','graph']:['graph','llm']);
    const partial = answers.map(a=>{
      const trajectory={ ...a.trajectory, stages:a.trajectory.stages.slice(0,2) };
      return { method:a.method, trajectory, text:trajectoryText(trajectory) };
    });
    s.messages=[user(),assistant(partial,false)]; s.state='interrupted'; delete s.vote;
    assert.deepEqual(decodeHistory(JSON.stringify([s])),[s]);
  }
  const legacy=newSession('AKI'); delete legacy.kind;
  const restored=decodeHistory(JSON.stringify([legacy]))[0];
  assert.equal(restored.kind,'text'); assert.equal(restored.state,'interrupted');
});

test('history rejects malformed stages, readings, pair identity and falsely completed prefixes', () => {
  const mutations = [
    a => { a.trajectory.stages[0].readings.bloodPressure='120/80'; },
    a => { a.trajectory.stages[1].offsetHours=-1000; },
    a => { a.trajectory.stages[1].id='baseline'; },
    a => { a.trajectory.stages[2].readings.potassium=-1; },
    a => { a.trajectory.stages.pop(); },
    a => { a.trajectory.profile.medications=['different background']; },
    a => { a.trajectory=fixtureTrajectory('patient-68m','llm'); },
    a => { delete a.trajectory; },
  ];
  for (const mutate of mutations) {
    const s=newSession('Create trajectories',0.1,configs[0]);
    const answers=trajectoryAnswers(configs[0]); mutate(answers[0]);
    s.messages=[user(),assistant(answers)]; s.state='ready';
    assert.deepEqual(decodeHistory(JSON.stringify([s])),[]);
  }
  const t=fixtureTrajectory('patient-71f','graph');
  t.stages[2].readings.creatinine=NaN;
  assert.equal(validTrajectory(t,true),false);
  const missing = newSession('Create trajectories',0.1,configs[0]);
  missing.messages=[user(),assistant(trajectoryAnswers(configs[0]).map(({method,text})=>({method,text})))];
  assert.deepEqual(decodeHistory(JSON.stringify([missing])),[]);
});

test('browser-local updates keep chat configuration and method assignments immutable', () => {
  global.localStorage={ getItem:()=>null, setItem:()=>{} };
  const store=load('../src/components/arena/history-store.ts'); store.initializeHistory();
  const id=store.createSession('Create trajectories',configs[0]);
  const methods=store.findSession(id).methods;
  store.updateSession(id,{ title:'Renamed trajectory',kind:'text',patientMode:'paired',sharedPatientId:'patient-68m',methods:['graph','llm'] });
  const current=store.findSession(id);
  assert.deepEqual(readChatConfig(current),configs[0]);
  assert.deepEqual(current.methods,methods); assert.equal(current.title,'Renamed trajectory');
  delete global.localStorage;
});

test('API validates configurations and retains the legacy text request default', async () => {
  assert.deepEqual(readChatConfig({}),{kind:'text'});
  for (const config of [{kind:'unknown'},{kind:'trajectory'},{kind:'trajectory',patientMode:'shared'},
    {kind:'trajectory',patientMode:'shared',sharedPatientId:'foreign-patient'},
    {kind:'trajectory',patientMode:'paired',sharedPatientId:'patient-71f'}, {kind:'text',patientMode:'shared'}]) {
    assert.equal((await POST(request(config))).status,400);
  }
});

test('API streams equal complete-stage prefixes and exactly one completed trajectory pair', async () => {
  for (const config of configs) {
    const response=await POST(request(config));
    assert.equal(response.status,200);
    const chunks=await events(response);
    const comparisons=chunks.filter(e=>e.type==='data-comparison');
    assert.deepEqual(comparisons.map(c=>c.data.answers[0].trajectory.stages.length),[0,1,2,3,4,5]);
    for (const {data} of comparisons) {
      assert.equal(data.answers[0].trajectory.stages.length,data.answers[1].trajectory.stages.length);
      for (const a of data.answers) {
        assert.equal(validTrajectory(a.trajectory,data.complete),true);
        assert.equal(a.text,trajectoryText(a.trajectory));
      }
    }
    assert.equal(comparisons.filter(c=>c.data.complete).length,1);
    assert.deepEqual(comparisons.at(-1).data.answers,trajectoryAnswers(config));
    assert.equal(chunks.filter(e=>e.type==='start').length,1);
    assert.equal(chunks.filter(e=>e.type==='finish').length,1);
  }
});

test('transport preserves shared profile through stop, regeneration and follow-up', async () => {
  const { Chat }=load('@ai-sdk/react');
  const { DefaultChatTransport }=load('ai');
  const config=configs[1]; const bodies=[];
  const chat=new Chat({ transport:new DefaultChatTransport({ api:'http://localhost/api/arena',body:config,fetch:async (url,init)=>{
    bodies.push(JSON.parse(init.body));
    return POST(new Request(url,init));
  } }) });
  const sending=chat.sendMessage({text:'Create trajectories'});
  await new Promise(resolve=>setTimeout(resolve,300));
  await chat.stop(); await sending;
  assert.equal(chat.messages.filter(m=>m.role==='user').length,1);
  assert.notEqual(chat.messages.at(-1).parts.find(p=>p.type==='data-comparison')?.data.complete,true);
  await chat.regenerate();
  assert.equal(chat.messages.filter(m=>m.role==='user').length,1);
  const first=chat.messages.at(-1).parts.find(p=>p.type==='data-comparison').data;
  assert.equal(first.complete,true);
  assert.deepEqual(first.answers,trajectoryAnswers(config));
  await chat.sendMessage({text:TRAJECTORY_FOLLOWUPS[2]});
  const followup=chat.messages.at(-1).parts.find(p=>p.type==='data-comparison').data;
  assert.deepEqual(followup.answers,trajectoryFollowup(TRAJECTORY_FOLLOWUPS[2],config));
  for (const body of bodies) assert.deepEqual(readChatConfig(body),config);
  assert.deepEqual(first.answers,trajectoryAnswers(config));
});

test('a cancelled trajectory request never emits a completed pair', async () => {
  const controller=new AbortController(); controller.abort();
  const response=await POST(request(configs[0],[user()],controller.signal));
  assert.doesNotMatch(await response.text(),/"complete":true/);
});
