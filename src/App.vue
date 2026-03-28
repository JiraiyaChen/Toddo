<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  loadTasksFromDb,
  migrateLocalStorageToDb,
  saveTasksToDb,
} from './db/taskDb';

const LEGACY_STORAGE_KEY = 'toddo-planner-v1';
const XINGCE_SUB_CATEGORIES = [
  '言语理解',
  '数量关系',
  '判断推理',
  '资料分析',
  '常识判断',
];

const emptyForm = {
  title: '',
  detail: '',
  category: 'xingce',
  subCategory: XINGCE_SUB_CATEGORIES[0],
  priority: 'medium',
  status: 'todo',
  planDate: '',
  dueDate: '',
};

const today = new Date().toISOString().slice(0, 10);

const form = ref({ ...emptyForm, planDate: today });
const statusFilter = ref('all');
const priorityFilter = ref('all');
const categoryFilter = ref('all');
const subCategoryFilter = ref('all');
const keyword = ref('');
const sortBy = ref('planned');
const databaseReady = ref(false);

const tasks = ref([]);

let saveTimer = null;

onMounted(async () => {
  try {
    let initialTasks = await loadTasksFromDb();

    if (!initialTasks.length) {
      initialTasks = await migrateLocalStorageToDb(LEGACY_STORAGE_KEY);
    }

    tasks.value = initialTasks.map((task) => normalizeTask(task));
  } catch (error) {
    console.error('Failed to initialize IndexedDB data:', error);
  } finally {
    databaseReady.value = true;
  }
});

onBeforeUnmount(() => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
});

watch(
  tasks,
  (value) => {
    if (!databaseReady.value) {
      return;
    }

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    const snapshot = value.map((task) => ({ ...task }));
    saveTimer = setTimeout(async () => {
      try {
        await saveTasksToDb(snapshot);
      } catch (error) {
        console.error('Failed to persist tasks into IndexedDB:', error);
      }
    }, 250);
  },
  { deep: true }
);

const totalTasks = computed(() => tasks.value.length);
const completedTasks = computed(
  () => tasks.value.filter((task) => task.status === 'done').length
);
const inProgressTasks = computed(
  () => tasks.value.filter((task) => task.status === 'doing').length
);
const completionRate = computed(() => {
  if (!totalTasks.value) {
    return 0;
  }
  return Math.round((completedTasks.value / totalTasks.value) * 100);
});

const todayTasks = computed(() =>
  tasks.value.filter(
    (task) => task.planDate === today && task.status !== 'done'
  )
);

const canFilterSubCategory = computed(() => categoryFilter.value === 'xingce');

const visibleTasks = computed(() => {
  let result = [...tasks.value];

  if (statusFilter.value !== 'all') {
    result = result.filter((task) => task.status === statusFilter.value);
  }

  if (priorityFilter.value !== 'all') {
    result = result.filter((task) => task.priority === priorityFilter.value);
  }

  if (categoryFilter.value !== 'all') {
    result = result.filter((task) => task.category === categoryFilter.value);
  }

  if (subCategoryFilter.value !== 'all') {
    result = result.filter(
      (task) => task.subCategory === subCategoryFilter.value
    );
  }

  if (keyword.value.trim()) {
    const term = keyword.value.trim().toLowerCase();
    result = result.filter((task) => {
      return (
        task.title.toLowerCase().includes(term) ||
        task.detail.toLowerCase().includes(term)
      );
    });
  }

  result.sort((a, b) => {
    if (sortBy.value === 'priority') {
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[b.priority] - weight[a.priority];
    }

    if (sortBy.value === 'due') {
      return (a.dueDate || '9999-12-31').localeCompare(
        b.dueDate || '9999-12-31'
      );
    }

    return (a.planDate || '9999-12-31').localeCompare(
      b.planDate || '9999-12-31'
    );
  });

  return result;
});

function addTask() {
  const title = form.value.title.trim();
  if (!title) {
    return;
  }

  const normalizedSubCategory =
    form.value.category === 'xingce' ? form.value.subCategory : '通用';

  const newTask = {
    id: crypto.randomUUID(),
    title,
    detail: form.value.detail.trim(),
    category: form.value.category,
    subCategory: normalizedSubCategory,
    priority: form.value.priority,
    status: form.value.status,
    planDate: form.value.planDate,
    dueDate: form.value.dueDate,
    createdAt: Date.now(),
  };

  tasks.value.unshift(newTask);
  form.value = { ...emptyForm, planDate: today };
}

function removeTask(taskId) {
  tasks.value = tasks.value.filter((task) => task.id !== taskId);
}

function cycleStatus(task) {
  const flow = ['todo', 'doing', 'done'];
  const nextIndex = (flow.indexOf(task.status) + 1) % flow.length;
  task.status = flow[nextIndex];
}

function clearFinished() {
  tasks.value = tasks.value.filter((task) => task.status !== 'done');
}

function statusText(status) {
  if (status === 'todo') return '待开始';
  if (status === 'doing') return '进行中';
  return '已完成';
}

function priorityText(priority) {
  if (priority === 'high') return '高';
  if (priority === 'medium') return '中';
  return '低';
}

function categoryText(category) {
  if (category === 'shenlun') return '申论';
  return '行测';
}

function normalizeTask(task) {
  const category = task.category === 'shenlun' ? 'shenlun' : 'xingce';
  const subCategory =
    category === 'xingce'
      ? XINGCE_SUB_CATEGORIES.includes(task.subCategory)
        ? task.subCategory
        : XINGCE_SUB_CATEGORIES[0]
      : '通用';

  return {
    ...task,
    category,
    subCategory,
  };
}

watch(
  () => form.value.category,
  (category) => {
    if (category !== 'xingce') {
      form.value.subCategory = '通用';
      return;
    }

    if (!XINGCE_SUB_CATEGORIES.includes(form.value.subCategory)) {
      form.value.subCategory = XINGCE_SUB_CATEGORIES[0];
    }
  }
);

watch(categoryFilter, (category) => {
  if (category !== 'xingce') {
    subCategoryFilter.value = 'all';
  }
});
</script>

<template>
  <main class="planner">
    <section class="hero-panel">
      <p class="hero-tag">Task Planning Workspace</p>
      <h1>任务规划记录台</h1>
      <p class="hero-subtitle">
        用更清晰的节奏管理今天和本周：先规划，再执行，再复盘。
      </p>
      <p class="db-badge" v-if="databaseReady">
        数据已缓存到浏览器数据库 IndexedDB
      </p>

      <div class="stats-grid">
        <article class="stat-card">
          <h2>总任务</h2>
          <strong>{{ totalTasks }}</strong>
        </article>
        <article class="stat-card">
          <h2>进行中</h2>
          <strong>{{ inProgressTasks }}</strong>
        </article>
        <article class="stat-card">
          <h2>完成率</h2>
          <strong>{{ completionRate }}%</strong>
        </article>
      </div>
    </section>

    <section class="board">
      <aside class="panel create-panel">
        <h2>新增计划</h2>
        <form @submit.prevent="addTask" class="task-form">
          <label>
            任务标题
            <input
              v-model="form.title"
              type="text"
              maxlength="50"
              placeholder="例如：完成周报"
            />
          </label>

          <label>
            任务描述
            <textarea
              v-model="form.detail"
              rows="3"
              maxlength="120"
              placeholder="补充上下文、目标或注意点"
            />
          </label>

          <div class="field-row">
            <label>
              分类
              <select v-model="form.category">
                <option value="xingce">行测</option>
                <option value="shenlun">申论</option>
              </select>
            </label>

            <label v-if="form.category === 'xingce'">
              行测子分类
              <select v-model="form.subCategory">
                <option
                  v-for="subCategory in XINGCE_SUB_CATEGORIES"
                  :key="subCategory"
                  :value="subCategory"
                >
                  {{ subCategory }}
                </option>
              </select>
            </label>

            <label v-else>
              行测子分类
              <input type="text" value="申论任务默认归为通用" disabled />
            </label>
          </div>

          <div class="field-row">
            <label>
              优先级
              <select v-model="form.priority">
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </label>

            <label>
              状态
              <select v-model="form.status">
                <option value="todo">待开始</option>
                <option value="doing">进行中</option>
                <option value="done">已完成</option>
              </select>
            </label>
          </div>

          <div class="field-row">
            <label>
              计划日期
              <input v-model="form.planDate" type="date" />
            </label>
            <label>
              截止日期
              <input v-model="form.dueDate" type="date" />
            </label>
          </div>

          <button type="submit" class="primary-btn">添加任务</button>
        </form>

        <div class="today-box">
          <h3>今日待办</h3>
          <p v-if="!todayTasks.length">今天没有未完成的计划，继续保持。</p>
          <ul v-else>
            <li v-for="task in todayTasks" :key="task.id">{{ task.title }}</li>
          </ul>
        </div>
      </aside>

      <section class="panel list-panel">
        <div class="toolbar">
          <h2>任务列表</h2>
          <button class="ghost-btn" @click="clearFinished">清理已完成</button>
        </div>

        <div class="filters">
          <select v-model="categoryFilter">
            <option value="all">全部分类</option>
            <option value="xingce">行测</option>
            <option value="shenlun">申论</option>
          </select>

          <select v-model="subCategoryFilter" :disabled="!canFilterSubCategory">
            <option value="all">全部子分类</option>
            <option
              v-for="subCategory in XINGCE_SUB_CATEGORIES"
              :key="subCategory"
              :value="subCategory"
            >
              {{ subCategory }}
            </option>
          </select>

          <select v-model="statusFilter">
            <option value="all">全部状态</option>
            <option value="todo">待开始</option>
            <option value="doing">进行中</option>
            <option value="done">已完成</option>
          </select>

          <select v-model="priorityFilter">
            <option value="all">全部优先级</option>
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
            <option value="low">低优先级</option>
          </select>

          <select v-model="sortBy">
            <option value="planned">按计划日期</option>
            <option value="due">按截止日期</option>
            <option value="priority">按优先级</option>
          </select>

          <input v-model="keyword" type="search" placeholder="搜索标题或描述" />
        </div>

        <ul class="task-list" v-if="visibleTasks.length">
          <li v-for="task in visibleTasks" :key="task.id" class="task-item">
            <div class="task-main">
              <h3>{{ task.title }}</h3>
              <p v-if="task.detail">{{ task.detail }}</p>
              <div class="meta">
                <span class="chip category">{{
                  categoryText(task.category)
                }}</span>
                <span class="chip sub-category">{{ task.subCategory }}</span>
                <span class="chip status" :data-status="task.status">
                  {{ statusText(task.status) }}
                </span>
                <span class="chip priority" :data-priority="task.priority">
                  {{ priorityText(task.priority) }}优先级
                </span>
                <span class="chip">计划: {{ task.planDate || '未设置' }}</span>
                <span class="chip">截止: {{ task.dueDate || '未设置' }}</span>
              </div>
            </div>
            <div class="task-actions">
              <button class="small-btn" @click="cycleStatus(task)">
                切换状态
              </button>
              <button class="small-btn danger" @click="removeTask(task.id)">
                删除
              </button>
            </div>
          </li>
        </ul>

        <p v-else class="empty-tip">没有匹配的任务，换个筛选条件试试。</p>
      </section>
    </section>
  </main>
</template>
