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
<!--        <button
            @click="currentView = 'admin'"
            :class="{ active: currentView === 'admin' }"
        >
          Добавить слово
        </button>-->
      </nav>
    </header>

    <main class="main">
      <Flashcards v-if="currentView === 'flashcards'" />
      <Dictionary v-if="currentView === 'dictionary'" />
      <Admin v-if="currentView === 'admin'" />
    </main>
  </div>
</template>

<script>
import { ref } from 'vue'
import Flashcards from './components/Flashcards.vue'
import Dictionary from './components/Dictionary.vue'
import Admin from './components/Admin.vue'

export default {
  name: 'App',
  components: {
    Flashcards,
    Dictionary,
    Admin
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
}

#app {
  min-height: 100vh;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
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
}

input:focus, select:focus, button:focus {
  outline: 2px solid white;
}
</style>