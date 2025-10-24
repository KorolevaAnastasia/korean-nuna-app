<template>
  <div class="admin">
    <div class="admin-container">
      <h2>🔐 Панель администрирования</h2>

      <div v-if="!isAuthenticated" class="login-form">
        <p>Введите пароль для доступа к таблице слов:</p>
        <div class="input-group">
          <input
              v-model="password"
              type="password"
              placeholder="Введите пароль"
              class="password-input"
              @keyup.enter="login"
          >
          <button @click="login" class="login-btn">Войти</button>
        </div>
        <p v-if="error" class="error-message">{{ error }}</p>
      </div>

      <div v-else class="admin-content">
        <div class="words-management">
          <div class="add-word-card">
            <h4>Добавить новое слово</h4>
            <div class="form-grid">
              <div class="input-field">
                <label>Корейское слово</label>
                <input
                    v-model="newWord.korean"
                    placeholder="Введите корейское слово"
                    class="form-input"
                    @keyup.enter="addWord"
                >
              </div>
              <div class="input-field">
                <label>Русский перевод</label>
                <input
                    v-model="newWord.russian"
                    placeholder="Введите перевод"
                    class="form-input"
                    @keyup.enter="addWord"
                >
              </div>
              <div class="input-field">
                <label>Часть речи</label>
                <input
                    v-model="newWord.category"
                    placeholder="Например: Сущ."
                    class="form-input"
                    @keyup.enter="addWord"
                >
              </div>
            </div>
            <button
                @click="addWord"
                class="add-word-btn"
                :disabled="!isFormValid"
            >
              <span class="btn-icon">➕</span>
              Добавить слово
            </button>
          </div>

          <div class="words-section">
            <div class="section-header">
              <h4>Редактирование</h4>
              <div class="search-box">
                <input
                    v-model="searchQuery"
                    placeholder="Поиск по словам..."
                    class="search-input"
                >
                <span class="search-icon">🔍</span>
              </div>
            </div>

            <div class="words-table">
              <div class="table-header">
                <div class="col-korean">Корейский</div>
                <div class="col-russian">Русский</div>
                <div class="col-category">Категория</div>
                <div class="col-actions">Действия</div>
              </div>

              <div
                  v-for="word in filteredWords"
                  :key="word.id"
                  class="table-row"
              >
                <div class="col-korean">
                  <input
                      v-model="word.korean"
                      @blur="updateWord(word)"
                      class="table-input"
                  >
                </div>
                <div class="col-russian">
                  <input
                      v-model="word.russian"
                      @blur="updateWord(word)"
                      class="table-input"
                  >
                </div>
                <div class="col-category">
                  <input
                      v-model="word.category"
                      @blur="updateWord(word)"
                      class="table-input"
                  >
                </div>
                <div class="col-actions">
                  <button
                      @click="deleteWord(word.id)"
                      class="delete-btn"
                      title="Удалить слово"
                  >
                    <span class="delete-icon">🗑️</span>
                    Удалить
                  </button>
                </div>
              </div>

              <div v-if="filteredWords.length === 0" class="empty-state">
                <p>Слова не найдены</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { apiService } from '../utils/apiService.js'

export default {
  name: 'Admin',
  setup() {
    const password = ref('')
    const isAuthenticated = ref(false)
    const error = ref('')
    const words = ref([])
    const newWord = ref({ korean: '', russian: '', category: '' })
    const searchQuery = ref('')
    const correctPassword = 'KoreanPass321!'

    const filteredWords = computed(() => {
      if (!searchQuery.value.trim()) return words.value

      const query = searchQuery.value.toLowerCase().trim()
      return words.value.filter(word => {
        return (
            (word.korean && word.korean.toLowerCase().includes(query)) ||
            (word.russian && word.russian.toLowerCase().includes(query)) ||
            (word.category && word.category.toLowerCase().includes(query))
        )
      })
    })

    const isFormValid = computed(() => {
      return newWord.value.korean.trim() && newWord.value.russian.trim()
    })

    onMounted(async () => {
      if (sessionStorage.getItem('adminAuthenticated') === 'true') {
        isAuthenticated.value = true
        await loadWords()
      }
    })

    const login = () => {
      if (password.value.trim() === correctPassword) {
        isAuthenticated.value = true
        error.value = ''
        sessionStorage.setItem('adminAuthenticated', 'true')
        loadWords()
      } else {
        error.value = 'Неверный пароль! Попробуйте снова.'
        password.value = ''
      }
    }

    const loadWords = async () => {
      try {
        words.value = await apiService.getWords()
        console.log('Загружено слов:', words.value.length)
      } catch (err) {
        console.error('Ошибка загрузки слов:', err)
        error.value = 'Ошибка загрузки слов'
      }
    }

    const handleSearch = () => {
      // Для отладки
      console.log('Поисковый запрос:', searchQuery.value)
      console.log('Отфильтровано слов:', filteredWords.value.length)
    }

    const addWord = async () => {
      if (isFormValid.value) {
        try {
          await apiService.addWord({
            korean: newWord.value.korean.trim(),
            russian: newWord.value.russian.trim(),
            category: newWord.value.category.trim()
          })
          newWord.value = { korean: '', russian: '', category: '' }
          await loadWords()
        } catch (err) {
          console.error('Ошибка добавления слова:', err)
          error.value = 'Ошибка добавления слова'
        }
      }
    }

    const updateWord = async (word) => {
      try {
        await apiService.updateWord(word.id, {
          korean: word.korean.trim(),
          russian: word.russian.trim(),
          category: word.category.trim()
        })
      } catch (err) {
        console.error('Ошибка обновления слова:', err)
        error.value = 'Ошибка обновления слова'
      }
    }

    const deleteWord = async (id) => {
      if (confirm('Вы уверены, что хотите удалить это слово?')) {
        try {
          await apiService.deleteWord(id)
          await loadWords()
        } catch (err) {
          console.error('Ошибка удаления слова:', err)
          error.value = 'Ошибка удаления слова'
        }
      }
    }

    return {
      password,
      isAuthenticated,
      error,
      words,
      newWord,
      searchQuery,
      filteredWords,
      isFormValid,
      login,
      addWord,
      updateWord,
      deleteWord,
      handleSearch
    }
  }
}
</script>

<style scoped>
.admin {
  min-height: 60vh;
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Изменено с center на flex-start для мобилок */
  padding: 15px;
  margin-top: 20px; /* Добавляем отступ сверху */
}

.admin-container {
  background: rgba(255, 255, 255, 0.95);
  padding: 30px 25px; /* Уменьшаем padding */
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 100%;
  text-align: center;
  margin: 0 auto; /* Центрируем */
}

.admin-container h2 {
  color: #333;
  margin-bottom: 25px;
  font-size: 1.7em; /* Уменьшаем размер шрифта */
  line-height: 1.3;
}

.login-form p {
  color: #666;
  margin-bottom: 20px;
  font-size: 16px;
  line-height: 1.4;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
}

.password-input {
  padding: 12px 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  min-width: 200px;
  transition: border-color 0.3s ease;
  background: transparent;
  color: #1a1a1a;
  width: 100%; /* Добавляем для мобилок */
  max-width: 300px; /* Ограничиваем максимальную ширину */
}

.password-input:focus {
  border-color: #667eea;
  outline: none;
}

.login-btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s ease;
  width: 100%; /* Полная ширина на мобилках */
  max-width: 300px; /* Ограничиваем ширину */
}

.login-btn:hover {
  background: #5a6fd8;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 10px;
  line-height: 1.3;
}

.success-message {
  color: #27ae60;
  font-size: 16px; /* Уменьшаем размер */
  margin-bottom: 25px;
  font-weight: bold;
  line-height: 1.4;
  padding: 0 10px;
}

.link-container {
  background: #f8f9fa;
  padding: 20px 15px; /* Уменьшаем боковые отступы */
  border-radius: 10px;
  margin-bottom: 25px;
  border-left: 4px solid #667eea;
  border-right: 4px solid #667eea;
}

.sheet-link {
  display: block;
  color: #667eea;
  font-size: 16px; /* Уменьшаем размер шрифта */
  text-decoration: none;
  margin-bottom: 15px;
  padding: 12px 10px;
  border: 2px solid transparent;
  border-radius: 8px;
  transition: all 0.3s ease;
  word-break: break-all; /* Перенос длинных слов */
  line-height: 1.3;
}

.sheet-link:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: #667eea;
  transform: translateY(-2px);
}

.copy-btn {
  padding: 12px 20px;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
  font-size: 14px;
  width: 100%; /* Полная ширина на мобилках */
  max-width: 250px;
}

.copy-btn:hover {
  background: #7f8c8d;
}

.admin-info {
  text-align: left;
  background: #f8f9fa;
  padding: 20px 15px; /* Уменьшаем боковые отступы */
  border-radius: 10px;
  margin-bottom: 20px;
}

.admin-info h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.2em;
}

.admin-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.admin-info li {
  padding: 8px 0;
  color: #666;
  border-bottom: 1px solid #eee;
  font-size: 14px;
  line-height: 1.4;
}

.admin-info li:last-child {
  border-bottom: none;
}

.logout-btn {
  padding: 12px 24px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
  width: 100%;
  max-width: 200px;
}

.logout-btn:hover {
  background: #c0392b;
}

.admin-content {
  width: 100%;
}

.words-management {
  width: 100%;
}

/* Карточка добавления нового слова */
.add-word-card {
  background: #f8f9fa;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 30px;
  border: 1px solid #e9ecef;
}

.add-word-card h4 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.2em;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.input-field {
  text-align: left;
}

.input-field label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #555;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: white;
  color: #111111;
}

.form-input:focus {
  border-color: #667eea;
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.add-word-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 200px;
  margin-left: auto;
}

.add-word-btn:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.add-word-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 16px;
}

/* Секция списка слов */
.words-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  flex-direction: column;
}

.section-header h4 {
  margin: 0;
  color: #333;
  font-size: 1.2em;
}

.search-box {
  position: relative;
  width: 300px;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: #fff;
  color: #111;
}

.search-input:focus {
  border-color: #667eea;
  outline: none;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
}

/* Таблица слов */
.words-table {
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 120px;
  gap: 16px;
  padding: 16px 24px;
  background: #667eea;
  color: white;
  font-weight: 500;
  font-size: 14px;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 120px;
  gap: 16px;
  padding: 12px 24px;
  border-bottom: 1px solid #e9ecef;
  align-items: center;
  transition: background 0.2s ease;
}

.table-row:hover {
  background: #f8f9fa;
}

.table-row:last-child {
  border-bottom: none;
}

.table-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: transparent;
  color: #111111;
}

.table-input:focus {
  border-color: #667eea;
  outline: none;
  background: white;
}

.col-actions {
  display: flex;
  justify-content: center;
}

.delete-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background: #c82333;
  transform: translateY(-1px);
}

.delete-icon {
  font-size: 14px;
}

.empty-state {
  padding: 40px 24px;
  text-align: center;
  color: #6c757d;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

/* Адаптивность */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .add-word-btn {
    width: 100%;
    margin-left: 0;
  }

  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .col-actions {
    justify-content: flex-start;
    margin-top: 8px;
  }

  .table-header {
    display: none;
  }

  .table-row {
    position: relative;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 8px;
    border: 1px solid #e9ecef;
  }

  .table-row::before {
    content: "Слово";
    font-weight: 500;
    color: #667eea;
    font-size: 12px;
    margin-bottom: 4px;
  }
}

@media (max-width: 480px) {
  .add-word-card {
    padding: 16px;
  }

  .section-header {
    padding: 16px;
  }

  .table-row {
    padding: 12px;
  }

  .delete-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Адаптивность для очень маленьких экранов */
@media (max-width: 480px) {
  .admin {
    padding: 10px;
    margin-top: 10px;
    align-items: center; /* Центрируем на очень маленьких экранах */
    min-height: 50vh;
  }

  .admin-container {
    padding: 20px 15px;
    margin: 0 5px;
  }

  .admin-container h2 {
    font-size: 1.5em;
    margin-bottom: 20px;
  }

  .login-form p {
    font-size: 15px;
    margin-bottom: 15px;
  }

  .input-group {
    gap: 8px;
    margin-bottom: 15px;
  }

  .password-input {
    font-size: 16px; /* Сохраняем размер для удобства ввода */
    padding: 14px 12px; /* Увеличиваем padding для удобства тапа */
    min-width: auto;
  }

  .login-btn {
    padding: 14px 20px;
    font-size: 16px;
  }

  .success-message {
    font-size: 15px;
    margin-bottom: 20px;
  }

  .link-container {
    padding: 15px 10px;
    margin-bottom: 20px;
  }

  .sheet-link {
    font-size: 15px;
    padding: 10px 8px;
  }

  .admin-info {
    padding: 15px 10px;
  }

  .admin-info h3 {
    font-size: 1.1em;
  }

  .admin-info li {
    font-size: 13px;
    padding: 6px 0;
  }
}

/* Для горизонтальной ориентации на мобильных */
@media (max-width: 768px) and (orientation: landscape) {
  .admin {
    min-height: 80vh;
    padding: 10px;
  }

  .admin-container {
    padding: 20px;
    max-width: 90%;
  }

  .input-group {
    flex-direction: row; /* Горизонтально в landscape */
  }

  .password-input {
    width: auto;
    flex: 1;
  }

  .login-btn {
    width: auto;
  }
}

/* Улучшения для очень высоких узких экранов */
@media (max-width: 320px) {
  .admin-container {
    padding: 15px 10px;
  }

  .admin-container h2 {
    font-size: 1.3em;
  }

  .sheet-link {
    font-size: 14px;
  }
}
</style>