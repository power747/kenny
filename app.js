'use strict';

const STORAGE_KEY = 'todo-app.v1';
const FILTER_KEY = 'todo-app.filter';

const els = {
  today: document.getElementById('today'),
  form: document.getElementById('new-todo-form'),
  title: document.getElementById('new-todo-title'),
  due: document.getElementById('new-todo-due'),
  toggleAll: document.getElementById('toggle-all'),
  filters: document.querySelectorAll('[data-filter]'),
  list: document.getElementById('todo-list'),
  empty: document.getElementById('empty'),
  count: document.getElementById('count'),
  clearCompleted: document.getElementById('clear-completed'),
  template: document.getElementById('todo-item-template'),
};

let todos = load();
let filter = loadFilter();

// ---- storage ----

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 메모리에만 유지
  }
}

function loadFilter() {
  try {
    const value = localStorage.getItem(FILTER_KEY);
    return ['all', 'active', 'completed'].includes(value) ? value : 'all';
  } catch {
    return 'all';
  }
}

function saveFilter() {
  try {
    localStorage.setItem(FILTER_KEY, filter);
  } catch {}
}

// ---- dates ----

function localISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function describeDue(due) {
  const today = localISODate();
  const [y, m, d] = due.split('-').map(Number);
  const label = `${m}월 ${d}일`;
  if (due < today) return { text: `${label} · 기한 지남`, state: 'overdue' };
  if (due === today) return { text: '오늘까지', state: 'today' };
  const now = new Date();
  const tomorrow = localISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  if (due === tomorrow) return { text: '내일까지', state: '' };
  const yearPrefix = y !== new Date().getFullYear() ? `${y}년 ` : '';
  return { text: `${yearPrefix}${label}까지`, state: '' };
}

// ---- state changes ----

function update(fn) {
  fn();
  save();
  render();
}

function addTodo(title, due) {
  update(() => {
    todos.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      title,
      due: due || null,
      completed: false,
      createdAt: Date.now(),
    });
  });
}

function setCompleted(id, completed) {
  update(() => {
    const todo = todos.find((t) => t.id === id);
    if (todo) todo.completed = completed;
  });
}

function rename(id, title) {
  update(() => {
    if (!title) {
      todos = todos.filter((t) => t.id !== id);
      return;
    }
    const todo = todos.find((t) => t.id === id);
    if (todo) todo.title = title;
  });
}

function remove(id) {
  update(() => {
    todos = todos.filter((t) => t.id !== id);
  });
}

// ---- rendering ----

function visibleTodos() {
  if (filter === 'active') return todos.filter((t) => !t.completed);
  if (filter === 'completed') return todos.filter((t) => t.completed);
  return todos;
}

function renderItem(todo) {
  const li = els.template.content.firstElementChild.cloneNode(true);
  li.dataset.id = todo.id;
  li.classList.toggle('completed', todo.completed);

  li.querySelector('.toggle').checked = todo.completed;
  li.querySelector('.title').textContent = todo.title;

  const dueEl = li.querySelector('.due');
  if (todo.due) {
    const { text, state } = describeDue(todo.due);
    dueEl.textContent = text;
    if (state && !todo.completed) dueEl.classList.add(state);
  }
  return li;
}

function render() {
  const items = visibleTodos();
  els.list.replaceChildren(...items.map(renderItem));

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.length - activeCount;

  els.empty.hidden = items.length > 0;
  els.empty.textContent =
    todos.length === 0 ? '할 일이 없습니다. 새로 추가해 보세요!'
    : filter === 'active' ? '모든 일을 끝냈어요 🎉'
    : '완료한 항목이 없습니다.';

  els.count.textContent = `남은 일 ${activeCount}개`;
  els.clearCompleted.hidden = completedCount === 0;

  els.toggleAll.checked = todos.length > 0 && activeCount === 0;
  els.toggleAll.indeterminate = activeCount > 0 && completedCount > 0;
  els.toggleAll.disabled = todos.length === 0;

  els.filters.forEach((btn) => {
    btn.setAttribute('aria-selected', String(btn.dataset.filter === filter));
  });
}

// ---- editing ----

function startEditing(li) {
  const todo = todos.find((t) => t.id === li.dataset.id);
  if (!todo) return;
  const input = li.querySelector('.edit');
  li.classList.add('editing');
  input.value = todo.title;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

function finishEditing(input, commit) {
  const li = input.closest('.todo-item');
  if (!li || !li.classList.contains('editing')) return;
  li.classList.remove('editing');
  if (commit) rename(li.dataset.id, input.value.trim());
}

// ---- events ----

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = els.title.value.trim();
  if (!title) return;
  addTodo(title, els.due.value);
  els.form.reset();
  els.title.focus();
});

els.toggleAll.addEventListener('change', () => {
  const completed = els.toggleAll.checked;
  update(() => todos.forEach((t) => { t.completed = completed; }));
});

els.filters.forEach((btn) => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    saveFilter();
    render();
  });
});

els.clearCompleted.addEventListener('click', () => {
  update(() => {
    todos = todos.filter((t) => !t.completed);
  });
});

els.list.addEventListener('change', (e) => {
  if (e.target.classList.contains('toggle')) {
    setCompleted(e.target.closest('.todo-item').dataset.id, e.target.checked);
  }
});

els.list.addEventListener('click', (e) => {
  if (e.target.classList.contains('delete')) {
    remove(e.target.closest('.todo-item').dataset.id);
  }
});

els.list.addEventListener('dblclick', (e) => {
  if (e.target.closest('.body')) startEditing(e.target.closest('.todo-item'));
});

els.list.addEventListener('keydown', (e) => {
  if (!e.target.classList.contains('edit') || e.isComposing) return;
  if (e.key === 'Enter') finishEditing(e.target, true);
  else if (e.key === 'Escape') finishEditing(e.target, false);
});

els.list.addEventListener('focusout', (e) => {
  if (e.target.classList.contains('edit')) finishEditing(e.target, true);
});

// 다른 탭에서 변경된 내용 동기화
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    todos = load();
    render();
  }
});

els.today.textContent = new Date().toLocaleDateString('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
});

render();
