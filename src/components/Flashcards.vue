<template>
  <div class="flashcards">
    <div class="controls">
      <button @click="startQuiz" class="btn-start">{{ quizStarted ? 'Перезапустить' : 'Начать обучение' }}</button>
      <select v-model="quizMode" class="mode-select">
        <option value="korean-to-russian">Корейский → Русский</option>
        <option value="russian-to-korean">Русский → Корейский</option>
        <option value="mixed">Смешанный режим</option>
      </select>
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
                'disabled': showResult
              }"
                :disabled="showResult"
            >
              {{ option.text }}
            </button>
          </div>

          <div v-if="showResult" class="result">
            <p v-if="isCorrect" class="correct-message">✅ Правильно!</p>
            <p v-else class="incorrect-message">❌ Неправильно. Правильный ответ: {{ correctAnswer }}</p>
            <button @click="nextCard" class="btn-next">Следующая карточка</button>
          </div>
        </div>
      </div>

      <div class="progress">
        Прогресс: {{ currentIndex + 1 }} / {{ shuffledWords.length }}
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
      </div>
    </div>

    <div v-else-if="quizStarted" class="quiz-finished">
      <h2>🎉 Отлично! Вы завершили обучение!</h2>
      <p>Правильных ответов: {{ correctAnswers }} из {{ shuffledWords.length }}</p>
      <button @click="startQuiz" class="btn-restart">Начать заново</button>
    </div>

    <div v-else class="welcome">
      <h2>Добро пожаловать в режим карточек!</h2>
      <p>Выберите режим обучения и нажмите "Начать обучение"</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { koreanWords } from '../data/words.js'

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
    const currentDirection = ref('korean-to-russian') // Запоминаем направление для текущей карточки

    onMounted(() => {
      words.value = koreanWords || []
    })

    const shuffledWords = computed(() => {
      if (!words.value || words.value.length === 0) return []
      const shuffled = [...words.value].sort(() => Math.random() - 0.5)
      return shuffled
    })

    const currentCard = computed(() => {
      return quizStarted.value && shuffledWords.value.length > 0
          ? shuffledWords.value[currentIndex.value]
          : null
    })

    const progressPercentage = computed(() => {
      return ((currentIndex.value + 1) / shuffledWords.value.length) * 100
    })

    // Определяем направление для текущей карточки
    const getCurrentDirection = () => {
      if (quizMode.value === 'mixed') {
        return Math.random() > 0.5 ? 'korean-to-russian' : 'russian-to-korean'
      }
      return quizMode.value
    }

    // Вопрос и правильный ответ
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

    // Генерируем варианты ответов
    const options = computed(() => {
      if (!currentCard.value) return []

      // Правильный ответ
      const correct = correctAnswer.value

      // Получаем неправильные варианты из других слов
      const otherWords = words.value
          .filter(word => word.id !== currentCard.value.id)
          .map(word => {
            return currentDirection.value === 'korean-to-russian'
                ? word.russian  // Если вопрос на корейском, то варианты на русском
                : word.korean   // Если вопрос на русском, то варианты на корейском
          })
          .filter((value, index, self) => self.indexOf(value) === index) // Убираем дубликаты
          .slice(0, 3) // Берем 3 случайных слова

      // Создаем массив вариантов
      const allOptions = [
        { text: correct, isCorrect: true }
      ]

      // Добавляем неправильные варианты
      otherWords.forEach(word => {
        allOptions.push({ text: word, isCorrect: false })
      })

      // Перемешиваем варианты
      return allOptions.sort(() => Math.random() - 0.5)
    })

    const startQuiz = () => {
      if (words.value.length === 0) {
        alert('Нет слов для обучения!')
        return
      }
      quizStarted.value = true
      currentIndex.value = 0
      showResult.value = false
      correctAnswers.value = 0
      selectedOption.value = null
    }

    const checkAnswer = (correct, index) => {
      showResult.value = true
      isCorrect.value = correct
      selectedOption.value = index

      if (correct) {
        correctAnswers.value++
      }
    }

    const nextCard = () => {
      showResult.value = false
      selectedOption.value = null

      if (currentIndex.value < shuffledWords.value.length - 1) {
        currentIndex.value++
      } else {
        quizStarted.value = false
      }
    }

    // Сбрасываем прогресс при изменении режима
    watch(quizMode, () => {
      if (quizStarted.value) {
        startQuiz()
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
      startQuiz,
      checkAnswer,
      nextCard
    }
  }
}
</script>

<style scoped>
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
  border-radius: 25px;
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
  border-radius: 20px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
}

.question {
  font-size: 2em;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
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
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 15px;
  background: rgba(255,255,255,0.1);
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.option-btn:hover:not(.disabled) {
  background: rgba(255,255,255,0.2);
  transform: translateY(-2px);
}

.option-btn.correct {
  background: #4CAF50;
  border-color: #45a049;
}

.option-btn.incorrect {
  background: #f44336;
  border-color: #da190b;
}

.option-btn.disabled {
  cursor: not-allowed;
}

.result {
  margin-top: 20px;
}

.correct-message {
  color: #4CAF50;
  font-weight: bold;
  font-size: 1.2em;
}

.incorrect-message {
  color: #f44336;
  font-weight: bold;
  font-size: 1.2em;
  margin-bottom: 15px;
}

.btn-next {
  padding: 12px 24px;
  background: rgba(255,255,255,0.2);
  color: white;
  border: 2px solid white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;
}

.btn-next:hover {
  background: white;
  color: #667eea;
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
  background: rgba(255,255,255,0.2);
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
  background: rgba(255,255,255,0.1);
  padding: 40px;
  border-radius: 20px;
  color: white;
  backdrop-filter: blur(10px);
}

.quiz-finished h2, .welcome h2 {
  margin-bottom: 20px;
}
</style>