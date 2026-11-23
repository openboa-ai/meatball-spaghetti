const test = require('node:test');
const assert = require('node:assert/strict');
const createTodoApp = require('./todo.js');

function storageWith(tasks) {
  const values = new Map([['todo.tasks', JSON.stringify(tasks)]]);
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value)
  };
}

test('clearCompleted removes completed tasks, preserves active order, and persists', () => {
  const active = [
    { text: 'First active', completed: false },
    { text: 'Second active', completed: false }
  ];
  const storage = storageWith([
    { text: 'First completed', completed: true },
    active[0],
    { text: 'Second completed', completed: true },
    active[1]
  ]);
  const app = createTodoApp(storage);

  assert.equal(app.clearCompleted(), 2);
  assert.deepEqual(app.getTasks(), active);
  assert.deepEqual(createTodoApp(storage).getTasks(), active);
});

test('clearCompleted returns zero when no tasks are completed', () => {
  const active = [{ text: 'Active', completed: false }];
  const storage = storageWith(active);
  const app = createTodoApp(storage);

  assert.equal(app.clearCompleted(), 0);
  assert.deepEqual(app.getTasks(), active);
  assert.deepEqual(createTodoApp(storage).getTasks(), active);
  assert.equal(createTodoApp(storageWith([])).clearCompleted(), 0);
});