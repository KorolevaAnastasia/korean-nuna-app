<template>
  <div class="flashcards">
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
          Последние 20 слов
        </label>
      </div>

      <button @click="startQuiz" class="btn-start">{{ quizStarted ? 'Перезапустить' : 'Начать обучение' }}</button>
    </div>

    <div v-if="studyMode === 'recent' && !quizStarted" class="mode-info">
      <p>📖 Будет показано последних 20 слов для повторения</p>
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
          Режим: {{ studyMode === 'recent' ? 'Последние 20 слов' : 'Все слова' }}
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
      <h2>Добро пожаловать в режим карточек!</h2>
      <p>Выберите режим обучения и нажмите "Начать обучение".</p>
      <p v-if="isLoading">Загрузка слов...</p>
      <p v-if="!isLoading">Всего загружено: {{ words.length }} слов.</p>
      <p v-if="!isLoading && categories.length > 0">Доступно категорий: {{ categories.length }}</p>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, ref, watch} from 'vue'
import {getKoreanWords} from '../data/words.js'

export default {
  name: 'Flashcards',
  setup() {
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

      // Применяем фильтр по категории
      if (categoryFilter.value) {
        filtered = filtered.filter(word => word.category === categoryFilter.value)
      }

      return filtered
    })

    const currentWords = computed(() => {
      if (!filteredWords.value || filteredWords.value.length === 0) return []

      if (studyMode.value === 'recent') {
        // Берем последние 20 слов из отфильтрованных
        return filteredWords.value.slice(-20)
      } else {
        // Все отфильтрованные слова
        return filteredWords.value
      }
    })

    const shuffledWords = computed(() => {
      if (!currentWords.value || currentWords.value.length === 0) return []
      return [...currentWords.value].sort(() => Math.random() - 0.5)
    })

    const onModeChange = () => {
      if (quizStarted.value) {
        startQuiz() // Перезапускаем при смене режима
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

      // Получаем все возможные варианты переводов из отфильтрованных слов (исключая текущее слово)
      const allOtherWords = filteredWords.value
          .filter(word => word.id !== currentCard.value.id)
          .map(word => {
            return currentDirection.value === 'korean-to-russian'
                ? word.russian
                : word.korean
          })
          .filter((value, index, self) => self.indexOf(value) === index) // Убираем дубликаты

      // Выбираем 3 случайных варианта из всех возможных
      const shuffledOtherWords = [...allOtherWords].sort(() => Math.random() - 0.5)
      const randomOptions = shuffledOtherWords.slice(0, 3)

      // Создаем массив опций: правильный ответ + 3 случайных
      const allOptions = [
        {text: correct, isCorrect: true}
      ]

      // Добавляем 3 случайных варианта
      randomOptions.forEach(word => {
        allOptions.push({text: word, isCorrect: false})
      })

      // Перемешиваем все опции
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
        // Запускаем автоматический переход через 1.5 секунды
        startAutoNext()
      }
      // При неправильном ответе кнопка "Следующая" остается видимой
    }

    const startAutoNext = () => {
      autoProgress.value = 0
      const duration = 1500 // 1.5 секунды
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

    // Очищаем таймер при размонтировании компонента
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
      wordsCount: computed(() => currentWords.value.length),
      words
    }
  }
}
</script>

<style scoped>
/* Стили остаются такими же, только добавим немного отступов для нового селекта */
.controls {
  margin-bottom: 30px;
  display: flex;
  gap: 15px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.mode-switcher {
  display: flex;
  gap: 15px;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 15px;
  border-radius: 10px;
  backdrop-filter: blur(10px);
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

.mode-info {
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  color: white;
  text-align: center;
  backdrop-filter: blur(10px);
}

.mode-info p {
  margin: 0;
  font-size: 16px;
}

.mode-select {
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 10px;
  font-size: 16px;
  background: transparent;
  color: white;
}

.mode-select option {
  background: transparent;
  color: #333;
  padding: 10px;
}

.mode-select option:hover {
  background: #667eea;
  color: white;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    gap: 10px;
  }

  .mode-switcher {
    width: 100%;
    justify-content: center;
  }
}

/* Остальные стили остаются без изменений */
.progress {
  margin-top: 20px;
  color: white;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.progress-info {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 5px;
}

.flashcards {
  text-align: center;
}

.btn-start, .btn-restart {
  background: #4CAF50;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-start:hover, .btn-restart:hover {
  background: #45a049;
  transform: translateY(-2px);
}

.card-container {
  perspective: 1000px;
  margin-bottom: 20px;
}

.card {
  width: 100%;
  max-width: 500px;
  min-height: 400px;
  margin: 0 auto;
  position: relative;
  transition: transform 0.6s;
}

.card-content {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  background: linear-gradient(45deg, #668fea, #9f4ba2);
  color: white;
}

.question {
  font-size: 2em;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.hint {
  margin-bottom: 30px;
  opacity: 0.9;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  max-width: 300px;
  margin-bottom: 30px;
}

.option-btn {
  padding: 15px 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.option-btn:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.option-btn.correct {
  background: #4CAF50;
  border-color: #45a049;
  transform: scale(1.02);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}

.option-btn.incorrect {
  background: #f44336;
  border-color: #da190b;
}

.option-btn.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.option-btn.auto-next::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.5);
  animation: progressBar 1.5s linear forwards;
}

@keyframes progressBar {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}

.correct-message {
  color: #4CAF50;
  font-weight: bold;
  font-size: 1.2em;
  margin-bottom: 10px;
}

.incorrect-message {
  color: #f44336;
  font-weight: bold;
  font-size: 1.2em;
  margin-bottom: 15px;
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

.progress-bar {
  width: 100%;
  max-width: 500px;
  height: 10px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  margin: 10px auto 0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
  border-radius: 5px;
}

.quiz-finished, .welcome {
  background: rgba(255, 255, 255, 0.1);
  padding: 40px;
  border-radius: 10px;
  color: white;
  backdrop-filter: blur(10px);
}

.quiz-finished h2, .welcome h2 {
  margin-bottom: 20px;
}

.result {
  margin-top: 20px;
}

/* Анимации */
.option-btn {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.option-btn.correct {
  animation: correctPulse 0.5s ease-in-out;
}

@keyframes correctPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1.02);
  }
}
</style>