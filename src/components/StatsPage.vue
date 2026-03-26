<template>
  <div class="stats-page">
    <div v-if="isLoading" class="loading">Загрузка статистики...</div>

    <template v-else>
      <!-- Общая статистика -->
      <div class="section">
        <h2>📊 Общий прогресс</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ totalWords }}</div>
            <div class="stat-label">Всего слов</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ studiedWords }}</div>
            <div class="stat-label">Изучается</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ masteredWords }}</div>
            <div class="stat-label">Освоено (ур. 5)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ averageScore }}</div>
            <div class="stat-label">Средний счёт</div>
          </div>
        </div>
      </div>

      <!-- Распределение по уровням -->
      <div class="section">
        <h2>🎯 Распределение по уровням</h2>
        <div class="level-list">
          <div v-for="level in 5" :key="level" class="level-row">
            <div class="level-info">
              <span class="level-badge" :style="{ background: getLevelColor(level) }">{{ level }}</span>
              <span class="level-name">{{ getLevelName(level) }}</span>
              <span class="level-prob">показ: {{ getLevelProb(level) }}</span>
            </div>
            <div class="level-bar-wrap">
              <div class="level-bar">
                <div
                    class="level-fill"
                    :style="{ width: getLevelPercentage(level) + '%', background: getLevelColor(level) }"
                ></div>
              </div>
              <span class="level-count">{{ getWordsCountByLevel(level) }} сл.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Топ сложных слов -->
      <div class="section">
        <h2>😓 Самые сложные слова (низкий счёт)</h2>
        <div class="words-list">
          <div v-for="word in hardestWords" :key="word.id" class="word-row">
            <span class="word-korean">{{ word.korean }}</span>
            <span class="word-russian">{{ word.russian }}</span>
            <span class="word-score" :style="{ color: getScoreColor(word.score) }">
              ⭐ {{ word.score }}
            </span>
            <span class="word-level">Ур. {{ word.level }}</span>
          </div>
        </div>
      </div>

      <!-- Топ выученных слов -->
      <div class="section">
        <h2>🏆 Лучше всего выученные</h2>
        <div class="words-list">
          <div v-for="word in bestWords" :key="word.id" class="word-row">
            <span class="word-korean">{{ word.korean }}</span>
            <span class="word-russian">{{ word.russian }}</span>
            <span class="word-score" style="color: #4CAF50">
              ⭐ {{ word.score }}
            </span>
            <span class="word-level">Ур. {{ word.level }}</span>
          </div>
        </div>
      </div>

      <!-- Никогда не повторялись -->
      <div class="section" v-if="neverReviewed.length > 0">
        <h2>🆕 Ещё ни разу не повторялись ({{ neverReviewed.length }})</h2>
        <div class="words-list">
          <div v-for="word in neverReviewed.slice(0, 10)" :key="word.id" class="word-row">
            <span class="word-korean">{{ word.korean }}</span>
            <span class="word-russian">{{ word.russian }}</span>
            <span class="word-score" style="color: #aaa">новое</span>
          </div>
          <div v-if="neverReviewed.length > 10" class="more-label">
            ...и ещё {{ neverReviewed.length - 10 }} слов
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { getKoreanWords } from '../data/words.js'

export default {
  name: 'StatsPage',
  setup() {
    const words = ref([])
    const isLoading = ref(true)

    onMounted(async () => {
      try {
        words.value = await getKoreanWords()
      } finally {
        isLoading.value = false
      }
    })

    const totalWords = computed(() => words.value.length)

    const studiedWords = computed(() =>
        words.value.filter(w => w.last_reviewed).length
    )

    const masteredWords = computed(() =>
        words.value.filter(w => (w.level || 1) === 5).length
    )

    const averageScore = computed(() => {
      if (!words.value.length) return 0
      const sum = words.value.reduce((acc, w) => acc + (w.score || 0), 0)
      return (sum / words.value.length).toFixed(1)
    })

    const neverReviewed = computed(() =>
        words.value.filter(w => !w.last_reviewed)
    )

    const hardestWords = computed(() =>
        [...words.value]
            .filter(w => w.last_reviewed)
            .sort((a, b) => (a.score || 0) - (b.score || 0))
            .slice(0, 10)
    )

    const bestWords = computed(() =>
        [...words.value]
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 10)
    )

    const getWordsCountByLevel = (level) =>
        words.value.filter(w => (w.level || 1) === level).length

    const getLevelPercentage = (level) => {
      if (!words.value.length) return 0
      return (getWordsCountByLevel(level) / words.value.length) * 100
    }

    const getLevelColor = (level) => ({
      1: '#f44336', 2: '#ff9800', 3: '#ffeb3b', 4: '#4caf50', 5: '#2196f3'
    }[level] || '#ccc')

    const getLevelName = (level) => ({
      1: 'Новые / сложные',
      2: 'Немного знаю',
      3: 'Хорошо знаю',
      4: 'Отлично знаю',
      5: 'Мастерски'
    }[level] || '')

    const getLevelProb = (level) => ({
      1: '50%', 2: '25%', 3: '15%', 4: '7%', 5: '3%'
    }[level] || '')

    const getScoreColor = (score) => {
      if (score <= 2) return '#f44336'
      if (score <= 5) return '#ff9800'
      return '#4CAF50'
    }

    return {
      isLoading, totalWords, studiedWords, masteredWords, averageScore,
      neverReviewed, hardestWords, bestWords,
      getWordsCountByLevel, getLevelPercentage, getLevelColor,
      getLevelName, getLevelProb, getScoreColor
    }
  }
}
</script>

<style scoped>
.stats-page {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.loading {
  color: white;
  text-align: center;
  padding: 40px;
  font-size: 18px;
}

.section {
  background: rgba(255,255,255,0.1);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
}

.section h2 {
  color: white;
  margin-bottom: 15px;
  font-size: 1.1em;
}

/* Карточки общей статистики */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.stat-card {
  background: rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 15px 10px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #ffeb3b;
}

.stat-label {
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  margin-top: 5px;
}

/* Уровни */
.level-list { display: flex; flex-direction: column; gap: 12px; }

.level-row { display: flex; flex-direction: column; gap: 6px; }

.level-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.level-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
}

.level-name { color: white; font-size: 14px; flex: 1; }

.level-prob {
  color: rgba(255,255,255,0.6);
  font-size: 12px;
}

.level-bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.level-bar {
  flex: 1;
  height: 10px;
  background: rgba(255,255,255,0.2);
  border-radius: 5px;
  overflow: hidden;
}

.level-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease;
}

.level-count {
  min-width: 50px;
  text-align: right;
  color: rgba(255,255,255,0.8);
  font-size: 13px;
}

/* Списки слов */
.words-list { display: flex; flex-direction: column; gap: 8px; }

.word-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.08);
  padding: 8px 12px;
  border-radius: 8px;
}

.word-korean {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  min-width: 80px;
  font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
}

.word-russian { color: rgba(255,255,255,0.85); flex: 1; font-size: 14px; }
.word-score { font-size: 13px; font-weight: bold; }
.word-level { font-size: 12px; color: rgba(255,255,255,0.5); }

.more-label {
  text-align: center;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  padding: 5px;
}

@media (max-width: 600px) {
  .section { padding: 15px; }
  .stat-value { font-size: 22px; }
  .word-korean { min-width: 60px; font-size: 16px; }
}
</style>