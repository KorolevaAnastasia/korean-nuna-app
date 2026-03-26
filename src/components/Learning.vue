<template>
  <div class="learning">
    <div v-if="!selectedMode" class="mode-selection">
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

    <FlashcardsMode v-else-if="selectedMode === 'cards'" @back="goBack" />
    <InputMode v-else-if="selectedMode === 'input'" @back="goBack" />
    <SyllablesMode v-else-if="selectedMode === 'syllables'" @back="goBack" />
  </div>
</template>

<script>
import { ref } from 'vue'
import FlashcardsMode from './learning-modes/FlashcardsMode.vue'
import InputMode from './learning-modes/InputMode.vue'
import SyllablesMode from './learning-modes/SyllablesMode.vue'

export default {
  name: 'Learning',
  components: { FlashcardsMode, InputMode, SyllablesMode },
  setup() {
    const selectedMode = ref(null)

    const selectMode = (mode) => { selectedMode.value = mode }
    const goBack = () => { selectedMode.value = null }

    return { selectedMode, selectMode, goBack }
  }
}
</script>

<style scoped>
.learning { min-height: 100%; padding: 20px; }

.mode-selection {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.mode-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.mode-card {
  background: rgba(255,255,255,0.1);
  border-radius: 15px;
  padding: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
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
  background: rgba(255,255,255,0.15);
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}

.mode-icon { font-size: 3em; margin-bottom: 15px; }
.mode-card h3 { font-size: 1.3em; margin-bottom: 10px; }
.mode-card p { font-size: 0.9em; opacity: 0.9; line-height: 1.4; }

@media (max-width: 768px) {
  .learning { padding: 15px; }
  .mode-cards { grid-template-columns: 1fr; gap: 15px; }
  .mode-card { padding: 20px; min-height: 180px; }
  .mode-icon { font-size: 2.5em; }
}
</style>