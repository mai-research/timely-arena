import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';

const load = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, parent, ...rest) {
  if (name.startsWith('@/')) name = path.join(dirname, '../src', name.slice(2));
  return resolve.call(this, name, parent, ...rest);
};
for (const extension of ['.ts', '.tsx']) load.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, filename);

const { PromptInput } = load('../src/components/agentui/prompt-input.tsx');
const { Select } = load('../src/components/agentui/select.tsx');
const { Answer } = load('../src/components/arena/answer.tsx');
const noop = () => {};
const button = (html, label) => {
  const tag = html.match(/<button\b[^>]*>/g)?.find(tag => tag.includes(`aria-label="${label}"`));
  assert.ok(tag, `Missing ${label} button`);
  return tag;
};

test('an unconfigured preset keeps patient choices usable while preventing submission', () => {
  const html = render(h(PromptInput, { value: 'Fixed clinical example', readOnly: true, submitDisabled: true, onSubmit: noop, sendLabel: 'Start comparison',
    leadingAction: h(Select, { label: 'Patient setup', value: null, onValueChange: noop, options: [{ value: 'shared', label: 'Same patient' }] }),
  }));
  const textarea = html.match(/<textarea\b[^>]*>/)[0];
  assert.match(textarea, /readOnly=""/);
  assert.doesNotMatch(textarea, /disabled/);
  assert.match(button(html, 'Start comparison'), /disabled=""/);
  assert.doesNotMatch(button(html, 'Patient setup'), /disabled/);
});

test('an active response always offers Stop even with an empty, disabled draft', () => {
  const html = render(h(PromptInput, { value: '', onSubmit: noop, loading: true, disabled: true, onStop: noop }));
  assert.match(button(html, 'Stop response'), /type="button"/);
  assert.doesNotMatch(button(html, 'Stop response'), /disabled/);
  assert.doesNotMatch(html, /aria-label="Send follow-up"/);
  const idle = render(h(PromptInput, { value: '   ', onSubmit: noop }));
  assert.match(button(idle, 'Send follow-up'), /disabled=""/);
});

test('chat answer loading follows the request while partial content remains expandable', () => {
  const partial = render(h(Answer, { label: 'Assistant A', text: 'Creatinine 2.8 mg/dL', loading: true, appearance: 'chat' }));
  assert.match(partial, /Creatinine 2.8 mg\/dL/);
  assert.match(partial, /Loading clinical example/);
  assert.match(button(partial, 'Copy Assistant A'), /disabled=""/);
  assert.doesNotMatch(button(partial, 'Expand Assistant A'), /disabled/);
  const interrupted = render(h(Answer, { label: 'Assistant A', text: '', loading: false, appearance: 'chat' }));
  assert.match(interrupted, /No content received/);
  assert.doesNotMatch(interrupted, /Loading clinical example/);
});

test('shared Answer retains its existing default appearance and admin content slot', () => {
  const html = render(h(Answer, { label: 'Candidate A', text: 'Saved output', loading: false, beforeContent: h('p', null, 'Historical trace') }));
  assert.match(html, /class="answer-card"/);
  assert.match(html, /Historical trace/);
  assert.match(html, /Saved output/);
  assert.doesNotMatch(html, /class="agent-message/);
});

const { ToolMessages, ExecutionMessages } = load('../src/components/admin/execution-messages.tsx');
test('mock tool cells preserve failed and recovered calls with separate identities and accessible disclosures', () => {
  const calls = [
    {id:'attempt',name:'graph.query',status:'failed',input:{node:'aki'},error:'Timed out',durationMs:2000},
    {id:'retry',name:'graph.query',status:'completed',input:{node:'aki'},output:{nodes:['aki']},durationMs:42},
  ];
  const before=JSON.stringify(calls), html=render(h(ToolMessages,{calls}));
  assert.equal((html.match(/<details/g)||[]).length,2);
  assert.doesNotMatch(html, /<details[^>]* open/);
  for(const text of ['Mock call · attempt','Mock call · retry','Timed out','2000 ms','42 ms','graph.query parameters','graph.query result','graph.query error']) assert.ok(html.includes(text),text);
  assert.equal(JSON.stringify(calls),before);
});
test('execution cells distinguish missing traces from recorded executions without tools', () => {
  const props={steps:[],expanded:false,onExpandedChange:noop,onSelect:noop,onNode:noop};
  assert.match(render(h(ExecutionMessages,{...props,recorded:false})),/Tool usage not recorded/);
  assert.match(render(h(ExecutionMessages,{...props,recorded:true})),/No tool calls recorded/);
  const step={id:'step-fixture',label:'Inspect measurements',status:'completed',summary:'Authored fixture summary',queriedNodeIds:[],returnedNodeIds:[],tools:[{id:'call',name:'read.measurements',status:'interrupted',input:{}}]};
  const collapsed=render(h(ExecutionMessages,{...props,steps:[step]}));
  assert.match(collapsed,/read.measurements/); assert.doesNotMatch(collapsed,/Authored fixture summary/);
  const expanded=render(h(ExecutionMessages,{...props,steps:[step],expanded:true}));
  assert.match(expanded,/id="step-fixture"/); assert.match(expanded,/Authored fixture summary/); assert.match(expanded,/Not recorded/);
});
