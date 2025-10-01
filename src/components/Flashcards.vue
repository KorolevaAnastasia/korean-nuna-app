<template>
  <div class="flashcards">
    <div class="controls">
      <select id="mode-select" v-model="quizMode" class="mode-select">
        <option value="korean-to-russian">Корейский → Русский</option>
        <option value="russian-to-korean">Русский → Корейский</option>
        <option value="mixed">Смешанный режим</option>
        <option value="matching">Сопоставление</option>
      </select>

      <div class="mode-switcher">
        <label class="mode-label">
          <input type="radio" v-model="studyMode" value="all" @change="onModeChange">
          Все слова
        </label>
        <label class="mode-label">
          <input type="radio" v-model="studyMode" value="recent" @change="onModeChange">
          Последние 20 слов
        </label>
      </div>

      <button @click="startQuiz" class="btn-start">{{ quizStarted ? 'Перезапустить' : 'Начать обучение' }}</button>
    </div>

    <!-- Блок приветствия -->
    <div v-if="!quizStarted" class="welcome">
      <h2>Добро пожаловать в режим карточек!</h2>
      <p>Выберите режим обучения и нажмите "Начать обучение".</p>
      <p v-if="isLoading">Загрузка слов...</p>
      <p v-if="!isLoading">Всего загружено: {{ shuffledWords.length }}.</p>
    </div>

    <div v-else-if="quizMode === 'matching' && quizStarted" class="matching-game">
      <p class="matching-hint">Сопоставьте корейские слова с русскими</p>
      <div class="matching-container">
        <div class="words-column korean-column">
          <h4>Корейские</h4>
          <div
              v-for="(word, index) in matchingGame.koreanWords"
              :key="'korean-' + index"
              :class="{
            'word-item': true,
            'selected': selectedKorean === index,
            'connected': getConnectionColor(index, 'korean'),
            'correct': showMatchingResult && getConnectionStatus(index, 'korean') === 'correct',
            'incorrect': showMatchingResult && getConnectionStatus(index, 'korean') === 'incorrect'
          }"
              :style="getConnectionStyle(index, 'korean')"
              @click="selectKorean(index)"
          >
            {{ word.korean }}
            <span v-if="showMatchingResult && getConnectionStatus(index, 'korean') === 'correct'"
                  class="check-mark">✅</span>
            <span v-if="showMatchingResult && getConnectionStatus(index, 'korean') === 'incorrect'"
                  class="cross-mark">❌</span>
          </div>
        </div>

        <div class="words-column russian-column">
          <h4>Русские</h4>
          <div
              v-for="(word, index) in matchingGame.russianWords"
              :key="'russian-' + index"
              :class="{
            'word-item': true,
            'selected': selectedRussian === index,
            'connected': getConnectionColor(index, 'russian'),
            'correct': showMatchingResult && getConnectionStatus(index, 'russian') === 'correct',
            'incorrect': showMatchingResult && getConnectionStatus(index, 'russian') === 'incorrect'
          }"
              :style="getConnectionStyle(index, 'russian')"
              @click="selectRussian(index)"
          >
            {{ word.russian }}
            <span v-if="showMatchingResult && getConnectionStatus(index, 'russian') === 'correct'"
                  class="check-mark">✅</span>
            <span v-if="showMatchingResult && getConnectionStatus(index, 'russian') === 'incorrect'" class="cross-mark">❌</span>
          </div>
        </div>
      </div>

      <div class="current-connections">
        <p v-if="Object.keys(matchingGame.userConnections).length > 0">
          📍 Созданные связи: {{ Object.keys(matchingGame.userConnections).length }}/4
        </p>

        <div v-if="Object.keys(matchingGame.userConnections).length === 4" class="auto-check">
          <p>🔍 Проверяем связи...</p>
          <div class="auto-progress">
            <div class="progress-bar-auto" :style="{ width: autoProgress + '%' }"></div>
          </div>
        </div>
      </div>

      <div v-if="showMatchingResult && !isMatchingCorrect" class="matching-result">
        <p class="incorrect-message">
          ❌ Есть ошибки. Неправильные связи выделены красным.
        </p>

        <button @click="nextCard" class="btn-next">
          {{ 'Следующий набор слов' }}
        </button>
      </div>
    </div>

    <!-- ОБЫЧНЫЙ РЕЖИМ КАРТОЧЕК -->
    <div v-else-if="quizStarted && currentCard && quizMode !== 'matching'" class="card-container">
      <!-- Весь существующий код карточек -->
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
    </div>

    <div v-else-if="quizStarted" class="quiz-finished">
      <h2>🎉 Отлично! Вы завершили обучение!</h2>
      <p>Правильных ответов: {{ correctAnswers }} из {{ shuffledWords.length }}</p>
      <button @click="startQuiz" class="btn-restart">Начать заново</button>
    </div>

    <div v-if="quizStarted" class="progress">
      <div class="progress-info">
        Режим:
        <span v-if="quizMode === 'matching'">Сопоставление (по 4 слова)</span>
        <span v-else-if="studyMode === 'recent'">Последние 20 слов</span>
        <span v-else>Все слова</span>
        (всего: {{ wordsCount }})
      </div>
      Прогресс: {{ currentIndex + 1 }} / {{ shuffledWords.length }}
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
      </div>
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
    const selectedKorean = ref(null)
    const selectedRussian = ref(null)
    const showMatchingResult = ref(false)
    const isMatchingCorrect = ref(false)
    const connectionColors = [
      '#a12bca', '#ddc317', '#45B7D1', '#c8741f',
    ]

    const matchingGame = ref({
      koreanWords: [],
      russianWords: [],
      correctPairs: {},
      userConnections: {},
      matchedPairs: {korean: {}, russian: {}}
    })

    onMounted(async () => {
      try {
        words.value = await getKoreanWords()
      } catch (error) {
        console.error('Ошибка загрузки слов:', error)
      } finally {
        isLoading.value = false
      }
    })

    const getConnectionStyle = (index, type) => {
      const color = getConnectionColor(index, type)
      if (color) {
        return {
          borderColor: color,
          boxShadow: `0 0 10px ${color}40`
        }
      }
      return {}
    }

    const getConnectionColor = (index, type) => {
      if (type === 'korean') {
        const connection = Object.values(matchingGame.value.userConnections)
            .find(conn => conn.koreanIndex === index)
        if (connection) {
          return connectionColors[connection.koreanIndex] || connectionColors[0]
        }
      } else {
        const connection = Object.values(matchingGame.value.userConnections)
            .find(conn => conn.russianIndex === index)
        if (connection) {
          return connectionColors[connection.koreanIndex] || connectionColors[0]
        }
      }
      return null
    }

    const tryCreateConnection = () => {
      if (selectedKorean.value !== null && selectedRussian.value !== null) {
        const connectionId = `${selectedKorean.value}-${selectedRussian.value}`

        // Проверяем, не создана ли уже связь для этих слов
        const koreanAlreadyConnected = Object.values(matchingGame.value.userConnections)
            .some(conn => conn.koreanIndex === selectedKorean.value)
        const russianAlreadyConnected = Object.values(matchingGame.value.userConnections)
            .some(conn => conn.russianIndex === selectedRussian.value)

        if (!koreanAlreadyConnected && !russianAlreadyConnected) {
          matchingGame.value.userConnections[connectionId] = {
            koreanIndex: selectedKorean.value,
            russianIndex: selectedRussian.value,
            correct: matchingGame.value.correctPairs[selectedKorean.value] === selectedRussian.value,
            checked: false
          }
        }

        // Сбрасываем выбор
        selectedKorean.value = null
        selectedRussian.value = null

        // Автоматически проверяем, если создано 4 связи
        if (Object.keys(matchingGame.value.userConnections).length === 4) {
          checkMatchingAutomatically()
        }
      }
    }

    const checkMatchingAutomatically = () => {
      let allCorrect = true

      // Проверяем каждую связь
      Object.keys(matchingGame.value.userConnections).forEach(connectionId => {
        const connection = matchingGame.value.userConnections[connectionId]
        connection.checked = true

        // Проверяем, правильная ли связь
        const isCorrect = matchingGame.value.correctPairs[connection.koreanIndex] === connection.russianIndex
        connection.correct = isCorrect

        if (!isCorrect) {
          allCorrect = false
        }
      })

      // Запускаем прогресс-бар
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
          showMatchingResult.value = true
          isMatchingCorrect.value = allCorrect

          if (allCorrect) {
            correctAnswers.value++
            // Автопереход через 2 секунды
            setTimeout(() => {
              nextCard()
            }, 2000)
          }
        }
      }, stepDuration)
    }



    const initMatchingGame = () => {
      // Используем currentWords вместо words.value для учета режима (все/20 слов)
      const availableWords = currentWords.value

      if (availableWords.length < 4) {
        console.warn('Недостаточно слов для режима сопоставления')
        return
      }

      // Берем 4 случайных слова из текущего набора (всех или последних 20)
      const gameWords = [...availableWords]
          .sort(() => Math.random() - 0.5)
          .slice(0, 4)

      console.log('Selected words for matching:', gameWords) // Для отладки
      console.log('Current study mode:', studyMode.value) // Для отладки

      // Перемешиваем отдельно корейские и русские слова
      matchingGame.value.koreanWords = [...gameWords].sort(() => Math.random() - 0.5)
      matchingGame.value.russianWords = [...gameWords].sort(() => Math.random() - 0.5)

      // Создаем правильные пары (какое корейское слово соответствует какому русскому)
      matchingGame.value.correctPairs = {}
      gameWords.forEach(word => {
        const koreanIndex = matchingGame.value.koreanWords.findIndex(w => w.id === word.id)
        const russianIndex = matchingGame.value.russianWords.findIndex(w => w.id === word.id)
        if (koreanIndex !== -1 && russianIndex !== -1) {
          matchingGame.value.correctPairs[koreanIndex] = russianIndex
        }
      })

      console.log('Correct pairs:', matchingGame.value.correctPairs) // Для отладки

      // Сбрасываем состояние
      matchingGame.value.userConnections = {}
      matchingGame.value.matchedPairs = {korean: {}, russian: {}}
      selectedKorean.value = null
      selectedRussian.value = null
      showMatchingResult.value = false
      isMatchingCorrect.value = false
      autoProgress.value = 0
    }

    const selectKorean = (index) => {
      // Если уже показываем результат - игнорируем клики
      if (showMatchingResult.value) return

      // Проверяем, есть ли уже связь для этого слова
      const existingConnection = Object.values(matchingGame.value.userConnections)
          .find(conn => conn.koreanIndex === index)

      // Если есть связь и мы кликаем на уже связанное слово - удаляем связь
      if (existingConnection) {
        removeConnection(index, 'korean')
        return
      }

      // Если слово уже правильно сопоставлено - игнорируем
      if (matchingGame.value.matchedPairs.korean[index]) return

      selectedKorean.value = index
      tryCreateConnection()
    }

    const selectRussian = (index) => {
      // Если уже показываем результат - игнорируем клики
      if (showMatchingResult.value) return

      // Проверяем, есть ли уже связь для этого слова
      const existingConnection = Object.values(matchingGame.value.userConnections)
          .find(conn => conn.russianIndex === index)

      // Если есть связь и мы кликаем на уже связанное слово - удаляем связь
      if (existingConnection) {
        removeConnection(index, 'russian')
        return
      }

      // Если слово уже правильно сопоставлено - игнорируем
      if (matchingGame.value.matchedPairs.russian[index]) return

      selectedRussian.value = index
      tryCreateConnection()
    }

    const removeConnection = (index, type) => {
      let connectionIdToRemove = null

      // Находим connectionId для удаления
      Object.keys(matchingGame.value.userConnections).forEach(connectionId => {
        const connection = matchingGame.value.userConnections[connectionId]
        if ((type === 'korean' && connection.koreanIndex === index) ||
            (type === 'russian' && connection.russianIndex === index)) {
          connectionIdToRemove = connectionId
        }
      })

      // Удаляем связь
      if (connectionIdToRemove) {
        delete matchingGame.value.userConnections[connectionIdToRemove]

        // Сбрасываем выделение
        selectedKorean.value = null
        selectedRussian.value = null

        console.log('Связь удалена:', connectionIdToRemove)
      }
    }

    const getConnectionStatus = (index, type) => {
      if (!showMatchingResult.value) return ''

      if (type === 'korean') {
        const connection = Object.values(matchingGame.value.userConnections)
            .find(conn => conn.koreanIndex === index)
        if (connection && connection.checked) {
          return connection.correct ? 'correct' : 'incorrect'
        }
      } else {
        const connection = Object.values(matchingGame.value.userConnections)
            .find(conn => conn.russianIndex === index)
        if (connection && connection.checked) {
          return connection.correct ? 'correct' : 'incorrect'
        }
      }
      return ''
    }

// Обновляем проверку связей
    const checkMatching = () => {
      let allCorrect = true

      // Проверяем каждую связь
      Object.keys(matchingGame.value.userConnections).forEach(connectionId => {
        const connection = matchingGame.value.userConnections[connectionId]
        connection.checked = true

        // Проверяем, правильная ли связь
        const isCorrect = matchingGame.value.correctPairs[connection.koreanIndex] === connection.russianIndex
        connection.correct = isCorrect

        if (!isCorrect) {
          allCorrect = false
        } else {
          // Помечаем слова как правильно сопоставленные
          matchingGame.value.matchedPairs.korean[connection.koreanIndex] = true
          matchingGame.value.matchedPairs.russian[connection.russianIndex] = true
        }
      })

      showMatchingResult.value = true
      isMatchingCorrect.value = allCorrect

      if (allCorrect) {
        correctAnswers.value++
        // Автопереход через 2 секунды
        setTimeout(() => {
          nextCard()
        }, 2000)
      }
    }

// Сброс связей
    const resetMatching = () => {
      matchingGame.value.userConnections = {}
      matchingGame.value.matchedPairs = {korean: {}, russian: {}}
      selectedKorean.value = null
      selectedRussian.value = null
      showMatchingResult.value = false
    }

    const currentWords = computed(() => {
      if (!words.value || words.value.length === 0) return []

      if (studyMode.value === 'recent') {
        // Берем последние 20 слов
        return words.value.slice(-20)
      } else {
        // Все слова
        return words.value
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

      // Получаем все возможные варианты переводов (исключая текущее слово)
      const allOtherWords = words.value
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
        alert('Нет слов для обучения!')
        return
      }

      quizStarted.value = true
      currentIndex.value = 0
      showResult.value = false
      correctAnswers.value = 0
      selectedOption.value = null
      autoProgress.value = 0
      clearTimeout(autoNextTimer.value)

      // Инициализируем соответствующий режим
      if (quizMode.value === 'matching') {
        initMatchingGame()
      } else {
        currentDirection.value = getCurrentDirection()
      }
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
      showMatchingResult.value = false
      autoProgress.value = 0
      clearTimeout(autoNextTimer.value)

      if (currentIndex.value < shuffledWords.value.length - 1) {
        currentIndex.value++
        // Если режим сопоставления - инициализируем новую игру
        if (quizMode.value === 'matching') {
          initMatchingGame()
        }
      } else {
        quizStarted.value = false
      }
    }

    watch(studyMode, () => {
      if (quizStarted.value && quizMode.value === 'matching') {
        // При смене режима обучения перезапускаем игру сопоставления
        initMatchingGame()
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
      selectedKorean,
      matchingGame,
      getConnectionStatus,
      selectKorean,
      selectedRussian,
      selectRussian,
      isMatchingCorrect,
      showMatchingResult,
      checkMatching,
      resetMatching,
      getConnectionStyle,
      getConnectionColor,

      wordsCount: computed(() => currentWords.value.length)
    }
  }
}
</script>

<style scoped>
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

.controls {
  margin-bottom: 30px;
  display: flex;
  gap: 15px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
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

.progress {
  margin-top: 20px;
  color: white;
  font-size: 18px;
  font-weight: bold;
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
.matching-game {
  text-align: center;
  color: white;
  max-width: 800px;
  margin: 0 auto;
}

.matching-hint {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 20px;
  font-style: italic;
}

.matching-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 40px;
  margin: 30px 0;
  min-height: 400px;
}

.words-column h4 {
  margin-bottom: 20px;
  color: #ffeb3b;
  font-size: 18px;
}

.words-column {
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 200px;
}

.word-item {
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  font-size: 16px;
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
  word-break: break-word; /* Перенос длинных слов */
  hyphens: auto; /* Автоматические переносы */
  min-width: 0;
  flex-wrap: wrap;
  align-content: center;
}

.word-item:hover:not(.correct):not(.incorrect) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.word-item.selected {
  background: rgba(255, 235, 59, 0.3);
  transform: scale(1.05);
}

.word-item.connected {
  border-width: 3px;
  transform: scale(1.02);
}

.word-item.correct {
  background: rgba(76, 175, 80, 0.3);
  border-color: #4CAF50 !important;
  cursor: not-allowed;
}

.word-item.incorrect {
  background: rgba(244, 67, 54, 0.3);
  border-color: #f44336 !important;
  cursor: not-allowed;
}

.check-mark, .cross-mark {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
}

.current-connections {
  margin: 20px 0;
  color: rgba(255, 255, 255, 0.8);
}

.hint-text {
  font-style: italic;
  opacity: 0.7;
}

.remove-hint {
  font-size: 12px;
  opacity: 0.7;
  font-style: italic;
  display: block;
  margin-top: 5px;
}

.auto-check {
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
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

.matching-result {
  margin-top: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}

.btn-next {
  padding: 12px 24px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 15px;
}

.btn-next:hover {
  background: #45a049;
  transform: translateY(-2px);
}

/* Адаптивность для планшетов */
@media (max-width: 1024px) {
  .matching-container {
    gap: 30px;
  }

  .words-column {
    min-width: 180px;
  }

  .word-item {
    padding: 18px 15px;
    font-size: 15px;
    min-height: 65px;
    display: flex;
    line-height: 1.3;
    align-items: center;
    justify-content: center;
    min-width: 0;
    flex-wrap: wrap;
    align-content: center;
  }
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .matching-container {
    flex-direction: row; /* Оставляем горизонтальное расположение */
    gap: 20px;
    align-items: stretch;
    margin: 20px 0;
    min-height: auto;
  }

  .words-column {
    min-width: 45%; /* Равная ширина для обоих столбцов */
    flex: 1;
    gap: 12px;
  }

  .words-column h4 {
    font-size: 16px;
    margin-bottom: 15px;
  }

  .word-item {
    padding: 16px 12px;
    font-size: 14px;
    min-height: 60px;
    display: flex;
    line-height: 1.3;
    align-items: center;
    justify-content: center;
    min-width: 0;
    flex-wrap: wrap;
    align-content: center;
  }

  .word-item span {
    font-size: 16px; /* Значки остаются читаемыми */
  }

  .matching-hint {
    font-size: 14px;
    margin-bottom: 15px;
  }

  .current-connections {
    margin: 15px 0;
    font-size: 14px;
  }

  .remove-hint {
    font-size: 11px;
  }
}

/* Адаптивность для очень маленьких экранов */
@media (max-width: 480px) {
  .matching-container {
    gap: 15px;
    margin: 15px 0;
  }

  .words-column {
    min-width: 48%;
    gap: 10px;
  }

  .word-item {
    display: flex;
    padding: 10px 8px;
    align-items: center;
    justify-content: center;
    min-width: 0;
    flex-wrap: wrap;
    align-content: center;
  }

  .words-column h4 {
    font-size: 15px;
    margin-bottom: 12px;
  }

  .matching-hint {
    font-size: 13px;
  }

  .current-connections {
    font-size: 13px;
  }

  .word-item span {
    font-size: 14px;
    right: 8px;
  }

  .auto-check {
    padding: 12px;
  }

  .auto-progress {
    width: 180px;
  }
}

/* Гарантируем, что длинные слова переносятся */
.word-item {
  overflow-wrap: break-word;
  word-wrap: break-word;
  -webkit-hyphens: auto;
  -ms-hyphens: auto;
  hyphens: auto;
}

/* Улучшаем внешний вид для очень длинных слов */
.word-item::before {
  content: '';
  display: block;
  width: 100%;
  height: 0;
}
</style>