<template>
  <div id="app">
    <header class="header">
      <h1>❤️ Корейский с любовью</h1>
      <nav class="nav">
        <button
            @click="currentView = 'flashcards'"
            :class="{ active: currentView === 'flashcards' }"
        >
          Карточки
        </button>
        <button
            @click="currentView = 'dictionary'"
            :class="{ active: currentView === 'dictionary' }"
        >
          Словарь
        </button>
      </nav>
    </header>

    <main class="main">
      <Flashcards v-if="currentView === 'flashcards'" />
      <Dictionary v-if="currentView === 'dictionary'" />
    </main>
  </div>
</template>

<script>
import { ref } from 'vue'
import Flashcards from './components/Flashcards.vue'
import Dictionary from './components/Dictionary.vue'

export default {
  name: 'App',
  components: {
    Flashcards,
    Dictionary,
  },
  setup() {
    const currentView = ref('flashcards')

    return {
      currentView
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Arial', sans-serif;
  background: linear-gradient(135deg, #66b9ea 0%, #764ba2 100%);
  min-height: 100vh;
  /* Фиксированный фон, который всегда покрывает весь экран */
  background-attachment: fixed;
  background-size: cover;
}

#app {
  min-height: 100vh;
  padding: 20px;
  /* Обеспечиваем, чтобы app всегда был не меньше высоты экрана */
  display: flex;
  flex-direction: column;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  /* Заголовок остается вверху без прокрутки */
  flex-shrink: 0;
}

.header h1 {
  color: white;
  margin-bottom: 20px;
  font-size: 2.5em;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.nav {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.nav button {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  background: rgba(255,255,255,0.2);
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.nav button:hover {
  background: rgba(255,255,255,0.3);
  transform: translateY(-2px);
}

.nav button.active {
  background: rgba(255,255,255,0.9);
  color: #667eea;
  font-weight: bold;
}

.main {
  max-width: 800px;
  margin: 0 auto;
  /* Основной контент может прокручиваться */
  flex-grow: 1;
  width: 100%;
  /* Добавляем отступ снизу для лучшего внешнего вида */
  padding-bottom: 20px;
}

input:focus, select:focus, button:focus {
  outline: 2px solid white;
}

/* Дополнительные стили для обеспечения корректного отображения на мобильных устройствах */
@media (max-width: 768px) {
  #app {
    padding: 15px;
  }

  .header h1 {
    font-size: 2em;
  }

  .nav {
    gap: 8px;
  }

  .nav button {
    padding: 10px 20px;
    font-size: 14px;
  }
}
</style>