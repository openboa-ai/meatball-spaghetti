const test = require('node:test');
const assert = require('node:assert/strict');
const create = require('./pomodoro');
const minute = 60000;
function fixture(initial) {
  let data = initial || {}, time = new Date(2025, 2, 10, 12).getTime();
  const storage = { getItem: key => data[key] || null, setItem: (key, value) => { data[key] = value; } };
  return { storage, now: () => time, advance: ms => { time += ms; }, data };
}
function tick(app, f, ms) { f.advance(ms); app.tick(ms); }

test('presets and custom settings validate atomically', () => {
  const f = fixture(), app = create(f.storage, f.now);
  assert.equal(app.getState().durationMs, 25 * minute);
  for (const [id, value] of [['deep-work', 50], ['quick-sprint', 15], ['classic', 25]]) {
    assert.equal(app.setPreset(id), true); assert.equal(app.getState().durationMs, value * minute);
  }
  for (const value of [0, -1, 1.5, '2', Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.equal(app.setPreset('custom', { focusMinutes: value, shortBreakMinutes: 1, longBreakMinutes: 1 }), false);
  }
  assert.equal(app.setPreset('bogus'), false);
  assert.equal(app.getState().preset, 'classic');
  assert.equal(app.setPreset('custom', { focusMinutes: 2, shortBreakMinutes: 1, longBreakMinutes: 3 }), true);
  assert.deepEqual(app.getState(), { preset: 'custom', phase: 'focus', status: 'idle', remainingMs: 2 * minute, durationMs: 2 * minute });
});

test('controls, reset, exact boundaries and multi-phase ticks', () => {
  const f = fixture(), app = create(f.storage, f.now);
  app.setPreset('custom', { focusMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 2 });
  app.tick(minute); assert.equal(app.getState().remainingMs, minute);
  app.start(); tick(app, f, 1000); app.pause(); tick(app, f, minute);
  assert.equal(app.getState().remainingMs, minute - 1000);
  app.resume(); tick(app, f, minute - 1000);
  assert.equal(app.getState().phase, 'short-break'); assert.equal(app.getHistory().length, 1);
  tick(app, f, 2 * minute + 500);
  assert.equal(app.getState().phase, 'short-break'); assert.equal(app.getState().remainingMs, minute - 500);
  assert.equal(app.getHistory().length, 2);
  app.reset(); assert.equal(app.getState().remainingMs, minute); assert.equal(app.getState().status, 'idle');
});

test('skips do not count toward fourth focus and running continues', () => {
  const f = fixture(), app = create(f.storage, f.now);
  app.setPreset('custom', { focusMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 2 }); app.start();
  app.skipPhase(); assert.equal(app.getState().phase, 'short-break'); assert.equal(app.getState().status, 'running'); app.skipPhase();
  for (let i = 0; i < 4; i++) {
    tick(app, f, minute);
    assert.equal(app.getState().phase, i === 3 ? 'long-break' : 'short-break');
    if (i < 3) app.skipPhase();
  }
  assert.equal(app.getHistory().length, 4);
});

test('sessions persist with trimmed labels, distinct IDs and completion boundary', () => {
  const f = fixture(), app = create(f.storage, f.now);
  app.setPreset('custom', { focusMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 2 });
  app.setLabel('  Write  '); app.start(); tick(app, f, 90000);
  const session = app.getHistory()[0];
  assert.deepEqual(Object.keys(session).sort(), ['completedAt', 'durationMinutes', 'id', 'label', 'preset']);
  assert.equal(session.label, 'Write'); assert.equal(session.preset, 'custom'); assert.equal(session.durationMinutes, 1);
  assert.equal(session.completedAt, new Date(f.now() - 30000).toISOString());
  const reload = create(f.storage, f.now); assert.deepEqual(reload.getHistory(), [session]);
  reload.setPreset('custom', { focusMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 1 }); reload.start(); tick(reload, f, minute);
  assert.notEqual(reload.getHistory()[0].id, session.id);
  reload.clearHistory(); assert.deepEqual(create(f.storage, f.now).getHistory(), []);
});

test('corrupt and unavailable storage remain usable', () => {
  const f = fixture({ 'pomodoro.sessions': '{bad' }), app = create(f.storage, f.now);
  assert.deepEqual(app.getHistory(), []);
  const unavailable = create({ getItem() { throw Error(); }, setItem() { throw Error(); } }, f.now);
  unavailable.start(); tick(unavailable, f, 25 * minute); assert.equal(unavailable.getHistory().length, 1);
  unavailable.clearHistory(); assert.equal(unavailable.getHistory().length, 0);
});

test('local seven-day aggregation and streak from yesterday', () => {
  const f = fixture(), records = [0, 1, 2, 6, 8].map((days, i) => ({ id: String(i), label: '', preset: 'classic', durationMinutes: 10 + i, completedAt: new Date(2025, 2, 9 - days, 12).toISOString() }));
  f.storage.setItem('pomodoro.sessions', JSON.stringify(records));
  const stats = create(f.storage, f.now).getStats();
  assert.equal(stats.todayCount, 0); assert.equal(stats.todayMinutes, 0); assert.equal(stats.totalCount, 5); assert.equal(stats.totalMinutes, 60); assert.equal(stats.streakDays, 3);
  assert.equal(stats.byDay.length, 7); assert.deepEqual(stats.byDay[0], { date: '2025-03-04', count: 0, minutes: 0 });
  assert.deepEqual(stats.byDay[5], { date: '2025-03-09', count: 1, minutes: 10 });
  assert.deepEqual(stats.byDay[6], { date: '2025-03-10', count: 0, minutes: 0 });
});