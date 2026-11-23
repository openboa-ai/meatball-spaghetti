function createPomodoroApp(storage, now) {
  var key = 'pomodoro.sessions';
  var presets = {
    classic: [25, 5, 15],
    'deep-work': [50, 10, 20],
    'quick-sprint': [15, 3, 10]
  };
  var clock = typeof now === 'function' ? now : Date.now;
  var history = [];
  try {
    var saved = JSON.parse(storage.getItem(key) || '[]');
    if (Array.isArray(saved)) history = saved.filter(function (item) {
      return item && typeof item.id === 'string' && typeof item.completedAt === 'string' &&
        !isNaN(new Date(item.completedAt).getTime()) && Number.isFinite(item.durationMinutes) && item.durationMinutes > 0;
    });
  } catch (error) { /* Unavailable or corrupt storage starts empty. */ }
  var preset = 'classic', minutes = presets.classic.slice(), phase = 'focus';
  var status = 'idle', durationMs = minutes[0] * 60000, remainingMs = durationMs;
  var label = '', completedFocuses = 0, sequence = 0;
  var instanceId = Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);

  function save() {
    try { storage.setItem(key, JSON.stringify(history)); } catch (error) { /* Keep in-memory history. */ }
  }
  function setPhase(next) {
    phase = next;
    durationMs = minutes[next === 'focus' ? 0 : next === 'short-break' ? 1 : 2] * 60000;
    remainingMs = durationMs;
  }
  function advance(completed, boundary) {
    if (phase === 'focus') {
      if (completed) {
        completedFocuses++;
        var id;
        do { id = instanceId + '-' + (++sequence); } while (history.some(function (item) { return item.id === id; }));
        history.push({ id: id, label: label.trim(), preset: preset, durationMinutes: minutes[0], completedAt: new Date(boundary).toISOString() });
        save();
      }
      setPhase(completed && completedFocuses % 4 === 0 ? 'long-break' : 'short-break');
    } else setPhase('focus');
  }
  function dateKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function offsetDate(date, offset) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
  }
  return {
    start: function () { if (status === 'idle') status = 'running'; },
    pause: function () { if (status === 'running') status = 'paused'; },
    resume: function () { if (status === 'paused') status = 'running'; },
    reset: function () { remainingMs = durationMs; status = 'idle'; },
    skipPhase: function () { advance(false); },
    tick: function (elapsedMs) {
      if (status !== 'running' || typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
      var boundary = clock() - elapsedMs;
      while (elapsedMs >= remainingMs) {
        elapsedMs -= remainingMs;
        boundary += remainingMs;
        advance(true, boundary);
      }
      remainingMs -= elapsedMs;
    },
    setLabel: function (text) { label = typeof text === 'string' ? text : ''; },
    setPreset: function (id, custom) {
      var values;
      if (id === 'custom') {
        if (!custom || typeof custom !== 'object') return false;
        values = [custom.focusMinutes, custom.shortBreakMinutes, custom.longBreakMinutes];
      } else if (Object.prototype.hasOwnProperty.call(presets, id)) values = presets[id];
      else return false;
      if (!values.every(function (value) { return Number.isSafeInteger(value) && value > 0 && Number.isSafeInteger(value * 60000); })) return false;
      preset = id; minutes = values.slice(); completedFocuses = 0; status = 'idle'; setPhase('focus');
      return true;
    },
    getState: function () { return { preset: preset, phase: phase, status: status, remainingMs: remainingMs, durationMs: durationMs }; },
    getHistory: function () { return history.slice().reverse().map(function (item) { return Object.assign({}, item); }); },
    getStats: function () {
      var today = new Date(clock()), grouped = {}, totalMinutes = 0;
      history.forEach(function (item) {
        var date = dateKey(new Date(item.completedAt));
        if (!grouped[date]) grouped[date] = { count: 0, minutes: 0 };
        grouped[date].count++; grouped[date].minutes += item.durationMinutes; totalMinutes += item.durationMinutes;
      });
      var byDay = [];
      for (var i = -6; i <= 0; i++) {
        var date = dateKey(offsetDate(today, i)), group = grouped[date] || { count: 0, minutes: 0 };
        byDay.push({ date: date, count: group.count, minutes: group.minutes });
      }
      var streak = 0, offset = grouped[dateKey(today)] ? 0 : -1;
      while (grouped[dateKey(offsetDate(today, offset))]) { streak++; offset--; }
      var current = grouped[dateKey(today)] || { count: 0, minutes: 0 };
      return { todayCount: current.count, todayMinutes: current.minutes, totalCount: history.length, totalMinutes: totalMinutes, streakDays: streak, byDay: byDay };
    },
    clearHistory: function () { history = []; save(); }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = createPomodoroApp;
if (typeof window !== 'undefined') window.createPomodoroApp = createPomodoroApp;