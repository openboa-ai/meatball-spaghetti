function createTodoApp(storage) {
  var key = 'todo.tasks';
  var tasks;
  try {
    tasks = JSON.parse(storage.getItem(key) || '[]');
    if (!Array.isArray(tasks)) tasks = [];
  } catch (error) {
    tasks = [];
  }

  function save() {
    storage.setItem(key, JSON.stringify(tasks));
  }

  return {
    getTasks: function () {
      return tasks.map(function (task) {
        return { text: task.text, completed: task.completed };
      });
    },
    getView: function (filter) {
      var incompleteCount = 0;
      var rows = [];
      tasks.forEach(function (task, index) {
        if (!task.completed) incompleteCount++;
        if (filter === 'active' && task.completed) return;
        if (filter === 'completed' && !task.completed) return;
        rows.push({ index: index, text: task.text, completed: task.completed });
      });
      return { rows: rows, incompleteCount: incompleteCount };
    },
    add: function (input) {
      var text = input.trim();
      if (!text) return false;
      tasks.push({ text: text, completed: false });
      save();
      return true;
    },
    setCompleted: function (index, completed) {
      if (!tasks[index]) return;
      tasks[index].completed = completed;
      save();
    },
    remove: function (index) {
      if (index < 0 || index >= tasks.length) return;
      tasks.splice(index, 1);
      save();
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = createTodoApp;
}
