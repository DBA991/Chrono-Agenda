<template>
  <div class="app-container">
    <header class="top-bar">
      <div class="brand">
        <span class="app-name">Chrono</span>
      </div>

      <nav class="nav-tabs">
        <button
          v-for="item in navItems"
          :key="item.value"
          @click="handleNavClick(item.value)"
          :class="['nav-item', { active: tab === item.value }]"
        >
          <component :is="item.icon" size="18" />
          {{ item.label }}
        </button>
      </nav>

      <div class="status-area">
        <div class="time-display">{{ currentTime }}</div>

        <div class="status-icons">
          <span v-if="activeAlarms.length > 0" class="status-indicator warning">
            <BellRing size="16" />
          </span>
          <span v-if="activeTimer" class="status-indicator success">
            <Timer size="16" />
          </span>
          <span v-if="isRadioOpen" class="status-indicator info">
            <RadioIcon size="16" />
          </span>
        </div>

        <button @click="toggleTheme" class="btn-icon theme-toggle">
          <Sun v-if="isDark" size="18" />
          <Moon v-else size="18" />
        </button>
      </div>
    </header>

    <main class="main-content">
      <keep-alive>
        <component :is="currentView" />
      </keep-alive>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import {
  StickyNote,
  Calendar as CalendarIcon,
  Table,
  Book,
  AlarmClock,
  Radio as RadioIcon,
  Sun,
  Moon,
  BellRing,
  Timer
} from 'lucide-vue-next'

import Notes from './components/Notes.vue'
import Calendar from './components/Calendar.vue'
import WeeklySchedule from './components/WeeklySchedule.vue'
import Diary from './components/Diary.vue'
import Alarms from './components/Alarms.vue'

const tab = ref('calendar')
const store = useStore()
const currentTime = ref(new Date().toLocaleTimeString())
const isDark = ref(false)
const isRadioOpen = ref(false)

const navItems = [
  { label: 'Notes', value: 'notes', icon: StickyNote },
  { label: 'Calendar', value: 'calendar', icon: CalendarIcon },
  { label: 'Schedule', value: 'schedule', icon: Table },
  { label: 'Diary', value: 'diary', icon: Book },
  { label: 'Alarms', value: 'alarms', icon: AlarmClock },
  { label: 'Radio', value: 'radio', icon: RadioIcon }
]

// Mapping string value to component (escluso Radio)
const componentsMap = {
  notes: Notes,
  calendar: Calendar,
  schedule: WeeklySchedule,
  diary: Diary,
  alarms: Alarms
}

const currentView = computed(() => componentsMap[tab.value])

// Gestione click navigazione
const handleNavClick = async (value) => {
  if (value === 'radio') {
    // Apri/chiudi finestra Radio
    const result = await window.electronAPI.toggleRadioWindow()
    isRadioOpen.value = result.status === 'opened'

    // Non cambiare tab se si clicca su Radio
    return
  }

  tab.value = value
}

// Verifica stato Radio window all'avvio
const checkRadioStatus = async () => {
  isRadioOpen.value = await window.electronAPI.isRadioWindowOpen()
}

let timeInterval
onMounted(async () => {
  timeInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString()
    store.commit('updateCurrentTime', Date.now())
  }, 1000)

  // Load theme preference
  const savedTheme = localStorage.getItem('chrono-theme')
  if (
    savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    isDark.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
    document.documentElement.classList.add('dark')
  }

  // Verifica stato finestra Radio
  await checkRadioStatus()

  // Poll periodico per sincronizzare lo stato (opzionale)
  setInterval(checkRadioStatus, 2000)
})

const toggleTheme = () => {
  isDark.value = !isDark.value
  const theme = isDark.value ? 'dark' : 'light'

  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('chrono-theme', theme)

  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

onBeforeUnmount(() => {
  clearInterval(timeInterval)
})

const activeAlarms = computed(() => store.state.alarms?.filter((a) => a?.active) || [])
const activeTimer = computed(() => store.state.timer?.isRunning || false)
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-app);
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 60px;
  background-color: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--primary);
}

.nav-tabs {
  display: flex;
  gap: 0.5rem;
  background: var(--bg-input);
  padding: 0.25rem;
  border-radius: 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-item:hover {
  color: var(--text-main);
}

.nav-item.active {
  background-color: var(--bg-panel);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.time-display {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.status-icons {
  display: flex;
  gap: 0.5rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 50%;
}
.status-indicator.warning {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}
.status-indicator.success {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}
.status-indicator.info {
  color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
}
.btn-icon:hover {
  background-color: var(--bg-hover);
  color: var(--text-main);
}

.main-content {
  flex: 1;
  overflow: hidden;
  padding: 1.5rem;
}
</style>
