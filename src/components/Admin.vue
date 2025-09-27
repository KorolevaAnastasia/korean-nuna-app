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
        <div class="success-message">
          ✅ Доступ разрешен! Вот ссылка на таблицу слов:
        </div>

        <div class="link-container">
          <a
              :href="sheetUrl"
              target="_blank"
              class="sheet-link"
          >
            📊 Открыть Google Таблицу слов
          </a>

          <button @click="copyLink" class="copy-btn">
            {{ copySuccess ? '✓ Скопировано!' : '📋 Копировать ссылку' }}
          </button>
        </div>

        <div class="admin-info">
          <h3>Информация о таблице:</h3>
          <ul>
            <li>📍 Формат: ID | Корейский | Русский | Категория</li>
            <li>💾 Изменения сохраняются автоматически</li>
            <li>🔄 Приложение обновит слова через 30 минут</li>
            <li>📱 Можно редактировать с телефона/компьютера</li>
          </ul>
        </div>

        <button @click="logout" class="logout-btn">Выйти</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'Admin',
  setup() {
    const password = ref('')
    const isAuthenticated = ref(false)
    const error = ref('')
    const copySuccess = ref(false)

    // Пароль можно изменить здесь (простой пароль для удобства)
    const correctPassword = 'KoreanPass321!' // Понятное дело, что его всем видно)

    // Ссылка на вашу Google таблицу
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1IU-DQd4hW96SkbAE5YJFcUnRn4YiYYrZolOs3teM8uQ/edit?gid=0#gid=0'

    const login = () => {
      if (password.value.trim() === correctPassword) {
        isAuthenticated.value = true
        error.value = ''
        // Сохраняем в sessionStorage на время сессии
        sessionStorage.setItem('adminAuthenticated', 'true')
      } else {
        error.value = 'Неверный пароль! Попробуйте снова.'
        password.value = ''
      }
    }

    const logout = () => {
      isAuthenticated.value = false
      password.value = ''
      sessionStorage.removeItem('adminAuthenticated')
    }

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(sheetUrl)
        copySuccess.value = true
        setTimeout(() => {
          copySuccess.value = false
        }, 2000)
      } catch (err) {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea')
        textArea.value = sheetUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        copySuccess.value = true
        setTimeout(() => {
          copySuccess.value = false
        }, 2000)
      }
    }

    // Проверяем, не авторизован ли пользователь уже
    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
      isAuthenticated.value = true
    }

    return {
      password,
      isAuthenticated,
      error,
      copySuccess,
      sheetUrl,
      login,
      logout,
      copyLink
    }
  }
}
</script>

<style scoped>
.admin {
  min-height: 60vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.admin-container {
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.admin-container h2 {
  color: #333;
  margin-bottom: 30px;
  font-size: 2em;
}

.login-form p {
  color: #666;
  margin-bottom: 20px;
  font-size: 16px;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;
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
}

.login-btn:hover {
  background: #5a6fd8;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 10px;
}

.success-message {
  color: #27ae60;
  font-size: 18px;
  margin-bottom: 30px;
  font-weight: bold;
}

.link-container {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 30px;
  border-left: 4px solid #667eea;
  border-right: 4px solid #667eea;
}

.sheet-link {
  display: block;
  color: #667eea;
  font-size: 18px;
  text-decoration: none;
  margin-bottom: 15px;
  padding: 10px;
  border: 2px solid transparent;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.sheet-link:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: #667eea;
  transform: translateY(-2px);
}

.copy-btn {
  padding: 10px 20px;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
  font-size: 14px;
}

.copy-btn:hover {
  background: #7f8c8d;
}

.admin-info {
  text-align: left;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.admin-info h3 {
  color: #333;
  margin-bottom: 15px;
}

.admin-info ul {
  list-style: none;
  padding: 0;
}

.admin-info li {
  padding: 5px 0;
  color: #666;
  border-bottom: 1px solid #eee;
}

.admin-info li:last-child {
  border-bottom: none;
}

.logout-btn {
  padding: 10px 20px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.logout-btn:hover {
  background: #c0392b;
}

/* Адаптивность */
@media (max-width: 768px) {
  .admin-container {
    padding: 20px;
    margin: 10px;
  }

  .input-group {
    flex-direction: column;
  }

  .password-input {
    min-width: auto;
    width: 100%;
  }
}
</style>