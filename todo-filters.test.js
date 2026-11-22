const test = require('node:test');
const assert = require('node:assert/strict');
const createTodoApp = require('./todo.js');

test('filtered views update the intended saved tasks and global count', () => {
  const values = new Map([['todo.tasks', JSON.stringify([
    { text: 'Earlier completed', completed: true },
    { text: 'Active task', completed: false },
    { text: 'Later completed', completed: true }
  ])]]);
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value)
  };
  let app = createTodoApp(storage);
  const check = (filter, names, count) => {
    const view = app.getView(filter);
    assert.deepEqual(view.rows.map(row => row.text), names);
    assert.equal(view.incompleteCount, count);
    return view.rows;
  };

  check('all', ['Earlier completed', 'Active task', 'Later completed'], 1);
  check('active', ['Active task'], 1);
  check('completed', ['Earlier completed', 'Later completed'], 1);

  app.add('New task');
  check('completed', ['Earlier completed', 'Later completed'], 2);
  check('active', ['Active task', 'New task'], 2);

  app.setCompleted(check('active', ['Active task', 'New task'], 2)[0].index, true);
  check('active', ['New task'], 1);
  app.setCompleted(check('completed', ['Earlier completed', 'Active task', 'Later completed'], 1)[1].index, false);
  check('active', ['Active task', 'New task'], 2);
  app.remove(check('active', ['Active task', 'New task'], 2)[0].index);
  check('all', ['Earlier completed', 'Later completed', 'New task'], 1);
  app.setCompleted(check('active', ['New task'], 1)[0].index, true);
  check('active', [], 0);
  check('completed', ['Earlier completed', 'Later completed', 'New task'], 0);

  app = createTodoApp(storage);
  check('all', ['Earlier completed', 'Later completed', 'New task'], 0);
  assert.deepEqual(app.getTasks(), [
    { text: 'Earlier completed', completed: true },
    { text: 'Later completed', completed: true },
    { text: 'New task', completed: true }
  ]);
});
