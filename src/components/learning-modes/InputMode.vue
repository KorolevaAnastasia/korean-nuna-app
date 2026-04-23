<template>
  <div class="input-mode">
    <button @click="$emit('back')" class="back-btn">← Назад к выбору режима</button>

    <div class="controls">
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
          <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 30px;">
            <h2 class="question" style="margin-bottom: 0;">{{ currentQuestion }}</h2>
            <button
                @click="speakWord(currentCard?.korean)"
                class="speak-btn"
                title="Прослушать слово на корейском"
                :disabled="showResult"
            >
              🔊
            </button>
          </div>

          <div class="input-container">
            <input
                v-model="userInput"
                type="text"
                class="answer-input"
                :placeholder="inputPlaceholder"
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
      <h2>Режим Ввода ⌨️</h2>
      <p>Введите перевод слова на корейском языке.</p>
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
  name: 'InputMode',
  emits: ['back'],
  setup(props, { emit }) {
    const quizStarted = ref(false)
    const currentIndex = ref(0)
    const words = ref([])
    const showResult = ref(false)
    const isCorrect = ref(false)
    const correctAnswers = ref(0)
    const autoProgress = ref(0)
    const autoNextTimer = ref(null)
    const isLoading = ref(true)
    const studyMode = ref('all')
    const categoryFilter = ref('')
    const recentCount = ref(100)
    const userInput = ref('')
    const answerInput = ref(null)
    const sessionWords = ref([]) // Слова для текущей сессии

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

    const speakWord = (word) => {
      if (!word) return;

      // Останавливаем текущую речь
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1;

      utterance.onerror = () => {
        console.error('Ошибка воспроизведения');
      };

      window.speechSynthesis.speak(utterance);
    }

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
      return currentCard.value?.level || 1
    })

    const currentWordScore = computed(() => {
      return currentCard.value?.score || 0
    })

    const currentWordConsecutive = computed(() => {
      return currentCard.value?.consecutive_correct || 0
    })

    const progressPercentage = computed(() => {
      return ((currentIndex.value + 1) / sessionWords.value.length) * 100
    })

    const currentQuestion = computed(() => {
      if (!currentCard.value) return ''
      return `${currentCard.value.russian} (${currentCard.value.category})`
    })

    const correctAnswer = computed(() => {
      if (!currentCard.value) return ''
      return currentCard.value.korean
    })

    const inputPlaceholder = computed(() => {
      if (!currentCard.value) return 'Напишите перевод на корейском...'

      // Подсказка в зависимости от уровня слова
      const level = currentCard.value.level || 1
      if (level === 1) {
        return 'Напишите перевод на корейском... (сложное слово)'
      } else if (level === 5) {
        return 'Напишите перевод на корейском... (выученное слово)'
      }
      return 'Напишите перевод на корейском...'
    })

    const startQuiz = () => {
      if (currentWords.value.length === 0) {
        alert('Нет слов для обучения в выбранной категории!')
        return
      }

      // Генерируем умную сессию слов
      if (studyMode.value === 'all' && !categoryFilter.value) {
        // Используем умный выбор для всех слов
        sessionWords.value = getSmartSessionWords(null) // Берем 20 слов для сессии
      } else {
        // Для фильтров используем обычную случайную выборку
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
      userInput.value = ''
      autoProgress.value = 0
      clearTimeout(autoNextTimer.value)

      // Фокус на инпут
      nextTick(() => {
        if (answerInput.value) {
          answerInput.value.focus()
        }
      })
    }

    const checkInputAnswer = async () => {
      if (!userInput.value.trim()) return

      const normalizedInput = userInput.value.trim().toLowerCase()
      const normalizedCorrect = correctAnswer.value.trim().toLowerCase()
      const isAnswerCorrect = normalizedInput === normalizedCorrect

      showResult.value = true
      isCorrect.value = isAnswerCorrect

      if (isAnswerCorrect) {
        correctAnswers.value++

        // Обновляем статистику слова
        try {
          const updatedWord = await updateWordStats(
              currentCard.value.id,
              true,
              currentCard.value
          )

          // Обновляем слово в локальном массиве
          const wordIndex = words.value.findIndex(w => w.id === updatedWord.id)
          if (wordIndex !== -1) {
            words.value[wordIndex] = updatedWord
          }

          // Обновляем в sessionWords
          const sessionIndex = sessionWords.value.findIndex(w => w.id === updatedWord.id)
          if (sessionIndex !== -1) {
            sessionWords.value[sessionIndex] = updatedWord
          }
        } catch (error) {
          console.error('Ошибка обновления статистики:', error)
        }

        startAutoNext()
      } else {
        // Обновляем статистику для неправильного ответа
        try {
          const updatedWord = await updateWordStats(
              currentCard.value.id,
              false,
              currentCard.value
          )

          // Обновляем слово в локальном массиве
          const wordIndex = words.value.findIndex(w => w.id === updatedWord.id)
          if (wordIndex !== -1) {
            words.value[wordIndex] = updatedWord
          }

          // Обновляем в sessionWords
          const sessionIndex = sessionWords.value.findIndex(w => w.id === updatedWord.id)
          if (sessionIndex !== -1) {
            sessionWords.value[sessionIndex] = updatedWord
          }
        } catch (error) {
          console.error('Ошибка обновления статистики:', error)
        }
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
      userInput.value = ''
      autoProgress.value = 0
      clearTimeout(autoNextTimer.value)

      if (currentIndex.value < sessionWords.value.length - 1) {
        currentIndex.value++

        // Фокус на инпут при переходе
        nextTick(() => {
          if (answerInput.value) {
            answerInput.value.focus()
          }
        })
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

    watch([categoryFilter], () => {
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
      currentCard,
      sessionWords,
      showResult,
      isCorrect,
      correctAnswers,
      progressPercentage,
      currentQuestion,
      correctAnswer,
      autoProgress,
      startQuiz,
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
      speakWord,
      inputPlaceholder,
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
.input-mode {
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

.mode-select option {
  background: transparent;
  color: #333;
  padding: 10px;
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
  width: 100%;
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
  width: 100%;
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

.speak-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 8px 12px;
  transition: all 0.3s ease;
  color: white;
}

.speak-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.speak-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

  .question {
    font-size: 1.5em;
    min-height: 50px;
  }

  .card {
    padding: 20px;
  }

  .input-container {
    margin-bottom: 20px;
  }

  .answer-input {
    font-size: 16px;
    padding: 12px 15px;
  }

  .check-btn {
    padding: 12px 15px;
  }

  .welcome {
    padding: 25px;
    margin-top: 20px;
  }

  .welcome h2 {
    font-size: 1.5em;
  }

  .stats-info {
    justify-content: center;
  }
}
</style>