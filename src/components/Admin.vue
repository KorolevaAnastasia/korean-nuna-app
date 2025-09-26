<template>
  <div class="admin">
    <div class="auth-section" v-if="!authenticated">
      <h2>🔐 Авторизация</h2>
      <input
          v-model="passwordInput"
          type="password"
          placeholder="Введите пароль"
          class="password-input"
          @keyup.enter="authenticate"
      >
      <button @click="authenticate" class="btn-auth">Войти</button>
    </div>

    <div v-else class="add-word-section">
      <h2>✏️ Добавить новое слово</h2>
      <div class="form">
        <input v-model="newWord.korean" placeholder="Корейское слово" class="form-input">
        <input v-model="newWord.russian" placeholder="Русский перевод" class="form-input">
        <input v-model="newWord.category" placeholder="Категория" class="form-input">
        <button @click="addWord" class="btn-add">Добавить слово</button>
      </div>

      <div class="current-words">
        <h3>Текущие слова ({{ words.length }})</h3>
        <div class="words-list">
          <div v-for="word in words" :key="word.id" class="word-item">
            <span class="korean">{{ word.korean }}</span> -
            <span class="russian">{{ word.russian }}</span>
            <span class="category">({{ word.category }})</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { koreanWords } from '../data/words.js'

export default {
  name: 'Admin',
  setup() {
    const authenticated = ref(false)
    const passwordInput = ref('')
    const newWord = ref({ korean: '', russian: '', category: '' })
    const words = ref([])

    onMounted(() => {
      words.value = koreanWords || []
    })

    const authenticate = () => {
      // Простой пароль
      if (passwordInput.value === "korean123") {
        authenticated.value = true
        passwordInput.value = ''
      } else {
        alert('Неверный пароль!')
      }
    }

    const addWord = () => {
      if (!newWord.value.korean || !newWord.value.russian) {
        alert('Заполните корейское слово и перевод!')
        return
      }

      const word = {
        id: Date.now(),
        korean: newWord.value.korean,
        russian: newWord.value.russian,
        category: newWord.value.category || 'общее'
      }

      words.value.push(word)
      newWord.value = { korean: '', russian: '', category: '' }

      alert('Слово добавлено! (В этом демо слова сохраняются только в памяти)')
    }

    return {
      authenticated,
      passwordInput,
      newWord,
      words,
      authenticate,
      addWord
    }
  }
}
</script>

<style scoped>
.admin {
  max-width: 600px;
  margin: 0 auto;
}

.auth-section, .add-word-section {
  background: rgba(255,255,255,0.1);
  padding: 40px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  text-align: center;
}

.auth-section h2, .add-word-section h2 {
  color: white;
  margin-bottom: 30px;
}

.password-input, .form-input {
  padding: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 10px;
  font-size: 16px;
  background: rgba(255,255,255,0.9);
  margin: 10px;
  width: 250px;
}

.btn-auth, .btn-add {
  background: #4CAF50;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 10px;
}

.btn-auth:hover, .btn-add:hover {
  background: #45a049;
  transform: translateY(-2px);
}

.form {
  margin-bottom: 30px;
}

.current-words {
  margin-top: 30px;
  text-align: left;
}

.current-words h3 {
  color: white;
  margin-bottom: 15px;
}

.words-list {
  max-height: 300px;
  overflow-y: auto;
  background: rgba(255,255,255,0.9);
  padding: 15px;
  border-radius: 10px;
}

.word-item {
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.word-item:last-child {
  border-bottom: none;
}

.korean {
  font-weight: bold;
  color: #667eea;
}

.russian {
  color: #333;
}

.category {
  color: #666;
  font-size: 12px;
}
</style>