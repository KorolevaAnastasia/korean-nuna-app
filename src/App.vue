<template>
  <div id="app">
    <header class="header">
      <h1>❤️ Корейский с любовью</h1>
      <nav class="nav">
        <button
            @click="currentView = 'learning'"
            :class="{ active: currentView === 'learning' }"
        >
          Обучение
        </button>
        <button
            @click="currentView = 'dictionary'"
            :class="{ active: currentView === 'dictionary' }"
        >
          Словарь
        </button>
        <button
            @click="currentView = 'admin'"
            :class="{ active: currentView === 'admin' }"
        >
          Админ
        </button>
      </nav>
    </header>

    <main class="main">
      <Learning v-if="currentView === 'learning'" />
      <Dictionary v-if="currentView === 'dictionary'" />
      <Admin v-if="currentView === 'admin'" />
    </main>
  </div>
</template>

<script>
import { ref } from 'vue'
import Learning from './components/Learning.vue'
import Dictionary from './components/Dictionary.vue'
import Admin from "./components/Admin.vue";

export default {
  name: 'App',
  components: {
    Admin,
    Learning,
    Dictionary,
  },
  setup() {
    const currentView = ref('learning')

    return {
      currentView
    }
  }
}
</script>

<style>
/* Стили оставляем как были */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Arial', sans-serif;
  background: linear-gradient(135deg, #66b9ea 0%, #764ba2 100%);
  min-height: 100vh;
  background-attachment: fixed;
  background-size: cover;
}

#app {
  min-height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  flex-shrink: 0;
}

.header h1 {
  color: white;
  margin-bottom: 20px;
  font-size: 2.5em;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.mode-select > * {
  color: #1a1a1a;
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
  flex-grow: 1;
  width: 100%;
  padding-bottom: 20px;
}

input:focus, select:focus, button:focus {
  outline: 2px solid white;
}

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