<template>
  <div class="flashcards-mode">
    <button @click="$emit('back')" class="back-btn">← Назад к выбору режима</button>

    <div class="controls">
      <select id="mode-select" v-model="quizMode" class="mode-select">
        <option value="korean-to-russian">Корейский → Русский</option>
        <option value="russian-to-korean">Русский → Корейский</option>
        <option value="mixed">Смешанный режим</option>
      </select>

      <select v-model="categoryFilter" class="mode-select">
        <option value="">Все категории</option>
        <option v-for="category in categories" :key="category" :value="category">
          {{ category }}
        </option>
      </select>

      <div class="mode-switcher">
        <label class="mode-label">
          <input
              type="radio"
              v-model="studyMode"
              value="all"
              @change="onModeChange"
          >
          Все слова
        </label>
        <label class="mode-label">
          <input
              type="radio"
              v-model="studyMode"
              value="recent"
              @change="onModeChange"
          >
          Последние
          <input
              v-model.number="recentCount"
              type="number"
              min="1"
              :max="filteredWords.length"
              class="count-input"
              @change="onModeChange"
          >
          слов
        </label>
      </div>

      <button @click="startQuiz" class="btn-start">{{ quizStarted ? 'Перезапустить' : 'Начать обучение' }}</button>
    </div>

    <div v-if="studyMode === 'recent' && !quizStarted" class="mode-info">
      <p>📖 Будет показано последних {{ recentCount }} слов для повторения</p>
    </div>

    <div v-if="categoryFilter && !quizStarted" class="mode-info">
      <p>🎯 Выбрана категория: "{{ categoryFilter }}"</p>
    </div>

    <div v-if="currentCard && quizStarted" class="card-container">
      <div class="card">
        <div class="card-content">
          <h2 class="question">{{ currentQuestion }}</h2>

          <p class="hint">Выберите правильный перевод:</p>
          <div class="options">
            <button
                v-for="(option, index) in options"
                :key="index"
                @click="checkAnswer(option.isCorrect, index)"
                :class="{
                  'option-btn': true,
                  'correct': option.isCorrect && showResult,
                  'incorrect': !option.isCorrect && showResult && selectedOption === index,
                  'disabled': showResult,
                }"
                :disabled="showResult"
            >
              {{ option.text }}
            </button>
          </div>

          <div v-if="showResult && !isCorrect" class="result">
            <p class="incorrect-message">❌ Правильный ответ: {{ correctAnswer }}</p>
            <button @click="nextCard" class="btn-next">Следующая карточка</button>
          </div>

          <div v-if="showResult && isCorrect" class="auto-result">
            <p class="correct-message">✅ Правильно!</p>
            <div class="auto-progress">
              <div class="progress-bar-auto" :style="{ width: autoProgress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="progress">
        <div class="progress-info">
          Режим: {{ studyMode === 'recent' ? `Последние ${recentCount} слов` : 'Все слова' }}
          | Категория: {{ categoryFilter || 'Все' }}
          (всего: {{ wordsCount }})
        </div>
        Прогресс: {{ currentIndex + 1 }} / {{ shuffledWords.length }}
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
      </div>
    </div>

    <div v-else class="welcome">
      <h2>Режим Карточки 🃏</h2>
      <p>Выберите параметры обучения и нажмите "Начать обучение".</p>
      <p v-if="isLoading">Загрузка слов...</p>
      <p v-if="!isLoading">Всего загружено: {{ words.length }} слов.</p>
      <p v-if="!isLoading && categories.length > 0">Доступно категорий: {{ categories.length }}</p>
    </div>
  </div>
</template>

<script>
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {getKoreanWords} from '../../data/words.js'

export default {
  name: 'FlashcardsMode',
  emits: ['back'],
  setup(props, { emit }) {
    const quizStarted = ref(false)
    const currentIndex = ref(0)
    const quizMode = ref('korean-to-russian')
    const words = ref([])
    const showResult = ref(false)
    const isCorrect = ref(false)
    const selectedOption = ref(null)
    const correctAnswers = ref(0)
    const currentDirection = ref('korean-to-russian')
    const autoProgress = ref(0)
    const autoNextTimer = ref(null)
    const isLoading = ref(true)
    const studyMode = ref('all')
    const categoryFilter = ref('')
    const recentCount = ref(100)

    onMounted(async () => {
      try {
        words.value = await getKoreanWords()
      } catch (error) {
        console.error('Ошибка загрузки слов:', error)
      } finally {
        isLoading.value = false
      }
    })

    const categories = computed(() => {
      if (!words.value || words.value.length === 0) return []
      return [...new Set(words.value.map(word => word.category))].sort()
    })

    const filteredWords = computed(() => {
      if (!words.value || words.value.length === 0) return []

      let filtered = words.value

      if (categoryFilter.value) {
        filtered = filtered.filter(word => word.category === categoryFilter.value)
      }

      return filtered
    })

    const currentWords = computed(() => {
      if (!filteredWords.value || filteredWords.value.length === 0) return []

      if (studyMode.value === 'recent') {
        const count = Math.min(recentCount.value, filteredWords.value.length)
        return filteredWords.value.slice(-count)
      } else {
        return filteredWords.value
      }
    })

    const shuffledWords = computed(() => {
      if (!currentWords.value || currentWords.value.length === 0) return []
      return [...currentWords.value].sort(() => Math.random() - 0.5)
    })

    const onModeChange = () => {
      if (quizStarted.value) {
        startQuiz()
      }
    }

    const currentCard = computed(() => {
      return quizStarted.value && shuffledWords.value.length > 0
          ? shuffledWords.value[currentIndex.value]
          : null
    })

    const progressPercentage = computed(() => {
      return ((currentIndex.value + 1) / shuffledWords.value.length) * 100
    })

    const getCurrentDirection = () => {
      if (quizMode.value === 'mixed') {
        return Math.random() > 0.5 ? 'korean-to-russian' : 'russian-to-korean'
      }
      return quizMode.value
    }

    const currentQuestion = computed(() => {
      if (!currentCard.value) return ''

      currentDirection.value = getCurrentDirection()

      return currentDirection.value === 'korean-to-russian'
          ? currentCard.value.korean
          : currentCard.value.russian
    })

    const correctAnswer = computed(() => {
      if (!currentCard.value) return ''

      return currentDirection.value === 'korean-to-russian'
          ? currentCard.value.russian
          : currentCard.value.korean
    })

    const options = computed(() => {
      if (!currentCard.value) return []

      const correct = correctAnswer.value

      const allOtherWords = filteredWords.value
          .filter(word => word.id !== currentCard.value.id)
          .map(word => {
            return currentDirection.value === 'korean-to-russian'
                ? word.russian
                : word.korean
          })
          .filter((value, index, self) => self.indexOf(value) === index)

      const shuffledOtherWords = [...allOtherWords].sort(() => Math.random() - 0.5)
      const randomOptions = shuffledOtherWords.slice(0, 3)

      const allOptions = [
        {text: correct, isCorrect: true}
      ]

      randomOptions.forEach(word => {
        allOptions.push({text: word, isCorrect: false})
      })

      return allOptions.sort(() => Math.random() - 0.5)
    })

    const startQuiz = () => {
      if (currentWords.value.length === 0) {
        alert('Нет слов для обучения в выбранной категории!')
        return
      }

      quizStarted.value = true
      currentIndex.value = 0
      showResult.value = false
      correctAnswers.value = 0
      selectedOption.value = null
      autoProgress.value = 0
      clearTimeout(autoNextTimer.value)
      currentDirection.value = getCurrentDirection()
    }

    const checkAnswer = (correct, index) => {
      showResult.value = true
      isCorrect.value = correct
      selectedOption.value = index

      if (correct) {
        correctAnswers.value++
        startAutoNext()
      }
    }

    const startAutoNext = () => {
      autoProgress.value = 0
      const duration = 1500
      const steps = 30
      const stepDuration = duration / steps

      let step = 0
      const timer = setInterval(() => {
        step++
        autoProgress.value = (step / steps) * 100

        if (step >= steps) {
          clearInterval(timer)
          nextCard()
        }
      }, stepDuration)
    }

    const nextCard = () => {
      showResult.value = false
      selectedOption.value = null
      autoProgress.value = 0
      clearTimeout(autoNextTimer.value)

      if (currentIndex.value < shuffledWords.value.length - 1) {
        currentIndex.value++
      } else {
        quizStarted.value = false
      }
    }

    watch([quizMode, categoryFilter], () => {
      if (quizStarted.value) {
        startQuiz()
      }
    })

    onMounted(() => {
      return () => {
        clearTimeout(autoNextTimer.value)
      }
    })

    return {
      quizStarted,
      currentIndex,
      quizMode,
      currentCard,
      shuffledWords,
      showResult,
      isCorrect,
      selectedOption,
      correctAnswers,
      progressPercentage,
      currentQuestion,
      correctAnswer,
      options,
      autoProgress,
      startQuiz,
      checkAnswer,
      nextCard,
      isLoading,
      studyMode,
      onModeChange,
      categoryFilter,
      categories,
      recentCount,
      wordsCount: computed(() => currentWords.value.length),
      words,
      filteredWords
    }
  }
}
</script>

<style scoped>
.flashcards-mode {
  max-width: 800px;
  margin: 0 auto;
}

.back-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 10px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.controls {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
  justify-content: center;
}

.mode-switcher {
  display: flex;
  gap: 15px;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 15px;
  border-radius: 10px;
  backdrop-filter: blur(10px);
  align-items: center;
  flex-wrap: wrap;
}

.mode-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.mode-label:hover {
  color: #ffeb3b;
}

.mode-label input[type="radio"] {
  margin: 0;
  width: 16px;
  height: 16px;
  accent-color: #4CAF50;
}

.count-input {
  width: 60px;
  padding: 5px 8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  text-align: center;
}

.mode-select {
  padding: 10px 15px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
  min-width: 200px;
  backdrop-filter: blur(10px);
}

.btn-start {
  background: #4CAF50;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-start:hover {
  background: #45a049;
  transform: translateY(-2px);
}

.card-container {
  margin-top: 20px;
}

.card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 30px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 20px;
}

.card-content {
  color: white;
}

.question {
  font-size: 2em;
  margin-bottom: 30px;
  text-align: center;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hint {
  margin-bottom: 20px;
  opacity: 0.9;
  text-align: center;
  font-size: 16px;
}

.options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.option-btn {
  padding: 15px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.option-btn:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.option-btn.correct {
  background: #4CAF50;
  border-color: #45a049;
  transform: scale(1.02);
}

.option-btn.incorrect {
  background: #f44336;
  border-color: #da190b;
}

.option-btn.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.result {
  text-align: center;
  margin-top: 20px;
}

.correct-message, .incorrect-message {
  font-size: 1.2em;
  margin-bottom: 15px;
  font-weight: bold;
}

.correct-message {
  color: #4CAF50;
}

.incorrect-message {
  color: #f44336;
}

.btn-next {
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;
}

.btn-next:hover {
  background: white;
  color: #667eea;
}

.auto-result {
  text-align: center;
  margin-top: 20px;
}

.auto-progress {
  width: 200px;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
  margin: 10px auto 0;
}

.progress-bar-auto {
  height: 100%;
  background: #4CAF50;
  transition: width 0.05s linear;
  border-radius: 3px;
}

.progress {
  color: white;
  font-size: 16px;
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}

.progress-info {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 10px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  margin-top: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
  border-radius: 5px;
}

.welcome {
  background: rgba(255, 255, 255, 0.1);
  padding: 40px;
  border-radius: 10px;
  color: white;
  backdrop-filter: blur(10px);
  text-align: center;
  margin-top: 40px;
}

.welcome h2 {
  margin-bottom: 20px;
  font-size: 1.8em;
}

.welcome p {
  margin-bottom: 10px;
  font-size: 16px;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .mode-switcher {
    justify-content: center;
  }

  .mode-select {
    min-width: unset;
    width: 100%;
  }

  .options {
    grid-template-columns: 1fr;
  }

  .question {
    font-size: 1.5em;
    min-height: 50px;
  }

  .card {
    padding: 20px;
  }

  .welcome {
    padding: 25px;
    margin-top: 20px;
  }

  .welcome h2 {
    font-size: 1.5em;
  }

  .mode-info {
    padding: 10px;
    margin-bottom: 15px;
    font-size: 14px;
  }
}
</style>