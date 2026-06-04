/**
 * TaskFlow Application Logic
 * Persistent LocalStorage Todo App with Rich Styling and Features
 */

// ==========================================================================
// 1. State Management & Defaults
// ==========================================================================

const DEFAULT_CATEGORIES = [
  { id: 'cat-general', name: '일반', color: '#6366f1', isSystem: true },
  { id: 'cat-work', name: '업무', color: '#3b82f6', isSystem: true },
  { id: 'cat-personal', name: '개인', color: '#10b981', isSystem: true },
  { id: 'cat-shopping', name: '쇼핑', color: '#ec4899', isSystem: true },
  { id: 'cat-study', name: '학습', color: '#f59e0b', isSystem: true }
];

let state = {
  todos: [],
  categories: [],
  filters: {
    status: 'all',      // 'all' | 'active' | 'completed'
    category: 'all',    // 'all' | categoryId
    priority: 'all',    // 'all' | 'high' | 'medium' | 'low'
    search: ''
  },
  sortBy: 'createdAt-desc', // 'createdAt-desc' | 'createdAt-asc' | 'dueDate-asc' | 'priority-desc'
  theme: 'dark',
  // Temporary storage for subtasks when editing/creating in modal
  tempSubtasks: []
};

// ==========================================================================
// 2. DOM Elements Selection
// ==========================================================================

const elements = {
  // Theme & Actions
  themeToggle: document.getElementById('themeToggle'),
  exportBtn: document.getElementById('exportBtn'),
  importBtnClick: document.getElementById('importBtnClick'),
  importFile: document.getElementById('importFile'),
  
  // Dashboard Stats
  statTotal: document.getElementById('statTotal'),
  statPending: document.getElementById('statPending'),
  statCompleted: document.getElementById('statCompleted'),
  progressCircle: document.getElementById('progressCircle'),
  progressPercentage: document.getElementById('progressPercentage'),
  progressDesc: document.getElementById('progressDesc'),
  
  // Sidebar Controls
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  filterTabs: document.querySelectorAll('.filter-tab'),
  sortSelect: document.getElementById('sortSelect'),
  priorityFilterBtns: document.querySelectorAll('.priority-filter-btn'),
  categoryFilterList: document.getElementById('categoryFilterList'),
  clearCompletedBtn: document.getElementById('clearCompletedBtn'),
  
  // Main Tasks Area
  filterSummary: document.getElementById('filterSummary'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  tasksGrid: document.getElementById('tasksGrid'),
  emptyState: document.getElementById('emptyState'),
  emptyStateAddBtn: document.getElementById('emptyStateAddBtn'),
  fabAddBtn: document.getElementById('fabAddBtn'),
  
  // Task Form Modal
  taskModal: document.getElementById('taskModal'),
  closeTaskModalBtn: document.getElementById('closeTaskModalBtn'),
  cancelTaskModalBtn: document.getElementById('cancelTaskModalBtn'),
  taskForm: document.getElementById('taskForm'),
  modalTitle: document.getElementById('modalTitle'),
  taskId: document.getElementById('taskId'),
  taskTitle: document.getElementById('taskTitle'),
  taskDesc: document.getElementById('taskDesc'),
  taskCategory: document.getElementById('taskCategory'),
  taskDueDate: document.getElementById('taskDueDate'),
  newSubtaskInput: document.getElementById('newSubtaskInput'),
  addSubtaskBtn: document.getElementById('addSubtaskBtn'),
  modalSubtaskList: document.getElementById('modalSubtaskList'),
  saveTaskBtn: document.getElementById('saveTaskBtn'),
  
  // Category Manager Modal
  manageCategoriesBtn: document.getElementById('manageCategoriesBtn'),
  categoryModal: document.getElementById('categoryModal'),
  closeCategoryModalBtn: document.getElementById('closeCategoryModalBtn'),
  closeCategoryManagerBtn: document.getElementById('closeCategoryManagerBtn'),
  categoryForm: document.getElementById('categoryForm'),
  newCategoryName: document.getElementById('newCategoryName'),
  newCategoryColor: document.getElementById('newCategoryColor'),
  manageCategoryList: document.getElementById('manageCategoryList')
};

// ==========================================================================
// 3. LocalStorage Sync & Core Operations
// ==========================================================================

// Load state from local storage
function loadState() {
  // Load Theme
  const savedTheme = localStorage.getItem('taskflow_theme');
  if (savedTheme) {
    state.theme = savedTheme;
  } else {
    // Detect system preferred scheme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.theme = prefersDark ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', state.theme);

  // Load Categories
  const savedCategories = localStorage.getItem('taskflow_categories');
  if (savedCategories) {
    state.categories = JSON.parse(savedCategories);
  } else {
    state.categories = [...DEFAULT_CATEGORIES];
    localStorage.setItem('taskflow_categories', JSON.stringify(state.categories));
  }

  // Load Todos
  const savedTodos = localStorage.getItem('taskflow_todos');
  if (savedTodos) {
    state.todos = JSON.parse(savedTodos);
  } else {
    state.todos = [];
  }

  // Load Sort settings
  const savedSort = localStorage.getItem('taskflow_sort');
  if (savedSort) {
    state.sortBy = savedSort;
    elements.sortSelect.value = savedSort;
  }
}

// Save state to local storage
function saveTodos() {
  localStorage.setItem('taskflow_todos', JSON.stringify(state.todos));
}

function saveCategories() {
  localStorage.setItem('taskflow_categories', JSON.stringify(state.categories));
}

// Theme Toggle
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('taskflow_theme', state.theme);
}

// ==========================================================================
// 4. Category Operations
// ==========================================================================

function addCategory(name, color) {
  const isDuplicate = state.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase().trim());
  if (isDuplicate) {
    alert('이미 존재하는 카테고리 이름입니다.');
    return false;
  }

  const newCat = {
    id: 'cat-' + Date.now(),
    name: name.trim(),
    color: color,
    isSystem: false
  };

  state.categories.push(newCat);
  saveCategories();
  renderCategories();
  renderTodos(); // Categories sidebar lists count details
  return true;
}

function deleteCategory(catId) {
  const category = state.categories.find(cat => cat.id === catId);
  if (!category || category.isSystem) return;

  if (confirm(`'${category.name}' 카테고리를 삭제하시겠습니까?\n해당 카테고리의 할 일들은 '일반' 카테고리로 변경됩니다.`)) {
    // Re-assign todos from deleted category to general
    state.todos = state.todos.map(todo => {
      if (todo.category === catId) {
        return { ...todo, category: 'cat-general' };
      }
      return todo;
    });

    state.categories = state.categories.filter(cat => cat.id !== catId);
    
    // If deleted category was the active filter, reset to all
    if (state.filters.category === catId) {
      state.filters.category = 'all';
    }

    saveCategories();
    saveTodos();
    renderCategories();
    renderTodos();
    renderCategoryManagerList();
  }
}

// ==========================================================================
// 5. Todo Operations
// ==========================================================================

function createOrUpdateTodo(todoData) {
  const isEditing = !!todoData.id;

  if (isEditing) {
    state.todos = state.todos.map(todo => {
      if (todo.id === todoData.id) {
        return {
          ...todo,
          title: todoData.title.trim(),
          description: todoData.description.trim(),
          category: todoData.category,
          dueDate: todoData.dueDate || null,
          priority: todoData.priority,
          subtasks: todoData.subtasks
        };
      }
      return todo;
    });
  } else {
    const newTodo = {
      id: 'todo-' + Date.now(),
      title: todoData.title.trim(),
      description: todoData.description.trim(),
      category: todoData.category,
      dueDate: todoData.dueDate || null,
      priority: todoData.priority,
      completed: false,
      subtasks: todoData.subtasks,
      createdAt: new Date().toISOString()
    };
    state.todos.push(newTodo);
  }

  saveTodos();
  renderTodos();
}

function deleteTodo(todoId) {
  if (confirm('이 할 일을 삭제하시겠습니까?')) {
    state.todos = state.todos.filter(todo => todo.id !== todoId);
    saveTodos();
    renderTodos();
  }
}

function toggleTodoComplete(todoId) {
  let isNowCompleted = false;
  state.todos = state.todos.map(todo => {
    if (todo.id === todoId) {
      isNowCompleted = !todo.completed;
      // When parent is marked complete/incomplete, also update all subtasks to match?
      // For premium UX: mark all subtasks complete when parent completed, or leave as is?
      // Standard behavior: if completed, also complete subtasks. If active, leave subtasks as is.
      const updatedSubtasks = todo.subtasks.map(sub => ({
        ...sub,
        completed: isNowCompleted ? true : sub.completed
      }));

      return {
        ...todo,
        completed: isNowCompleted,
        subtasks: updatedSubtasks
      };
    }
    return todo;
  });

  saveTodos();
  renderTodos();

  // Celebrate with confetti on completion
  if (isNowCompleted) {
    triggerConfetti();
  }
}

function toggleSubtaskComplete(todoId, subtaskId) {
  let allSubtasksDone = false;
  
  state.todos = state.todos.map(todo => {
    if (todo.id === todoId) {
      const updatedSubtasks = todo.subtasks.map(sub => {
        if (sub.id === subtaskId) {
          return { ...sub, completed: !sub.completed };
        }
        return sub;
      });

      // If all subtasks are completed, and task was not completed, should we complete parent?
      // Standard is to let user toggle parent. Let's recalculate completion.
      const totalSub = updatedSubtasks.length;
      const completedSub = updatedSubtasks.filter(s => s.completed).length;
      
      // Auto-toggle parent if all subtasks are complete AND it was not complete previously
      let parentCompleted = todo.completed;
      if (totalSub > 0 && completedSub === totalSub && !todo.completed) {
        parentCompleted = true;
        allSubtasksDone = true;
      } else if (totalSub > 0 && completedSub < totalSub && todo.completed) {
        // If they unchecked a subtask, but parent was checked, uncheck parent?
        // Let's make it intuitive: if you uncheck a subtask, task status stays as is OR changes.
        // Let's keep it flexible, but for premium UX, if checklist changes, we just keep parent state or uncheck.
        parentCompleted = false;
      }

      return {
        ...todo,
        completed: parentCompleted,
        subtasks: updatedSubtasks
      };
    }
    return todo;
  });

  saveTodos();
  renderTodos();

  if (allSubtasksDone) {
    triggerConfetti();
  }
}

function clearCompletedTodos() {
  const completedCount = state.todos.filter(todo => todo.completed).length;
  if (completedCount === 0) {
    alert('삭제할 완료된 항목이 없습니다.');
    return;
  }

  if (confirm(`완료된 할 일 ${completedCount}개를 일괄 삭제하시겠습니까?`)) {
    state.todos = state.todos.filter(todo => !todo.completed);
    saveTodos();
    renderTodos();
  }
}

// ==========================================================================
// 6. Stats & UI Updates
// ==========================================================================

function updateStats() {
  const total = state.todos.length;
  const completed = state.todos.filter(t => t.completed).length;
  const pending = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Text values
  elements.statTotal.textContent = total;
  elements.statPending.textContent = pending;
  elements.statCompleted.textContent = completed;
  elements.progressPercentage.textContent = `${percentage}%`;

  // Circular progress ring logic
  // r = 24. Circumference = 2 * PI * r = 150.79
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  elements.progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
  
  const offset = circumference - (percentage / 100) * circumference;
  elements.progressCircle.style.strokeDashoffset = offset;

  // Progress Description
  let desc = '할 일을 등록해 보세요!';
  if (total > 0) {
    if (percentage === 0) desc = '시작이 반입니다. 화이팅!';
    else if (percentage < 30) desc = '차근차근 진행 중입니다.';
    else if (percentage < 70) desc = '정말 잘하고 계시네요!';
    else if (percentage < 100) desc = '조금만 더 힘내세요!';
    else desc = '오늘의 할 일을 모두 끝냈습니다! 🎉';
  }
  elements.progressDesc.textContent = desc;

  // Update clear button disabled state
  elements.clearCompletedBtn.style.display = completed > 0 ? 'flex' : 'none';
}

function triggerConfetti() {
  if (window.confetti) {
    window.confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899']
    });
  }
}

// ==========================================================================
// 7. Filtering & Sorting Rendering Logic
// ==========================================================================

function getPriorityWeight(priority) {
  switch (priority) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

function getFilteredAndSortedTodos() {
  let filtered = [...state.todos];

  // Status Filter
  if (state.filters.status === 'active') {
    filtered = filtered.filter(todo => !todo.completed);
  } else if (state.filters.status === 'completed') {
    filtered = filtered.filter(todo => todo.completed);
  }

  // Category Filter
  if (state.filters.category !== 'all') {
    filtered = filtered.filter(todo => todo.category === state.filters.category);
  }

  // Priority Filter
  if (state.filters.priority !== 'all') {
    filtered = filtered.filter(todo => todo.priority === state.filters.priority);
  }

  // Search Filter
  if (state.filters.search.trim() !== '') {
    const q = state.filters.search.toLowerCase().trim();
    filtered = filtered.filter(todo => 
      todo.title.toLowerCase().includes(q) || 
      todo.description.toLowerCase().includes(q)
    );
  }

  // Sorting
  filtered.sort((a, b) => {
    switch (state.sortBy) {
      case 'createdAt-desc':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'createdAt-asc':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'dueDate-asc':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      case 'priority-desc':
        return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      default:
        return 0;
    }
  });

  return filtered;
}

// UI filter notification bar
function updateFilterSummary() {
  const isFiltering = 
    state.filters.category !== 'all' || 
    state.filters.priority !== 'all' || 
    state.filters.search.trim() !== '';

  if (isFiltering) {
    let filtersDesc = [];
    if (state.filters.search.trim() !== '') {
      filtersDesc.push(`검색어: "${state.filters.search}"`);
    }
    if (state.filters.category !== 'all') {
      const cat = state.categories.find(c => c.id === state.filters.category);
      if (cat) filtersDesc.push(`카테고리: ${cat.name}`);
    }
    if (state.filters.priority !== 'all') {
      const priorityNames = { high: '높음', medium: '중간', low: '낮음' };
      filtersDesc.push(`우선순위: ${priorityNames[state.filters.priority]}`);
    }
    
    elements.filterSummary.style.display = 'flex';
    elements.filterSummary.querySelector('.summary-text').innerHTML = 
      `<i class="fa-solid fa-filter"></i> 필터 적용 중 (${filtersDesc.join(', ')})`;
  } else {
    elements.filterSummary.style.display = 'none';
  }
}

// ==========================================================================
// 8. View Renderers
// ==========================================================================

// Render Category Sidebar & Select Form Options
function renderCategories() {
  // 1. Render Sidebar list
  let sidebarHtml = `
    <div class="category-item ${state.filters.category === 'all' ? 'active' : ''}" data-cat-id="all">
      <div class="category-info">
        <span class="category-color" style="background-color: var(--text-muted)"></span>
        <span>전체보기</span>
      </div>
      <span class="category-count">${state.todos.length}</span>
    </div>
  `;

  state.categories.forEach(cat => {
    const count = state.todos.filter(todo => todo.category === cat.id).length;
    sidebarHtml += `
      <div class="category-item ${state.filters.category === cat.id ? 'active' : ''}" data-cat-id="${cat.id}">
        <div class="category-info">
          <span class="category-color" style="background-color: ${cat.color}"></span>
          <span>${escapeHtml(cat.name)}</span>
        </div>
        <span class="category-count">${count}</span>
      </div>
    `;
  });

  elements.categoryFilterList.innerHTML = sidebarHtml;

  // Add click listeners to sidebar categories
  elements.categoryFilterList.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => {
      const catId = item.getAttribute('data-cat-id');
      state.filters.category = catId;
      renderCategories();
      renderTodos();
    });
  });

  // 2. Render Form Modal select box
  let selectHtml = '';
  state.categories.forEach(cat => {
    selectHtml += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
  });
  elements.taskCategory.innerHTML = selectHtml;
}

// Render Todos list
function renderTodos() {
  updateStats();
  updateFilterSummary();

  const filteredTodos = getFilteredAndSortedTodos();
  
  if (filteredTodos.length === 0) {
    elements.tasksGrid.style.display = 'none';
    elements.emptyState.style.display = 'flex';
    
    // Adjust text based on active filters
    const hasFilters = state.filters.category !== 'all' || state.filters.priority !== 'all' || state.filters.search.trim() !== '' || state.filters.status !== 'all';
    if (hasFilters) {
      document.getElementById('emptyStateTitle').textContent = '검색 조건에 맞는 할 일이 없습니다';
      document.getElementById('emptyStateDesc').textContent = '필터를 변경하거나 검색어를 다르게 입력해 보세요.';
      elements.emptyStateAddBtn.style.display = 'none';
    } else {
      document.getElementById('emptyStateTitle').textContent = '등록된 할 일이 없습니다';
      document.getElementById('emptyStateDesc').textContent = '새로운 할 일을 추가하고 일정을 관리해 보세요.';
      elements.emptyStateAddBtn.style.display = 'inline-flex';
    }
    return;
  }

  elements.tasksGrid.style.display = 'grid';
  elements.emptyState.style.display = 'none';

  let gridHtml = '';

  filteredTodos.forEach(todo => {
    const category = state.categories.find(c => c.id === todo.category) || { name: '일반', color: '#6366f1' };
    
    // Check if overdue
    let isOverdue = false;
    let formattedDate = '';
    if (todo.dueDate) {
      const dueDate = new Date(todo.dueDate);
      const now = new Date();
      isOverdue = dueDate < now && !todo.completed;

      // Format date beautifully
      const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
      formattedDate = dueDate.toLocaleDateString('ko-KR', options);
    }

    // Subtask details
    const totalSubtasks = todo.subtasks ? todo.subtasks.length : 0;
    const completedSubtasks = todo.subtasks ? todo.subtasks.filter(s => s.completed).length : 0;
    const subtaskPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    gridHtml += `
      <article class="task-card" data-todo-id="${todo.id}">
        <!-- Top row (Priority badge + Action buttons) -->
        <div class="task-card-header">
          <span class="task-priority-tag ${todo.priority}">
            <i class="fa-solid ${todo.priority === 'high' ? 'fa-arrow-up' : todo.priority === 'medium' ? 'fa-minus' : 'fa-arrow-down'}"></i>
            ${todo.priority === 'high' ? '높음' : todo.priority === 'medium' ? '중간' : '낮음'}
          </span>
          <div class="task-actions-dropdown">
            <button class="btn-icon edit" onclick="editTodoClick('${todo.id}')" title="수정">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="btn-icon delete" onclick="deleteTodoClick('${todo.id}')" title="삭제">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>

        <!-- Body content (Checkbox + Title + Description) -->
        <div class="task-card-body ${todo.completed ? 'completed' : ''}">
          <div class="custom-checkbox" onclick="toggleTodoCompleteClick('${todo.id}')">
            <i class="fa-solid fa-check"></i>
          </div>
          <div class="task-content">
            <h4 class="task-title" onclick="toggleTodoCompleteClick('${todo.id}')">${escapeHtml(todo.title)}</h4>
            ${todo.description ? `<p class="task-description">${escapeHtml(todo.description)}</p>` : ''}
          </div>
        </div>

        <!-- Subtasks Inline (If present) -->
        ${totalSubtasks > 0 ? `
          <div class="task-subtasks-preview">
            <div class="subtasks-header">
              <span>체크리스트 (${completedSubtasks}/${totalSubtasks})</span>
              <span>${subtaskPercent}%</span>
            </div>
            <div class="subtasks-progress-bar">
              <div class="subtasks-progress-fill" style="width: ${subtaskPercent}%"></div>
            </div>
            <ul class="subtasks-list-inline">
              ${todo.subtasks.map(sub => `
                <li class="subtask-inline-item ${sub.completed ? 'completed' : ''}" onclick="toggleSubtaskClick('${todo.id}', '${sub.id}')">
                  <div class="subtask-inline-checkbox">
                    <i class="fa-solid fa-check"></i>
                  </div>
                  <span>${escapeHtml(sub.title)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Footer details (Category & Due Date) -->
        <div class="task-card-footer">
          <div class="task-meta-info">
            <span class="meta-chip category-tag" style="border-left: 3px solid ${category.color}">
              ${escapeHtml(category.name)}
            </span>
            ${todo.dueDate ? `
              <span class="meta-chip due-date ${isOverdue ? 'urgent' : ''}" title="${isOverdue ? '기간 만료!' : '기한'}">
                <i class="fa-regular fa-calendar"></i>
                <span>${formattedDate}${isOverdue ? ' (지남)' : ''}</span>
              </span>
            ` : ''}
          </div>
        </div>
      </article>
    `;
  });

  elements.tasksGrid.innerHTML = gridHtml;
}

// Global functions for inline HTML event click callbacks (to avoid event delegation complexities)
window.toggleTodoCompleteClick = function(todoId) {
  toggleTodoComplete(todoId);
};

window.toggleSubtaskClick = function(todoId, subtaskId) {
  toggleSubtaskComplete(todoId, subtaskId);
};

window.editTodoClick = function(todoId) {
  openTaskModal(todoId);
};

window.deleteTodoClick = function(todoId) {
  deleteTodo(todoId);
};

// Render Category Manager Modal list items
function renderCategoryManagerList() {
  let listHtml = '';
  
  state.categories.forEach(cat => {
    const isSystem = cat.isSystem;
    listHtml += `
      <li class="manage-category-item">
        <div class="manage-category-item-info">
          <span class="manage-category-item-dot" style="background-color: ${cat.color}"></span>
          <span>${escapeHtml(cat.name)}</span>
        </div>
        <div class="manage-category-actions">
          <button class="delete-cat" onclick="deleteCategoryClick('${cat.id}')" ${isSystem ? 'disabled title="시스템 기본 카테고리는 삭제할 수 없습니다."' : 'title="삭제"'}>
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </li>
    `;
  });

  elements.manageCategoryList.innerHTML = listHtml;
}

window.deleteCategoryClick = function(catId) {
  deleteCategory(catId);
};

// Render Subtasks list in Task Modal
function renderModalSubtasks() {
  let listHtml = '';
  state.tempSubtasks.forEach((sub, idx) => {
    listHtml += `
      <li class="modal-subtask-item">
        <span>${escapeHtml(sub.title)}</span>
        <button type="button" onclick="removeTempSubtask(${idx})">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </li>
    `;
  });
  elements.modalSubtaskList.innerHTML = listHtml;
}

window.removeTempSubtask = function(idx) {
  state.tempSubtasks.splice(idx, 1);
  renderModalSubtasks();
};

// ==========================================================================
// 9. Modal Control Logics
// ==========================================================================

function openTaskModal(todoId = null) {
  const isEditing = todoId !== null;
  elements.taskForm.reset();

  if (isEditing) {
    const todo = state.todos.find(t => t.id === todoId);
    if (!todo) return;

    elements.modalTitle.textContent = '할 일 수정';
    elements.taskId.value = todo.id;
    elements.taskTitle.value = todo.title;
    elements.taskDesc.value = todo.description || '';
    elements.taskCategory.value = todo.category;
    elements.taskDueDate.value = todo.dueDate || '';
    
    // Set priority radio checked
    const priorityRadio = elements.taskForm.querySelector(`input[name="taskPriority"][value="${todo.priority}"]`);
    if (priorityRadio) priorityRadio.checked = true;

    // Load subtasks to temp state
    state.tempSubtasks = todo.subtasks ? [...todo.subtasks] : [];
    renderModalSubtasks();

    elements.saveTaskBtn.textContent = '변경사항 저장';
  } else {
    elements.modalTitle.textContent = '새로운 할 일 추가';
    elements.taskId.value = '';
    elements.taskCategory.value = state.filters.category !== 'all' ? state.filters.category : 'cat-general';
    
    // Default radio
    elements.taskForm.querySelector('input[name="taskPriority"][value="medium"]').checked = true;
    
    state.tempSubtasks = [];
    renderModalSubtasks();

    elements.saveTaskBtn.textContent = '등록하기';
  }

  elements.taskModal.classList.add('show');
  setTimeout(() => elements.taskTitle.focus(), 150);
}

function closeTaskModal() {
  elements.taskModal.classList.remove('show');
  state.tempSubtasks = [];
}

function openCategoryModal() {
  elements.categoryForm.reset();
  renderCategoryManagerList();
  elements.categoryModal.classList.add('show');
}

function closeCategoryModal() {
  elements.categoryModal.classList.remove('show');
}

// ==========================================================================
// 10. Data Backup / JSON Import & Export
// ==========================================================================

function exportData() {
  const dataStr = JSON.stringify({
    todos: state.todos,
    categories: state.categories,
    version: '1.0'
  }, null, 2);

  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  const exportFileDefaultName = `taskflow-backup-${new Date().toISOString().slice(0,10)}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      // Basic Validation
      if (!data.todos || !data.categories) {
        alert('올바르지 않은 백업 파일 형식입니다. (todos 또는 categories 누락)');
        return;
      }

      if (confirm('현재 저장된 모든 데이터가 백업 파일의 데이터로 대체됩니다. 계속하시겠습니까?')) {
        // Ensure system categories are preserved even if missing
        const importedCats = data.categories;
        DEFAULT_CATEGORIES.forEach(sysCat => {
          if (!importedCats.some(c => c.id === sysCat.id)) {
            importedCats.unshift(sysCat);
          }
        });

        state.todos = data.todos;
        state.categories = importedCats;
        
        saveTodos();
        saveCategories();
        
        // Reset filters
        state.filters = { status: 'all', category: 'all', priority: 'all', search: '' };
        elements.searchInput.value = '';
        elements.clearSearch.style.display = 'none';
        
        renderCategories();
        renderTodos();
        
        alert('데이터 가져오기가 성공적으로 완료되었습니다!');
      }
    } catch (err) {
      alert('파일을 읽는 도중 오류가 발생했습니다: ' + err.message);
    }
  };
  reader.readAsText(file);
  // Reset input file value so change event fires again if user uploads same file
  elements.importFile.value = '';
}

// ==========================================================================
// 11. Event Listeners Setup & Initialization
// ==========================================================================

function initEvents() {
  // Theme Toggle
  elements.themeToggle.addEventListener('click', toggleTheme);
  
  // Data Backup
  elements.exportBtn.addEventListener('click', exportData);
  elements.importBtnClick.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', importData);

  // Search input events
  elements.searchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    elements.clearSearch.style.display = e.target.value ? 'block' : 'none';
    renderTodos();
  });

  elements.clearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.filters.search = '';
    elements.clearSearch.style.display = 'none';
    renderTodos();
  });

  // Filter tabs (Status: All, Active, Completed)
  elements.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.filters.status = tab.getAttribute('data-filter');
      renderTodos();
    });
  });

  // Priority filters
  elements.priorityFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.priorityFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filters.priority = btn.getAttribute('data-priority');
      renderTodos();
    });
  });

  // Sort Selector
  elements.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    localStorage.setItem('taskflow_sort', state.sortBy);
    renderTodos();
  });

  // Reset filter summary
  elements.resetFiltersBtn.addEventListener('click', () => {
    // Reset inputs
    state.filters.category = 'all';
    state.filters.priority = 'all';
    state.filters.search = '';
    elements.searchInput.value = '';
    elements.clearSearch.style.display = 'none';

    // Reset UI active classes
    elements.priorityFilterBtns.forEach(b => b.classList.remove('active'));
    elements.priorityFilterBtns[0].classList.add('active'); // 'All' button
    
    renderCategories();
    renderTodos();
  });

  // Task Modal controls
  elements.fabAddBtn.addEventListener('click', () => openTaskModal());
  elements.emptyStateAddBtn.addEventListener('click', () => openTaskModal());
  
  elements.closeTaskModalBtn.addEventListener('click', closeTaskModal);
  elements.cancelTaskModalBtn.addEventListener('click', closeTaskModal);
  
  // Close modals when clicking backdrop
  window.addEventListener('click', (e) => {
    if (e.target === elements.taskModal) closeTaskModal();
    if (e.target === elements.categoryModal) closeCategoryModal();
  });

  // Submit Task Form
  elements.taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const titleVal = elements.taskTitle.value.trim();
    if (!titleVal) return;

    const selectedPriority = elements.taskForm.querySelector('input[name="taskPriority"]:checked').value;

    createOrUpdateTodo({
      id: elements.taskId.value || null,
      title: titleVal,
      description: elements.taskDesc.value,
      category: elements.taskCategory.value,
      dueDate: elements.taskDueDate.value,
      priority: selectedPriority,
      subtasks: state.tempSubtasks
    });

    closeTaskModal();
  });

  // Add Subtask in Task Form Modal
  const addSubtaskFunc = () => {
    const val = elements.newSubtaskInput.value.trim();
    if (!val) return;

    state.tempSubtasks.push({
      id: 'sub-' + Date.now() + Math.random().toString(36).substr(2, 5),
      title: val,
      completed: false
    });

    elements.newSubtaskInput.value = '';
    renderModalSubtasks();
    elements.newSubtaskInput.focus();
  };

  elements.addSubtaskBtn.addEventListener('click', addSubtaskFunc);
  elements.newSubtaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtaskFunc();
    }
  });

  // Category Manager Modal controls
  elements.manageCategoriesBtn.addEventListener('click', openCategoryModal);
  elements.closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
  elements.closeCategoryManagerBtn.addEventListener('click', closeCategoryModal);

  // Submit Category Form
  elements.categoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameVal = elements.newCategoryName.value.trim();
    const colorVal = elements.newCategoryColor.value;
    
    if (nameVal) {
      const added = addCategory(nameVal, colorVal);
      if (added) {
        elements.categoryForm.reset();
        renderCategoryManagerList();
      }
    }
  });

  // Clear completed button
  elements.clearCompletedBtn.addEventListener('click', clearCompletedTodos);
}

// ==========================================================================
// 12. Helper Functions & Startup
// ==========================================================================

// Escape HTML tags to prevent XSS injection
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initial application entry point
function init() {
  loadState();
  initEvents();
  renderCategories();
  renderTodos();
}

// Start running app on DOM ready
document.addEventListener('DOMContentLoaded', init);
