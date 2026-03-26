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

      <div class="stats-info" v-if="quizStarted">
        <span class="stat-badge">📊 Статистика:</span>
        <span class="stat-item">🎯 Уровень: {{ currentWordLevel }}</span>
        <span class="stat-item">⭐ Очки: {{ currentWordScore }}</span>
        <span class="stat-item">🔥 Серия: {{ currentWordConsecutive }}</span>
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
                v-for="(option, optIndex) in currentOptions"
                :key="optIndex"
                @click="checkAnswer(option.isCorrect, optIndex)"
                :class="{
                  'option-btn': true,
                  'correct': option.isCorrect && showResult,
                  'incorrect': !option.isCorrect && showResult && selectedOption === optIndex,
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

      <div class="stats-preview" v-if="!isLoading && words.length > 0">
        <h3>📈 Распределение слов по уровням:</h3>
        <div class="level-stats">
          <div v-for="level in 5" :key="level" class="level-stat">
            <span class="level-label">Уровень {{ level }}:</span>
            <span class="level-count">{{ getWordsCountByLevel(level) }} слов</span>
            <div class="level-bar">
              <div class="level-fill" :style="{ width: getPercentageByLevel(level) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {getKoreanWords} from '../../data/words.js'
import { updateWordStats } from '../../utils/apiService.js'
import { useSmartWordSelector } from '../../composables/useSmartWordSelector.js'

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
    const sessionWords = ref([]) // Слова для текущей сессии

    // Сохраняем текущие опции для карточки, чтобы они не менялись во время ответа
    const frozenOptions = ref([])

    // Подключаем умный выбор слов
    const { getSessionWords: getSmartSessionWords } = useSmartWordSelector(words)

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

    const onModeChange = () => {
      if (quizStarted.value) {
        startQuiz()
      }
    }

    const currentCard = computed(() => {
      return quizStarted.value && sessionWords.value.length > 0
          ? sessionWords.value[currentIndex.value]
          : null
    })

    const currentWordLevel = computed(() => {
      const level = currentCard.value?.level
      return level || 1
    })

    const currentWordScore = computed(() => {
      const score = currentCard.value?.score
      return score || 0
    })

    const currentWordConsecutive = computed(() => {
      const consecutive = currentCard.value?.consecutive_correct
      return consecutive || 0
    })

    const progressPercentage = computed(() => {
      return ((currentIndex.value + 1) / sessionWords.value.length) * 100
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

    // Генерируем опции для текущей карточки
    const generateOptions = () => {
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
    }

    // Используем frozenOptions для отображения, чтобы они не менялись во время ответа
    const currentOptions = computed(() => {
      if (frozenOptions.value.length > 0) {
        return frozenOptions.value
      }
      return generateOptions()
    })

    // Обновление статистики с синхронизацией (локальное обновление + отправка на сервер)
    const updateWordStatsAndSync = async (wordId, isAnswerCorrect, currentWord) => {
      try {
        // Вычисляем новую статистику локально
        let newScore = currentWord.score ?? 0;
        let newLevel = currentWord.level ?? 1;
        let newConsecutive = currentWord.consecutive_correct ?? 0;

        if (isAnswerCorrect) {
          newScore = Math.min(newScore + 1, 10);
          newConsecutive += 1;

          if (newConsecutive >= 3 && newLevel < 5) {
            newLevel += 1;
            newConsecutive = 0;
          }
        } else {
          newScore = Math.max(newScore - 2, 0);
          newConsecutive = 0;

          if (newScore <= 3 && newLevel > 1) {
            newLevel -= 1;
          }
        }

        // Создаем обновленную версию слова
        const updatedWord = {
          ...currentWord,
          score: newScore,
          level: newLevel,
          consecutive_correct: newConsecutive,
          last_reviewed: new Date().toISOString().split('T')[0]
        };

        // Обновляем в локальном массиве words
        const wordIndex = words.value.findIndex(w => w.id === wordId);
        if (wordIndex !== -1) {
          words.value[wordIndex] = updatedWord;
        } else {
          console.warn('Слово не найдено в words.value');
        }

        // Обновляем в sessionWords
        const sessionIndex = sessionWords.value.findIndex(w => w.id === wordId);
        if (sessionIndex !== -1) {
          sessionWords.value[sessionIndex] = updatedWord;
        } else {
          console.warn('Слово не найдено в sessionWords.value');
        }

        // Отправляем на сервер (не ждем, чтобы не блокировать интерфейс)
        updateWordStats(wordId, isAnswerCorrect, currentWord).then(() => {}).catch(error => {
          console.error('Ошибка сохранения статистики на сервере:', error);
        });

        return updatedWord;
      } catch (error) {
        console.error('Ошибка обновления статистики:', error);
        return currentWord;
      }
    }

    const startQuiz = () => {
      if (currentWords.value.length === 0) {
        alert('Нет слов для обучения в выбранной категории!')
        return
      }

      // Генерируем умную сессию слов
      if (studyMode.value === 'all' && !categoryFilter.value) {
        sessionWords.value = getSmartSessionWords(null)
      } else {
        sessionWords.value = [...currentWords.value].sort(() => Math.random() - 0.5)
      }

      if (sessionWords.value.length === 0) {
        alert('Не удалось сформировать сессию обучения!')
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

      // Замораживаем опции для первой карточки
      frozenOptions.value = generateOptions()
    }

    const checkAnswer = async (correct, index) => {
      showResult.value = true
      isCorrect.value = correct
      selectedOption.value = index

      if (correct) {
        correctAnswers.value++

        // Обновляем статистику слова
        await updateWordStatsAndSync(currentCard.value.id, true, currentCard.value)

        startAutoNext()
      } else {
        // Обновляем статистику для неправильного ответа
        await updateWordStatsAndSync(currentCard.value.id, false, currentCard.value)
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

      if (currentIndex.value < sessionWords.value.length - 1) {
        currentIndex.value++
        // Генерируем новые опции для следующей карточки
        frozenOptions.value = generateOptions()
      } else {
        quizStarted.value = false
        alert(`🎉 Сессия завершена! Правильных ответов: ${correctAnswers.value} из ${sessionWords.value.length}`)
      }
    }

    // Вспомогательные функции для статистики
    const getWordsCountByLevel = (level) => {
      if (!words.value) return 0
      return words.value.filter(w => (w.level || 1) === level).length
    }

    const getPercentageByLevel = (level) => {
      if (!words.value || words.value.length === 0) return 0
      return (getWordsCountByLevel(level) / words.value.length) * 100
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
      sessionWords,
      showResult,
      isCorrect,
      selectedOption,
      correctAnswers,
      progressPercentage,
      currentQuestion,
      correctAnswer,
      currentOptions,
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
      filteredWords,
      currentWordLevel,
      currentWordScore,
      currentWordConsecutive,
      getWordsCountByLevel,
      getPercentageByLevel
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

.stats-info {
  display: flex;
  gap: 15px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 15px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  align-items: center;
  flex-wrap: wrap;
}

.stat-badge {
  font-weight: bold;
  color: #ffeb3b;
}

.stat-item {
  font-size: 14px;
  color: white;
}

.stats-preview {
  margin-top: 20px;
  text-align: left;
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 10px;
}

.stats-preview h3 {
  font-size: 16px;
  margin-bottom: 10px;
  color: #ffeb3b;
}

.level-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.level-label {
  min-width: 70px;
  color: white;
}

.level-count {
  min-width: 80px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

.level-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.level-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
  border-radius: 3px;
}
</style>