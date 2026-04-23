<template>
  <div class="syllables-mode">
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
                title="Прослушать слово"
                :disabled="showResult"
            >
              🔊
            </button>
          </div>

          <div class="hint">Соберите слово из слогов:</div>

          <div class="selected-syllables">
            <div v-for="(syllable, index) in selectedOrder"
                 :key="'selected-' + index"
                 class="syllable selected"
                 :class="{ 'disabled': showResult }"
                 @click="!showResult && removeSyllable(index)">
              {{ syllable }}
            </div>
            <div v-if="selectedOrder.length === 0 && !showResult" class="empty-placeholder">
              Кликайте по слогам снизу, чтобы собрать слово
            </div>
            <div v-if="showResult && isCorrect" class="auto-result-message">
              <p class="correct-message">✅ Правильно!</p>
              <div class="auto-progress">
                <div class="progress-bar-auto" :style="{ width: autoProgress + '%' }"></div>
              </div>
            </div>
          </div>

          <div class="available-syllables">
            <div v-for="(syllable, index) in shuffledSyllables"
                 :key="'available-' + index"
                 class="syllable available"
                 :class="{
                   'used': syllableUsed[index],
                   'disabled': showResult
                 }"
                 @click="!showResult && !syllableUsed[index] && addSyllable(syllable, index)">
              {{ syllable }}
            </div>
          </div>

          <div class="actions">
            <button
                @click="checkSyllables"
                class="check-btn"
                :disabled="showResult || selectedOrder.length !== currentSyllables.length"
            >
              Проверить
            </button>
<!--            <button
                @click="resetSelection"
                class="reset-btn"
                :disabled="showResult"
            >
              Сбросить
            </button>-->
          </div>

          <div v-if="showResult && !isCorrect" class="result">
            <p class="incorrect-message">❌ Правильно: {{ correctAnswer }}</p>
            <p class="your-answer">Ваш вариант: {{ userAnswer }}</p>
            <button @click="nextCard" class="btn-next">Следующая карточка</button>
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
      <h2>Режим Сборки слогов 🧩</h2>
      <p>Соберите корейское слово из слогов в правильном порядке.</p>
      <p>Кликайте по слогам, чтобы добавлять их в область сборки.</p>
      <p v-if="isLoading">Загрузка слов...</p>
      <p v-if="!isLoading">Всего загружено: {{ words.length }} слов.</p>
      <p v-if="!isLoading && categories.length > 0">Доступно категорий: {{ categories.length }}</p>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, ref, watch} from 'vue'
import {getKoreanWords} from '../../data/words.js'
import { updateWordStats } from '../../utils/apiService.js'
import { useSmartWordSelector } from '../../composables/useSmartWordSelector.js'

export default {
  name: 'SyllablesMode',
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
    const sessionWords = ref([])

    const { getSessionWords: getSmartSessionWords } = useSmartWordSelector(words)

    // Для режима сборки слогов
    const selectedOrder = ref([])
    const syllableUsed = ref({})
    const shuffledSyllables = ref([])
    const currentSyllables = ref([])
    const userAnswer = ref('')

    onMounted(async () => {
      try {
        words.value = await getKoreanWords()
      } catch (error) {
        console.error('Ошибка загрузки слов:', error)
      } finally {
        isLoading.value = false
      }
    })

    // Функция для разделения на слоги
    const splitIntoSyllables = (koreanWord) => {
      const syllables = []

      for (let i = 0; i < koreanWord.length; i++) {
        const char = koreanWord[i]

        if (char === ' ') {
          syllables.push(' ')
        } else {
          const nextChar = koreanWord[i + 1]

          const digraphs = {
            'ㄲ': true, 'ㄸ': true, 'ㅃ': true, 'ㅆ': true, 'ㅉ': true,
            'ㄳ': true, 'ㄵ': true, 'ㄶ': true, 'ㄺ': true, 'ㄻ': true,
            'ㄼ': true, 'ㄽ': true, 'ㄾ': true, 'ㄿ': true, 'ㅀ': true, 'ㅄ': true
          }

          const diphthongs = {
            'ㅐ': true, 'ㅒ': true, 'ㅔ': true, 'ㅖ': true, 'ㅘ': true,
            'ㅙ': true, 'ㅚ': true, 'ㅝ': true, 'ㅞ': true, 'ㅟ': true, 'ㅢ': true
          }

          const potentialDigraph = char + nextChar
          if (nextChar && (digraphs[potentialDigraph] || diphthongs[potentialDigraph])) {
            syllables.push(potentialDigraph)
            i++
          } else {
            syllables.push(char)
          }
        }
      }

      return syllables.filter(s => s !== '')
    }

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

    const currentWordLevel = computed(() => currentCard.value?.level || 1)
    const currentWordScore = computed(() => currentCard.value?.score || 0)
    const currentWordConsecutive = computed(() => currentCard.value?.consecutive_correct || 0)

    const updateWordStatsAndSync = async (wordId, isAnswerCorrect, currentWord) => {
      try {
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

        const updatedWord = {
          ...currentWord,
          score: newScore,
          level: newLevel,
          consecutive_correct: newConsecutive,
          last_reviewed: new Date().toISOString().split('T')[0]
        };

        const wordIndex = words.value.findIndex(w => w.id === wordId);
        if (wordIndex !== -1) {
          words.value[wordIndex] = updatedWord;
        }

        const sessionIndex = sessionWords.value.findIndex(w => w.id === wordId);
        if (sessionIndex !== -1) {
          sessionWords.value[sessionIndex] = updatedWord;
        }

        updateWordStats(wordId, isAnswerCorrect, currentWord).catch(error => {
          console.error('Ошибка сохранения статистики на сервере:', error);
        });

        return updatedWord;
      } catch (error) {
        console.error('Ошибка обновления статистики:', error);
        return currentWord;
      }
    }

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
        console.error('Ошибка воспроизведения корейского слова');
      };

      window.speechSynthesis.speak(utterance);
    }

    const startQuiz = () => {
      if (currentWords.value.length === 0) {
        alert('Нет слов для обучения в выбранной категории!')
        return
      }

      // Всегда используем умную выборку для режима "Все слова"
      if (studyMode.value === 'all') {
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
      isCorrect.value = false
      correctAnswers.value = 0
      autoProgress.value = 0
      clearTimeout(autoNextTimer.value)

      prepareSyllablesForCurrentCard()
    }

    const prepareSyllablesForCurrentCard = () => {
      if (!currentCard.value) return

      const koreanWord = currentCard.value.korean
      currentSyllables.value = splitIntoSyllables(koreanWord)
      shuffledSyllables.value = [...currentSyllables.value].sort(() => Math.random() - 0.5)

      // Сбрасываем только состояние сборки, НЕ сбрасываем showResult и autoProgress
      syllableUsed.value = {}
      selectedOrder.value = []
      userAnswer.value = ''
    }

    const addSyllable = (syllable, index) => {
      if (showResult.value) return

      if (syllableUsed.value[index]) {
        const syllableIndex = selectedOrder.value.indexOf(syllable)
        if (syllableIndex > -1) {
          const allIndices = []
          shuffledSyllables.value.forEach((s, i) => {
            if (s === syllable && syllableUsed.value[i]) {
              allIndices.push(i)
            }
          })
          if (allIndices.length > 0) {
            syllableUsed.value[allIndices[0]] = false
          }
          selectedOrder.value.splice(syllableIndex, 1)
        }
      } else {
        syllableUsed.value[index] = true
        selectedOrder.value.push(syllable)
      }
    }

    const removeSyllable = (index) => {
      if (showResult.value) return

      const removedSyllable = selectedOrder.value[index]
      selectedOrder.value.splice(index, 1)

      for (const key in syllableUsed.value) {
        if (syllableUsed.value[key] && shuffledSyllables.value[key] === removedSyllable) {
          syllableUsed.value[key] = false
          break
        }
      }
    }

    const resetSelection = () => {
      if (showResult.value) return
      selectedOrder.value = []
      syllableUsed.value = {}
    }

    const checkSyllables = async () => {
      if (showResult.value) return

      userAnswer.value = selectedOrder.value.join('')
      const isAnswerCorrect = userAnswer.value === currentCard.value.korean

      showResult.value = true
      isCorrect.value = isAnswerCorrect

      if (isAnswerCorrect) {
        correctAnswers.value++
        await updateWordStatsAndSync(currentCard.value.id, true, currentCard.value)

        speakWord(currentCard.value.korean)

        startAutoNext()
      } else {
        await updateWordStatsAndSync(currentCard.value.id, false, currentCard.value)
        // При неправильном ответе не запускаем авто-переход, ждем кнопку
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
      // Сбрасываем состояние перед следующей карточкой
      showResult.value = false
      isCorrect.value = false
      autoProgress.value = 0
      clearTimeout(autoNextTimer.value)

      if (currentIndex.value < sessionWords.value.length - 1) {
        currentIndex.value++
        prepareSyllablesForCurrentCard()
      } else {
        quizStarted.value = false
        alert(`🎉 Сессия завершена! Правильных ответов: ${correctAnswers.value} из ${sessionWords.value.length}`)
      }
    }

    watch([categoryFilter], () => {
      if (quizStarted.value) {
        startQuiz()
      }
    })

    watch(currentCard, () => {
      if (quizStarted.value && currentCard.value) {
        prepareSyllablesForCurrentCard()
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
      speakWord,
      checkSyllables,
      nextCard,
      isLoading,
      studyMode,
      onModeChange,
      categoryFilter,
      categories,
      recentCount,
      selectedOrder,
      syllableUsed,
      shuffledSyllables,
      currentSyllables,
      userAnswer,
      addSyllable,
      removeSyllable,
      resetSelection,
      wordsCount: computed(() => currentWords.value.length),
      words,
      filteredWords,
      currentWordLevel,
      currentWordScore,
      currentWordConsecutive,
    }
  }
}
</script>

<style scoped>
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

.syllable.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.syllable.available.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.correct-placeholder {
  color: #4CAF50;
  font-style: italic;
  font-size: 14px;
  text-align: center;
  width: 100%;
}

.syllables-mode {
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
  text-align: center;
  font-size: 16px;
  opacity: 0.9;
}

.selected-syllables {
  min-height: 100px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(255, 255, 255, 0.2);
}

.empty-placeholder {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  font-size: 14px;
}

.available-syllables {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 25px;
  min-height: 80px;
}

.syllable {
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  min-width: 50px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
}

.syllable.available {
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.syllable.available:hover:not(.used) {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.syllable.available.used {
  opacity: 0.3;
  cursor: not-allowed;
}

.syllable.selected {
  background: rgba(102, 126, 234, 0.7);
  border: 2px solid #667eea;
  position: relative;
}

.syllable.selected:hover {
  background: rgba(102, 126, 234, 0.9);
  transform: scale(1.05);
}

.syllable.selected::after {
  content: '✕';
  position: absolute;
  top: -8px;
  right: -8px;
  background: #f44336;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
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

.actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-bottom: 20px;
}

.check-btn, .reset-btn {
  padding: 12px 30px;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.check-btn {
  background: #4CAF50;
  color: white;
}

.check-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-2px);
}

.check-btn:disabled {
  background: #666;
  cursor: not-allowed;
  transform: none;
}

.reset-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.reset-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.result {
  text-align: center;
  margin-top: 20px;
}

.correct-message, .incorrect-message {
  font-size: 1.2em;
  margin-bottom: 10px;
  font-weight: bold;
}

.correct-message {
  color: #4CAF50;
}

.incorrect-message {
  color: #f44336;
}

.your-answer {
  margin-bottom: 15px;
  font-size: 16px;
  opacity: 0.9;
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
  line-height: 1.5;
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

  .syllable {
    padding: 10px 15px;
    font-size: 18px;
    min-width: 40px;
  }

  .selected-syllables {
    min-height: 80px;
    padding: 15px;
  }

  .available-syllables {
    min-height: 60px;
  }

  .actions {
    flex-direction: column;
    gap: 10px;
  }

  .check-btn, .reset-btn {
    width: 100%;
  }

  .welcome {
    padding: 25px;
    margin-top: 20px;
  }

  .welcome h2 {
    font-size: 1.5em;
  }

  .welcome p {
    font-size: 15px;
  }
}
</style>