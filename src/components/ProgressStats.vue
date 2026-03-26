<template>
  <div class="progress-stats">
    <h3>📊 Ваш прогресс</h3>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ totalWords }}</div>
        <div class="stat-label">Всего слов</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ averageScore }}</div>
        <div class="stat-label">Средний счет</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ masteredWords }}</div>
        <div class="stat-label">Освоено (ур. 5)</div>
      </div>
    </div>

    <div class="level-distribution">
      <div v-for="level in 5" :key="level" class="level-progress">
        <span class="level-name">Уровень {{ level }}</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: getLevelPercentage(level) + '%', backgroundColor: getLevelColor(level) }"></div>
        </div>
        <span class="level-count">{{ getWordsCountByLevel(level) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'ProgressStats',
  props: {
    words: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    const totalWords = computed(() => props.words.length)

    const averageScore = computed(() => {
      if (props.words.length === 0) return 0
      const sum = props.words.reduce((acc, w) => acc + (w.score || 0), 0)
      return (sum / props.words.length).toFixed(1)
    })

    const masteredWords = computed(() => {
      return props.words.filter(w => (w.level || 1) === 5).length
    })

    const getWordsCountByLevel = (level) => {
      return props.words.filter(w => (w.level || 1) === level).length
    }

    const getLevelPercentage = (level) => {
      if (props.words.length === 0) return 0
      return (getWordsCountByLevel(level) / props.words.length) * 100
    }

    const getLevelColor = (level) => {
      const colors = {
        1: '#f44336',
        2: '#ff9800',
        3: '#ffeb3b',
        4: '#4caf50',
        5: '#2196f3'
      }
      return colors[level] || '#ccc'
    }

    return {
      totalWords,
      averageScore,
      masteredWords,
      getWordsCountByLevel,
      getLevelPercentage,
      getLevelColor
    }
  }
}
</script>

<style scoped>
.progress-stats {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 15px;
  margin-top: 20px;
  backdrop-filter: blur(10px);
}

.progress-stats h3 {
  color: white;
  margin-bottom: 15px;
  font-size: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #ffeb3b;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 5px;
}

.level-distribution {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.level-name {
  min-width: 70px;
  font-size: 12px;
  color: white;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.level-count {
  min-width: 40px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  text-align: right;
}
</style>