const test = require('node:test');
const assert = require('node:assert/strict');
const createTodoApp = require('./todo.js');

test('tasks and completion states persist across fresh app instances', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value)
  };
  let app = createTodoApp(storage);
  const reload = expected => {
    app = createTodoApp(storage);
    assert.deepEqual(app.getTasks(), expected);
  };

  assert.equal(app.add(''), false);
  assert.equal(app.add(' \t\n '), false);
  reload([]);

  assert.equal(app.add(' First task '), true);
  reload([{ text: 'First task', completed: false }]);
  assert.equal(app.add('Second task'), true);
  reload([
    { text: 'First task', completed: false },
    { text: 'Second task', completed: false }
  ]);

  app.setCompleted(0, true);
  reload([
    { text: 'First task', completed: true },
    { text: 'Second task', completed: false }
  ]);
  app.setCompleted(0, false);
  reload([
    { text: 'First task', completed: false },
    { text: 'Second task', completed: false }
  ]);
  app.remove(1);
  reload([{ text: 'First task', completed: false }]);
});
