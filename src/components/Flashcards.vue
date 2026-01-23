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

      <div class="quiz-type-switcher">
        <label class="mode-label">
          <input
              type="radio"
              v-model="quizType"
              value="choice"
              @change="onModeChange"
          >
          📝 Выбор ответа
        </label>
        <label class="mode-label">
          <input
              type="radio"
              v-model="quizType"
              value="input"
              @change="onModeChange"
          >
          ⌨️ Ввод ответа
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

          <!-- Режим выбора ответа -->
          <div v-if="quizType === 'choice'">
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

          <!-- Режим ввода ответа -->
          <div v-else-if="quizType === 'input'">
            <div class="input-container">
              <input
                  v-model="userInput"
                  type="text"
                  class="answer-input"
                  placeholder="Введите ответ..."
                  @keyup.enter="checkInputAnswer"
                  :disabled="showResult"
                  ref="answerInput"
              >
              <button
                  @click="checkInputAnswer"
                  class="check-btn"
                  :disabled="showResult || !userInput.trim()"
              >
                Проверить
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
      </div>

      <div class="progress">
        <div class="progress-info">
          Режим: {{ studyMode === 'recent' ? `Последние ${recentCount} слов` : 'Все слова' }}
          | Категория: {{ categoryFilter || 'Все' }}
          | Тип: {{ quizType === 'choice' ? 'Выбор' : 'Ввод' }}
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
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {getKoreanWords} from '../data/words.js'

export default {
  name: 'Flashcards',
  setup() {
    const quizStarted = ref(false)
    const currentIndex = ref(0)
    const quizMode = ref('korean-to-russian')
    const quizType = ref('choice') // 'choice' или 'input'
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
    const userInput = ref('')
    const answerInput = ref(null)

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

      // В режиме ввода всегда показываем русский → корейский
      if (quizType.value === 'input') {
        return `${currentCard.value.russian} (${currentCard.value.category})`
      }

      return currentDirection.value === 'korean-to-russian'
          ? currentCard.value.korean
          : currentCard.value.russian
    })

    const correctAnswer = computed(() => {
      if (!currentCard.value) return ''

      // В режиме ввода всегда корейский ответ
      if (quizType.value === 'input') {
        return currentCard.value.korean
      }

      return currentDirection.value === 'korean-to-russian'
          ? currentCard.value.russian
          : currentCard.value.korean
    })

    const options = computed(() => {
      if (!currentCard.value || quizType.value === 'input') return []

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
      userInput.value = ''
      autoProgress.value = 0
      clearTimeout(autoNextTimer.value)
      currentDirection.value = getCurrentDirection()

      // Фокус на инпут в режиме ввода
      if (quizType.value === 'input') {
        nextTick(() => {
          if (answerInput.value) {
            answerInput.value.focus()
          }
        })
      }
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

    const checkInputAnswer = () => {
      if (!userInput.value.trim()) return

      const normalizedInput = userInput.value.trim().toLowerCase()
      const normalizedCorrect = correctAnswer.value.trim().toLowerCase()

      showResult.value = true
      isCorrect.value = normalizedInput === normalizedCorrect

      if (isCorrect.value) {
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
      userInput.value = ''
      autoProgress.value = 0
      clearTimeout(autoNextTimer.value)

      if (currentIndex.value < shuffledWords.value.length - 1) {
        currentIndex.value++

        // Фокус на инпут при переходе к следующей карточке
        if (quizType.value === 'input') {
          nextTick(() => {
            if (answerInput.value) {
              answerInput.value.focus()
            }
          })
        }
      } else {
        quizStarted.value = false
      }
    }

    watch([quizMode, categoryFilter, quizType], () => {
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
      quizType,
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
      checkInputAnswer,
      nextCard,
      isLoading,
      studyMode,
      onModeChange,
      categoryFilter,
      categories,
      recentCount,
      userInput,
      answerInput,
      wordsCount: computed(() => currentWords.value.length),
      words,
      filteredWords
    }
  }
}
</script>

<style scoped>
.controls {
  margin-bottom: 30px;
  display: flex;
  gap: 15px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.mode-switcher, .quiz-type-switcher {
  display: flex;
  gap: 15px;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 15px;
  border-radius: 10px;
  backdrop-filter: blur(10px);
  align-items: center;
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

.count-input::-webkit-outer-spin-button,
.count-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
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

.input-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  max-width: 400px;
  margin: 0 auto 30px;
}

.answer-input {
  padding: 15px 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  font-size: 18px;
  text-align: center;
  transition: all 0.3s ease;
}

.answer-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
}

.answer-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.check-btn {
  padding: 15px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.check-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-2px);
}

.check-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.your-answer {
  color: #f44336;
  font-size: 16px;
  margin-top: 10px;
  font-style: italic;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    gap: 10px;
  }

  .mode-switcher, .quiz-type-switcher {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .count-input {
    width: 50px;
  }
}

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

.btn-start {
  background: #4CAF50;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-start:hover {
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
  color: white;
  background: rgba(255, 255, 255, 0.192);
  backdrop-filter: blur(10px);
  border: 1px solid rgb(43 43 43 / 10%);
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

.welcome {
  background: rgba(255, 255, 255, 0.1);
  padding: 40px;
  border-radius: 10px;
  color: white;
  backdrop-filter: blur(10px);
}

.welcome h2 {
  margin-bottom: 20px;
}

.result {
  margin-top: 20px;
}

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