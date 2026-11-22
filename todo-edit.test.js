const test = require('node:test');
const assert = require('node:assert/strict');
const createTodoApp = require('./todo.js');

test('renames filtered tasks without changing order, completion, membership or count', () => {
  const initial = [
    { text: 'Earlier completed', completed: true },
    { text: 'Active task', completed: false },
    { text: 'Later completed', completed: true }
  ];
  const values = new Map([['todo.tasks', JSON.stringify(initial)]]);
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value)
  };
  let app = createTodoApp(storage);
  const check = expected => {
    assert.deepEqual(app.getTasks(), expected);
    for (const filter of ['all', 'active', 'completed']) {
      const view = app.getView(filter);
      const matching = expected.filter(task => filter === 'all' || task.completed === (filter === 'completed'));
      assert.deepEqual(view.rows.map(({ text, completed }) => ({ text, completed })), matching);
      assert.equal(view.incompleteCount, 1);
    }
  };

  assert.equal(app.rename(app.getView('active').rows[0].index, '  Renamed active  '), true);
  const afterActive = [initial[0], { text: 'Renamed active', completed: false }, initial[2]];
  check(afterActive);
  app = createTodoApp(storage);
  check(afterActive);

  assert.equal(app.rename(app.getView('completed').rows[1].index, ' Renamed completed '), true);
  const afterCompleted = [initial[0], afterActive[1], { text: 'Renamed completed', completed: true }];
  check(afterCompleted);
  app = createTodoApp(storage);
  check(afterCompleted);

  for (const draft of ['', ' \t\n ']) {
    assert.equal(app.rename(app.getView('active').rows[0].index, draft), false);
    check(afterCompleted);
    app = createTodoApp(storage);
    check(afterCompleted);
  }
});
