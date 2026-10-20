/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => mocks[name] || require(name), Date, FormData, URLSearchParams, setInterval, clearInterval, ...globals });
  return exports;
}
const client = load('lib/api/client.ts');

test('Retry-After accepts bounded integer seconds, prefers headers and rejects malformed values', () => {
  for (const [header, body, expected] of [['900', 60, 900], [null, 60, 60], ['invalid', 60, 60], ['0', 60, 0], ['999999', null, 3600], [' 15 ', null, 15]]) {
    assert.equal(client.parseRetryAfter(header, body), expected);
  }
  for (const value of ['', ' ', '-1', '1.5', '1e3', 'Infinity', 'NaN', 'Mon, 01 Jan 2030 00:00:00 GMT', Number.MAX_VALUE, {}, true, null]) {
    assert.equal(client.parseRetryAfter(value, value), undefined);
  }
});

test('API preserves error details with validated header/body cooldown only on 429', async () => {
  for (const [status, header, body, expected] of [[429, '900', 60, 900], [429, null, 60, 60], [429, 'bad', 'bad', undefined], [422, '900', 60, undefined]]) {
    const api = load('lib/api/client.ts', {}, { fetch: async () => Response.json({ message: 'Original error', errors: { username: ['Keep this'] }, retry_after: body }, { status, headers: header === null ? {} : { 'Retry-After': header } }) });
    await assert.rejects(api.apiClient.post('/auth/login', { username: 'example', password: 'retained' }), error => {
      assert.equal(error.message, 'Original error');
      assert.equal(error.errors.username[0], 'Keep this');
      assert.equal(error.status, status);
      assert.equal(error.retryAfter, expected);
      return true;
    });
  }
});

function harness() {
  let cursor = 0, now = 1000;
  const slots = [], pending = [], timers = new Set();
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useEffect(fn, deps) { const i = cursor++; const old = slots[i]; if (!old || deps.some((v, j) => v !== old.deps[j])) { old?.cleanup?.(); slots[i] = { deps }; pending.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const globals = { Date: class extends Date { static now() { return now; } }, setInterval(fn) { timers.add(fn); return fn; }, clearInterval(fn) { timers.delete(fn); } };
  const hook = load('hooks/use-retry-cooldown.ts', { react, '@/lib/api/client': client }, globals);
  return { react, hook, globals, timers, render(fn) { cursor = 0; const result = fn(); while (pending.length) pending.shift()(); return result; }, advance(ms) { now += ms; for (const fn of [...timers]) fn(); }, unmount() { for (const slot of slots) slot?.cleanup?.(); } };
}

test('cooldown uses elapsed time, blocks immediately, never retries, and cleans up timers', () => {
  const h = harness();
  let state = h.render(h.hook.useRetryCooldown);
  state.start(new client.ApiError('Wait', 429, undefined, 60));
  assert.equal(state.isCoolingDown(), true);
  state = h.render(h.hook.useRetryCooldown);
  assert.equal(state.seconds, 60);
  assert.equal(h.timers.size, 1);
  h.advance(59001); state = h.render(h.hook.useRetryCooldown);
  assert.equal(state.seconds, 1);
  h.advance(2000); state = h.render(h.hook.useRetryCooldown);
  assert.equal(state.seconds, 0); assert.equal(state.isCoolingDown(), false); assert.equal(h.timers.size, 0);
  state.start(new client.ApiError('Wait', 429, undefined, 30)); h.render(h.hook.useRetryCooldown);
  h.unmount(); assert.equal(h.timers.size, 0);
});

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}

test('login preserves entries and blocks repeated submit until cooldown expires without auto retry', async () => {
  const h = harness();
  let calls = 0;
  const login = async () => { calls++; throw new client.ApiError('Too many attempts.', 429, undefined, 60); };
  const component = load('app/(auth)/login/page.tsx', {
    react: h.react, 'next/link': { default: 'Link' }, 'next/navigation': { useRouter: () => ({ replace() {} }) },
    'lucide-react': {}, sonner: { toast: {} }, '@/hooks/use-auth': { useAuth: () => ({ login }) },
    '@/lib/api': client, '@/hooks/use-retry-cooldown': h.hook,
    '@/components/portal/design': { AuthShell: 'AuthShell', PasswordInput: 'PasswordInput', PortalStatus: 'PortalStatus' },
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/input': { Input: 'Input' }, '@/components/ui/label': { Label: 'Label' },
  }, h.globals).default;
  let tree = h.render(component);
  nodes(tree).find(n => n.props?.id === 'username').props.onChange({ target: { value: 'm.example' } });
  nodes(tree).find(n => n.props?.id === 'password').props.onChange({ target: { value: 'Kept-secret123' } });
  tree = h.render(component);
  const submit = nodes(tree).find(n => n.type === 'form').props.onSubmit;
  await submit({ preventDefault() {} }); await submit({ preventDefault() {} });
  tree = h.render(component);
  assert.equal(calls, 1);
  assert.equal(nodes(tree).find(n => n.props?.id === 'password').props.value, 'Kept-secret123');
  assert.equal(nodes(tree).find(n => n.props?.type === 'submit').props.disabled, true);
  assert.equal(nodes(tree).find(n => n.props?.role === 'timer').props['aria-live'], 'off');
  h.advance(61000); tree = h.render(component);
  assert.equal(calls, 1); assert.equal(nodes(tree).find(n => n.props?.type === 'submit').props.disabled, false);
  await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(calls, 2); h.unmount();
});

test('registration form keeps details and blocks duplicate requests until the deadline', async () => {
  const h = harness(); let calls = 0;
  // Loading reference choices is unrelated to this submit-state test.
  const react = { ...h.react, useEffect() {} };
  const Form = load('components/portal/employee-form.tsx', {
    react, 'date-fns': { format: () => '2026-10-15' }, 'lucide-react': {},
    '@/hooks/use-retry-cooldown': h.hook, '@/lib/api': client,
    '@/lib/api/psgc': { psgcApi: {} },
    '@/components/portal/design': { PortalStatus: 'PortalStatus' }, '@/components/portal/selection': {},
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/input': { Input: 'Input' },
    '@/components/ui/label': { Label: 'Label' }, '@/components/ui/textarea': { Textarea: 'Textarea' },
  }, h.globals).EmployeeForm;
  const props = { registration: true, submitLabel: 'Create account', initial: { first_name: 'Test', last_name: 'Example', birthday: '1990-01-01', nationality: 'Filipino', email: 'local@example.test', region: 'Test Region', province: 'Test Province', city: 'Test City', barangay: 'Test Barangay' }, onSave: async values => { assert.equal(values.email, 'local@example.test'); calls++; throw new client.ApiError('Too many attempts.', 429, undefined, 60); } };
  let tree = h.render(() => Form(props));
  await tree.props.onSubmit({ preventDefault() {} }); await tree.props.onSubmit({ preventDefault() {} });
  tree = h.render(() => Form(props));
  assert.equal(calls, 1);
  assert.equal(nodes(tree).find(n => n.props?.id === 'email').props.value, 'local@example.test');
  assert.equal(nodes(tree).find(n => n.props?.type === 'submit').props.disabled, true);
  h.advance(61000); tree = h.render(() => Form(props));
  assert.equal(calls, 1); assert.equal(nodes(tree).find(n => n.props?.type === 'submit').props.disabled, false);
  await tree.props.onSubmit({ preventDefault() {} }); assert.equal(calls, 2); h.unmount();
});

test('personal details format on blur and submit without changing other inputs', async () => {
  const h = harness();
  const Form = load('components/portal/employee-form.tsx', {
    react: { ...h.react, useEffect() {} }, 'date-fns': { format: () => '2026-10-20' }, 'lucide-react': {},
    '@/hooks/use-retry-cooldown': h.hook, '@/lib/api': client, '@/lib/api/psgc': { psgcApi: {} },
    '@/components/portal/design': { PortalStatus: 'PortalStatus' }, '@/components/portal/selection': {},
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/input': { Input: 'Input' },
    '@/components/ui/label': { Label: 'Label' }, '@/components/ui/textarea': { Textarea: 'Textarea' },
  }, h.globals).EmployeeForm;
  let saved;
  const props = { registration: true, submitLabel: 'Create account', initial: {
    first_name: 'OLD', middle_name: 'DELA CRUZ', last_name: "O’NEILL", birthday: '1990-01-01',
    nationality: 'FILIPINO', email: 'PERSONAL@example.test', suffix: 'III',
    region: 'REGION X', province: 'BUKIDNON', city: 'QUEZON', barangay: 'POBLACION', residence: 'BLK ABC ROAD',
  }, onSave: async values => { saved = values; } };
  let tree = h.render(() => Form(props));
  const field = nodes(tree).find(n => n.props?.id === 'first_name');
  const input = nodes(field.type(field.props)).find(n => n.type === 'Input');
  input.props.onChange({ target: { value: '  MARÍA   ANA-MAY ' } });
  tree = h.render(() => Form(props));
  assert.equal(nodes(tree).find(n => n.props?.id === 'first_name').props.value, '  MARÍA   ANA-MAY ');
  input.props.onBlur({ target: { value: '  MARÍA   ANA-MAY ' } });
  tree = h.render(() => Form(props));
  assert.equal(nodes(tree).find(n => n.props?.id === 'first_name').props.value, 'María Ana-May');
  for (const id of ['email', 'suffix', 'house_number']) {
    const field = nodes(tree).find(n => n.props?.id === id);
    assert.equal(nodes(field.type(field.props)).find(n => n.type === 'Input').props.onBlur, undefined);
  }
  await tree.props.onSubmit({ preventDefault() {} });
  assert.equal(saved.first_name, 'María Ana-May');
  assert.equal(saved.middle_name, 'Dela Cruz');
  assert.equal(saved.last_name, 'O’Neill');
  assert.equal(saved.nationality, 'Filipino');
  assert.equal(saved.email, 'PERSONAL@example.test');
  assert.equal(saved.suffix, 'III');
  assert.equal(saved.region, 'REGION X');
  assert.equal(saved.residence, 'BLK ABC ROAD');
  h.unmount();
});
