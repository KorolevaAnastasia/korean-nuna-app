<template>
  <div class="learning">

    <!-- ── Экран авторизации ─────────────────────────────────────────────── -->
    <div v-if="!isAuthenticated" class="auth-screen">
      <div class="auth-card">
        <div class="auth-icon">🔐</div>
        <h2>Режим обучения</h2>
        <p>Введите пароль, чтобы прогресс сохранялся только для вас</p>
        <div class="auth-form">
          <input
              v-model="authPassword"
              type="password"
              placeholder="Пароль"
              class="auth-input"
              @keyup.enter="tryAuth"
              ref="authInputRef"
          >
          <button @click="tryAuth" class="auth-btn">Войти</button>
        </div>
        <p v-if="authError" class="auth-error">{{ authError }}</p>
      </div>
    </div>

    <!-- ── Выбор режима ──────────────────────────────────────────────────── -->
    <div v-else-if="!selectedMode" class="mode-selection">
      <div class="mode-cards">
        <div class="mode-card" @click="selectMode('cards')">
          <div class="mode-icon">🃏</div>
          <h3>Карточки</h3>
          <p>Традиционные карточки с выбором ответа</p>
        </div>
        <div class="mode-card" @click="selectMode('input')">
          <div class="mode-icon">⌨️</div>
          <h3>Ввод ответа</h3>
          <p>Пишите ответ на клавиатуре</p>
        </div>
        <div class="mode-card" @click="selectMode('syllables')">
          <div class="mode-icon">🧩</div>
          <h3>Сборка слогов</h3>
          <p>Соберите слово из корейских слогов</p>
        </div>
      </div>
    </div>

    <!-- ── Режимы ────────────────────────────────────────────────────────── -->
    <FlashcardsMode v-else-if="selectedMode === 'cards'"     @back="goBack" />
    <InputMode      v-else-if="selectedMode === 'input'"     @back="goBack" />
    <SyllablesMode  v-else-if="selectedMode === 'syllables'" @back="goBack" />

  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import FlashcardsMode from './learning-modes/FlashcardsMode.vue'
import InputMode      from './learning-modes/InputMode.vue'
import SyllablesMode  from './learning-modes/SyllablesMode.vue'

const LEARNING_PASSWORD = 'Korean262842!'

export default {
  name: 'Learning',
  components: { FlashcardsMode, InputMode, SyllablesMode },
  setup() {
    const selectedMode    = ref(null)
    const isAuthenticated = ref(false)
    const authPassword    = ref('')
    const authError       = ref('')
    const authInputRef    = ref(null)

    onMounted(() => {
      if (sessionStorage.getItem('learningAuth') === 'true') {
        isAuthenticated.value = true
      } else {
        // автофокус на поле пароля
        nextTick(() => authInputRef.value?.focus())
      }
    })

    const tryAuth = () => {
      if (authPassword.value === LEARNING_PASSWORD) {
        isAuthenticated.value = true
        authError.value       = ''
        sessionStorage.setItem('learningAuth', 'true')
      } else {
        authError.value    = 'Неверный пароль'
        authPassword.value = ''
        nextTick(() => authInputRef.value?.focus())
      }
    }

    const selectMode = (mode) => { selectedMode.value = mode }
    const goBack     = ()     => { selectedMode.value = null }

    return {
      selectedMode, isAuthenticated,
      authPassword, authError, authInputRef,
      tryAuth, selectMode, goBack,
    }
  }
}
</script>

<style scoped>
.learning { min-height: 100%; padding: 20px; }

/* ── Авторизация ──────────────────────────────────────────────────────────── */
.auth-screen {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 55vh;
}

.auth-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  padding: 45px 38px;
  text-align: center;
  color: white;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.auth-icon { font-size: 3.2em; margin-bottom: 14px; }

.auth-card h2 {
  font-size: 1.55em;
  margin-bottom: 10px;
}

.auth-card p {
  opacity: 0.82;
  font-size: 14px;
  margin-bottom: 28px;
  line-height: 1.5;
}

.auth-form { display: flex; flex-direction: column; gap: 12px; }

.auth-input {
  padding: 14px 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  color: white;
  font-size: 16px;
  text-align: center;
  letter-spacing: 2px;
  transition: border-color 0.2s;
}

.auth-input::placeholder { color: rgba(255, 255, 255, 0.55); letter-spacing: 0; }
.auth-input:focus { border-color: rgba(255, 255, 255, 0.75); outline: none; }

.auth-btn {
  padding: 14px;
  background: rgba(255, 255, 255, 0.92);
  color: #667eea;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-btn:hover { background: white; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

.auth-error {
  color: #ffb3b3;
  margin-top: 12px;
  font-size: 14px;
  animation: shake 0.3s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-6px); }
  75%       { transform: translateX(6px); }
}

/* ── Выбор режима ─────────────────────────────────────────────────────────── */
.mode-selection { text-align: center; max-width: 800px; margin: 0 auto; }

.mode-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.mode-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 200px;
  justify-content: center;
}

.mode-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.mode-icon { font-size: 3em; margin-bottom: 15px; }
.mode-card h3 { font-size: 1.3em; margin-bottom: 10px; }
.mode-card p  { font-size: 0.9em; opacity: 0.9; line-height: 1.4; }

@media (max-width: 768px) {
  .learning { padding: 15px; }
  .mode-cards { grid-template-columns: 1fr; gap: 15px; }
  .mode-card  { padding: 20px; min-height: 180px; }
  .auth-card  { padding: 30px 20px; }
  .auth-icon  { font-size: 2.6em; }
}
</style>