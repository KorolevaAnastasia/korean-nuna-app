<template>
  <div class="admin">
    <div class="admin-container">
      <h2>🔐 Панель администрирования</h2>

      <!-- Авторизация -->
      <div v-if="!isAuthenticated" class="login-form">
        <p>Введите пароль для доступа:</p>
        <div class="input-group">
          <input
              v-model="password"
              type="password"
              placeholder="Пароль"
              class="password-input"
              @keyup.enter="login"
          >
          <button @click="login" class="login-btn">Войти</button>
        </div>
        <p v-if="loginError" class="error-message">{{ loginError }}</p>
      </div>

      <!-- Основной интерфейс -->
      <div v-else class="admin-content">

        <!-- Форма добавления / редактирования -->
        <div class="form-section">
          <h3>{{ editingWord ? '✏️ Редактировать слово' : '➕ Добавить слово' }}</h3>
          <div class="word-form">
            <input
                v-model="form.korean"
                placeholder="한국어 (корейское слово)"
                class="form-input"
            >
            <input
                v-model="form.russian"
                placeholder="Перевод на русском"
                class="form-input"
            >
            <input
                v-model="form.category"
                placeholder="Категория (Сущ., Глаг., ...)"
                class="form-input"
            >
            <div class="form-buttons">
              <button @click="saveWord" class="btn-save" :disabled="isSaving">
                {{ isSaving ? 'Сохранение...' : (editingWord ? 'Сохранить' : 'Добавить') }}
              </button>
              <button v-if="editingWord" @click="cancelEdit" class="btn-cancel">Отмена</button>
            </div>
          </div>
          <p v-if="formError" class="error-message">{{ formError }}</p>
          <p v-if="formSuccess" class="success-inline">{{ formSuccess }}</p>
        </div>

        <!-- Список слов -->
        <div class="words-section">
          <div class="words-header">
            <h3>📋 Слова в базе данных</h3>
            <div class="words-meta">
              <span v-if="isLoading">Загрузка...</span>
              <span v-else>Всего: {{ words.length }} слов</span>
              <button @click="loadWords" class="btn-refresh" :disabled="isLoading">🔄</button>
            </div>
          </div>

          <input
              v-model="searchQuery"
              placeholder="Поиск по слову..."
              class="search-input"
          >

          <div v-if="isLoading" class="loading-msg">Загрузка слов из базы...</div>

          <div v-else-if="filteredWords.length === 0" class="empty-msg">
            {{ words.length === 0 ? 'База данных пуста. Добавьте первое слово!' : 'Ничего не найдено' }}
          </div>

          <div v-else class="words-table-wrap">
            <table class="words-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Корейский</th>
                  <th>Русский</th>
                  <th>Категория</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="word in filteredWords" :key="word.id">
                  <td class="td-id">{{ word.id }}</td>
                  <td class="td-korean">{{ word.korean }}</td>
                  <td>{{ word.russian }}</td>
                  <td><span class="category-badge">{{ word.category }}</span></td>
                  <td class="td-actions">
                    <button @click="startEdit(word)" class="btn-edit">✏️</button>
                    <button @click="removeWord(word)" class="btn-delete">🗑️</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <button @click="logout" class="logout-btn">Выйти</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { fetchWords, addWord, updateWord, deleteWord } from '../utils/apiService.js'

export default {
  name: 'Admin',
  setup() {
    const password     = ref('')
    const loginError   = ref('')
    const isAuthenticated = ref(false)

    const words      = ref([])
    const isLoading  = ref(false)
    const searchQuery = ref('')

    const form = ref({ korean: '', russian: '', category: '' })
    const editingWord = ref(null)
    const isSaving   = ref(false)
    const formError  = ref('')
    const formSuccess = ref('')

    const ADMIN_PASSWORD = 'Korean262842!'

    const login = () => {
      if (password.value.trim() === ADMIN_PASSWORD) {
        isAuthenticated.value = true
        loginError.value = ''
        sessionStorage.setItem('adminAuth', 'true')
        loadWords()
      } else {
        loginError.value = 'Неверный пароль!'
        password.value = ''
      }
    }

    const logout = () => {
      isAuthenticated.value = false
      password.value = ''
      sessionStorage.removeItem('adminAuth')
    }

    const loadWords = async () => {
      isLoading.value = true
      try {
        words.value = await fetchWords()
      } catch (e) {
        console.error(e)
      } finally {
        isLoading.value = false
      }
    }

    const filteredWords = computed(() => {
      if (!searchQuery.value) return words.value
      const q = searchQuery.value.toLowerCase()
      return words.value.filter(w =>
          w.korean.toLowerCase().includes(q) ||
          w.russian.toLowerCase().includes(q)
      )
    })

    const resetForm = () => {
      form.value = { korean: '', russian: '', category: '' }
      editingWord.value = null
      formError.value = ''
    }

    const showSuccess = (msg) => {
      formSuccess.value = msg
      setTimeout(() => { formSuccess.value = '' }, 2500)
    }

    const saveWord = async () => {
      formError.value = ''
      if (!form.value.korean.trim() || !form.value.russian.trim()) {
        formError.value = 'Заполните корейское слово и перевод!'
        return
      }
      isSaving.value = true
      try {
        if (editingWord.value) {
          await updateWord(editingWord.value.id, form.value)
          showSuccess('✅ Слово обновлено')
        } else {
          const newWord = await addWord(form.value)
          words.value.push(newWord)
          showSuccess('✅ Слово добавлено')
        }
        await loadWords()
        resetForm()
      } catch (e) {
        formError.value = 'Ошибка сохранения: ' + e.message
      } finally {
        isSaving.value = false
      }
    }

    const startEdit = (word) => {
      editingWord.value = word
      form.value = { korean: word.korean, russian: word.russian, category: word.category }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const cancelEdit = () => {
      resetForm()
    }

    const removeWord = async (word) => {
      if (!confirm(`Удалить «${word.korean}»?`)) return
      try {
        await deleteWord(word.id)
        words.value = words.value.filter(w => w.id !== word.id)
        showSuccess('🗑️ Слово удалено')
      } catch (e) {
        alert('Ошибка удаления: ' + e.message)
      }
    }

    onMounted(() => {
      if (sessionStorage.getItem('adminAuth') === 'true') {
        isAuthenticated.value = true
        loadWords()
      }
    })

    return {
      password, loginError, isAuthenticated, login, logout,
      words, isLoading, searchQuery, filteredWords, loadWords,
      form, editingWord, isSaving, formError, formSuccess,
      saveWord, startEdit, cancelEdit, removeWord,
    }
  }
}
</script>

<style scoped>
.admin {
  min-height: 60vh;
  display: flex;
  justify-content: center;
  padding: 15px;
  margin-top: 20px;
}

.admin-container {
  background: rgba(255, 255, 255, 0.95);
  padding: 30px 25px;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  max-width: 900px;
  width: 100%;
  color: #333;
  height: fit-content;
}

.admin-container h2 {
  text-align: center;
  margin-bottom: 25px;
  font-size: 1.7em;
}

/* Авторизация */
.login-form p { color: #666; margin-bottom: 16px; }
.input-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 12px;
}
.password-input {
  padding: 12px 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  width: 260px;
  color: #333;
  background: #fff;
}
.password-input:focus { border-color: #667eea; outline: none; }
.login-btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}
.login-btn:hover { background: #5a6fd8; }

/* Форма добавления */
.form-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 25px;
  border-left: 4px solid #667eea;
}
.form-section h3 { margin-bottom: 15px; color: #444; }
.word-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
}
.form-input {
  padding: 10px 14px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  flex: 1 1 180px;
  min-width: 140px;
  color: #333;
  background: #fff;
}
.form-input:focus { border-color: #667eea; outline: none; }
.form-buttons { display: flex; gap: 8px; }
.btn-save {
  padding: 10px 22px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  white-space: nowrap;
}
.btn-save:hover:not(:disabled) { background: #43a047; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel {
  padding: 10px 18px;
  background: #aaa;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
}
.btn-cancel:hover { background: #888; }

/* Список слов */
.words-section h3 { margin-bottom: 12px; color: #444; }
.words-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.words-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #666;
  font-size: 14px;
}
.btn-refresh {
  background: none;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 16px;
}
.btn-refresh:hover { background: #f0f0f0; }

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  margin-bottom: 15px;
  color: #333;
  background: #fff;
  box-sizing: border-box;
}
.search-input:focus { border-color: #667eea; outline: none; }

.loading-msg, .empty-msg {
  text-align: center;
  padding: 30px;
  color: #888;
  font-size: 15px;
}

.words-table-wrap {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #eee;
}
.words-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.words-table th {
  background: #667eea;
  color: white;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
}
.words-table td {
  padding: 9px 12px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.words-table tr:last-child td { border-bottom: none; }
.words-table tr:hover td { background: #f9f9ff; }

.td-id { color: #aaa; width: 50px; }
.td-korean { font-size: 16px; font-weight: 500; color: #667eea; }
.td-actions { white-space: nowrap; width: 80px; }

.category-badge {
  background: #f0f0f0;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 12px;
  color: #666;
}
.btn-edit, .btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 17px;
  padding: 3px 5px;
  border-radius: 5px;
  transition: background 0.2s;
}
.btn-edit:hover  { background: #e8f0fe; }
.btn-delete:hover { background: #fde8e8; }

/* Сообщения */
.error-message  { color: #e74c3c; margin-top: 8px; font-size: 14px; }
.success-inline { color: #27ae60; margin-top: 8px; font-size: 14px; font-weight: 500; }

.logout-btn {
  display: block;
  margin: 25px auto 0;
  padding: 12px 28px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
}
.logout-btn:hover { background: #c0392b; }

@media (max-width: 600px) {
  .admin-container { padding: 20px 15px; }
  .word-form { flex-direction: column; }
  .form-input { flex: unset; width: 100%; }
}
</style>
