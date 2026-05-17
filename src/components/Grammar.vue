<template>
  <div class="grammar">

    <!-- Шапка с поиском -->
    <div class="grammar-header">
      <h2>📖 Грамматика</h2>
      <div class="header-controls">
        <input
            v-model="searchQuery"
            placeholder="Поиск по шаблону или переводу..."
            class="search-input"
        >
        <select v-model="categoryFilter" class="category-select">
          <option value="">Все темы</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
      <div class="counter">
        <span v-if="isLoading">Загрузка...</span>
        <span v-else>Найдено: {{ filteredItems.length }} правил</span>
      </div>
    </div>

    <div v-if="isLoading" class="state-msg">⏳ Загрузка...</div>
    <div v-else-if="!isLoading && items.length === 0" class="state-msg">
      База грамматики пуста — добавьте правила через панель администрирования.
    </div>
    <div v-else-if="filteredItems.length === 0" class="state-msg">Ничего не найдено</div>

    <div v-else class="grammar-grid">
      <div
          v-for="item in filteredItems"
          :key="item.id"
          class="grammar-card"
      >
        <div class="card-pattern">{{ item.pattern }}</div>
        <div class="card-translation">{{ item.translation }}</div>
        <div v-if="item.structure" class="card-structure">{{ item.structure }}</div>
        <div v-if="item.examples" class="card-examples">
          <div
              v-for="(ex, i) in parseExamples(item.examples)"
              :key="i"
              class="example-line"
          >{{ ex }}</div>
        </div>
        <div v-if="item.category" class="card-category">{{ item.category }}</div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { fetchGrammar } from '../utils/apiService.js'

export default {
  name: 'Grammar',
  setup() {
    const items          = ref([])
    const isLoading      = ref(true)
    const searchQuery    = ref('')
    const categoryFilter = ref('')

    onMounted(async () => {
      try {
        items.value = await fetchGrammar()
      } catch (e) {
        console.error('Ошибка загрузки грамматики:', e)
      } finally {
        isLoading.value = false
      }
    })

    const categories = computed(() =>
        [...new Set(items.value.map(i => i.category).filter(Boolean))].sort()
    )

    const filteredItems = computed(() => {
      const q = searchQuery.value.toLowerCase()
      return items.value.filter(item => {
        const matchSearch = !q ||
            item.pattern.toLowerCase().includes(q) ||
            item.translation.toLowerCase().includes(q) ||
            (item.structure || '').toLowerCase().includes(q)
        const matchCat = !categoryFilter.value || item.category === categoryFilter.value
        return matchSearch && matchCat
      })
    })

    // Примеры хранятся строкой, каждый пример — новая строка
    const parseExamples = (text) =>
        text.split('\n').map(s => s.trim()).filter(Boolean)

    return { items, isLoading, searchQuery, categoryFilter, categories, filteredItems, parseExamples }
  }
}
</script>

<style scoped>
.grammar { max-width: 1000px; margin: 0 auto; }

/* ── Шапка ───────────────────────────────────────────────────────────────── */
.grammar-header {
  background: rgba(255, 255, 255, 0.12);
  padding: 28px 30px;
  border-radius: 14px;
  margin-bottom: 28px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
}

.grammar-header h2 {
  color: white;
  font-size: 1.65em;
  margin-bottom: 18px;
}

.header-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.search-input,
.category-select {
  padding: 11px 15px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 15px;
  transition: border-color 0.2s;
}

.search-input { width: 280px; }
.search-input::placeholder { color: rgba(255, 255, 255, 0.55); }
.search-input:focus,
.category-select:focus { border-color: rgba(255, 255, 255, 0.7); outline: none; }
.category-select option { color: #333; background: white; }

.counter {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  margin-top: 12px;
}

/* ── Состояния ───────────────────────────────────────────────────────────── */
.state-msg {
  text-align: center;
  color: rgba(255, 255, 255, 0.85);
  padding: 50px 20px;
  font-size: 16px;
  line-height: 1.6;
}

/* ── Сетка карточек ──────────────────────────────────────────────────────── */
.grammar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 18px;
}

.grammar-card {
  background: rgba(255, 255, 255, 0.97);
  border-radius: 14px;
  padding: 20px 18px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 9px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.grammar-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* Корейский шаблон */
.card-pattern {
  font-size: 16px;
  font-weight: bold;
  color: #667eea;
  line-height: 1.35;
  word-break: break-word;
}

/* Перевод / значение */
.card-translation {
  font-size: 14px;
  color: #555;
  font-style: italic;
}

/* Структура (моноширинная) */
.card-structure {
  font-size: 12px;
  color: #777;
  background: #f2f3ff;
  padding: 5px 10px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  word-break: break-word;
}

/* Примеры */
.card-examples {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 2px;
}

.example-line {
  font-size: 13px;
  color: #444;
  padding-left: 10px;
  border-left: 3px solid #667eea;
  line-height: 1.4;
}

/* Бейдж категории */
.card-category {
  align-self: flex-start;
  font-size: 11px;
  color: #888;
  background: #f0f0f0;
  padding: 3px 10px;
  border-radius: 10px;
  margin-top: auto;
}

@media (max-width: 600px) {
  .grammar-header { padding: 20px 16px; }
  .search-input   { width: 100%; }
  .grammar-grid   { grid-template-columns: 1fr; }
}
</style>