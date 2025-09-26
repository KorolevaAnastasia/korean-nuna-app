<template>
  <div class="dictionary">
    <div class="header">
      <h2>📚 Корейско-русский словарь</h2>
      <input
          v-model="searchQuery"
          placeholder="Поиск слов..."
          class="search-input"
      >
      <select v-model="categoryFilter" class="category-select">
        <option value="">Все категории</option>
        <option v-for="category in categories" :key="category" :value="category">
          {{ category }}
        </option>
      </select>
    </div>

    <div class="words-grid">
      <div
          v-for="word in filteredWords"
          :key="word.id"
          class="word-card"
      >
        <div class="korean">{{ word.korean }}</div>
        <div class="russian">{{ word.russian }}</div>
        <div class="category">{{ word.category }}</div>
      </div>
    </div>

    <div v-if="filteredWords.length === 0" class="no-words">
      Слова не найдены
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { koreanWords } from '../data/words.js'

export default {
  name: 'Dictionary',
  setup() {
    const searchQuery = ref('')
    const categoryFilter = ref('')
    const words = ref([])

    onMounted(() => {
      words.value = koreanWords || []
    })

    const categories = computed(() => {
      if (!words.value || words.value.length === 0) return []
      return [...new Set(words.value.map(word => word.category))].sort()
    })

    const filteredWords = computed(() => {
      if (!words.value || words.value.length === 0) return []

      return words.value.filter(word => {
        const matchesSearch = word.korean.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            word.russian.toLowerCase().includes(searchQuery.value.toLowerCase())
        const matchesCategory = !categoryFilter.value || word.category === categoryFilter.value

        return matchesSearch && matchesCategory
      })
    })

    return {
      searchQuery,
      categoryFilter,
      filteredWords,
      categories
    }
  }
}
</script>

<style scoped>
.dictionary {
  max-width: 1000px;
  margin: 0 auto;
}

.header {
  background: rgba(255,255,255,0.1);
  padding: 30px;
  border-radius: 20px;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
  text-align: center;
}

.header h2 {
  color: white;
  margin-bottom: 20px;
}

.search-input, .category-select {
  padding: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 10px;
  font-size: 16px;
  background: transparent;
  margin: 10px;
  width: 250px;
  color: white;
}

.search-input::placeholder {
  color: white;
}

.category-select option {
  color: #333;
  padding: 10px;
}

.words-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.word-card {
  background: rgba(255,255,255,0.95);
  padding: 20px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.word-card:hover {
  transform: translateY(-5px);
}

.korean {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 10px;
}

.russian {
  font-size: 18px;
  color: #333;
  margin-bottom: 10px;
}

.category {
  font-size: 14px;
  color: #666;
  background: #f0f0f0;
  padding: 5px 10px;
  border-radius: 15px;
  display: inline-block;
}

.no-words {
  text-align: center;
  color: white;
  font-size: 18px;
  padding: 40px;
}
</style>