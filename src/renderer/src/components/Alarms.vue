<template>
  <div class="alarms-layout">
    <div class="panel-alarms card">
      <div class="panel-header">
        <h3>Alarms</h3>
        <div class="header-actions">
          <button
            @click="deleteSelectedAlarms"
            :disabled="selectedAlarms.length === 0"
            class="btn btn-danger btn-sm"
          >
            <Trash2 size="16" />
          </button>
          <button @click="showAddAlarm = true" class="btn btn-primary btn-sm">
            <Plus size="16" /> Add
          </button>
        </div>
      </div>

      <div class="alarms-list">
        <div
          v-for="alarm in alarms"
          :key="alarm.filename"
          class="alarm-item"
          :class="{ selected: selectedAlarms.includes(alarm.filename) }"
          @click="toggleAlarmSelection(alarm.filename)"
        >
          <div class="alarm-info">
            <div class="alarm-time">{{ alarm.time.substring(0, 5) }}</div>
            <div class="alarm-meta">
              <span v-if="alarm.repeatDays?.length">{{ formatRepeatDays(alarm.repeatDays) }}</span>
              <span v-else>One-time</span>
              <span class="bullet" v-if="alarm.message">•</span>
              <span>{{ alarm.message }}</span>
            </div>
          </div>
          <div class="alarm-status">
            <BellRing v-if="isAlarmActive(alarm)" class="ringing-icon" size="20" />
          </div>
        </div>
      </div>
    </div>

    <div class="panel-timer card">
      <div class="timer-display-container">
        <div class="timer-circle" :class="timer.phase">
          <div class="timer-time">{{ formatTimer(timer.currentTime) }}</div>
          <div class="timer-phase">{{ timer.phase.replace(/([A-Z])/g, ' $1').trim() }}</div>
          <div class="timer-cycle">
            Cycle {{ timer.currentCycle }}/{{ pomodoroSettings.cycles }}
          </div>
        </div>
      </div>

      <div class="timer-controls">
        <template v-if="timer.isRunning">
          <button @click="togglePause" class="btn btn-primary">
            <Play v-if="timer.isPaused" size="20" />
            <Pause v-else size="20" />
            {{ timer.isPaused ? 'Resume' : 'Pause' }}
          </button>
          <button @click="skipPhase" class="btn btn-ghost"><SkipForward size="20" /> Skip</button>
          <button @click="stopTimer" class="btn btn-danger"><Square size="20" /> Stop</button>
        </template>
        <button v-else @click="startTimer" class="btn btn-primary btn-lg">
          <Play size="24" /> Start Focus
        </button>
      </div>

      <div class="timer-settings">
        <div class="setting-group">
          <label>Focus</label>
          <input
            type="number"
            v-model.number="pomodoroSettings.focus"
            @change="validateNumber('focus')"
            class="input-field small"
          />
        </div>
        <div class="setting-group">
          <label>Short Break</label>
          <input
            type="number"
            v-model.number="pomodoroSettings.pause"
            @change="validateNumber('pause')"
            class="input-field small"
          />
        </div>
        <div class="setting-group">
          <label>Long Break</label>
          <input
            type="number"
            v-model.number="pomodoroSettings.longPause"
            @change="validateNumber('longPause')"
            class="input-field small"
          />
        </div>
        <div class="setting-group">
          <label>Cycles</label>
          <input
            type="number"
            v-model.number="pomodoroSettings.cycles"
            @change="validateNumber('cycles')"
            class="input-field small"
          />
        </div>
      </div>
    </div>

    <div v-if="showAddAlarm" class="modal-overlay" @click.self="cancelAlarm">
      <div class="modal-content">
        <h3>Set New Alarm</h3>

        <div class="time-inputs">
          <input
            type="number"
            v-model.number="newAlarm.hours"
            min="0"
            max="23"
            placeholder="HH"
            class="input-field time-input"
            @focus="selectAll($event)"
            @input="validateHours"
          />
          <span>:</span>
          <input
            type="number"
            v-model.number="newAlarm.minutes"
            min="0"
            max="59"
            placeholder="MM"
            class="input-field time-input"
            @focus="selectAll($event)"
            @input="validateMinutes"
          />
        </div>

        <div class="form-group">
          <input
            v-model="newAlarm.message"
            placeholder="Alarm label (optional)"
            class="input-field"
            maxlength="50"
            @input="truncateMessage"
          />
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="newAlarm.repeat" />
            Repeat daily
          </label>
        </div>

        <div v-if="newAlarm.repeat">
          <div class="all-days-checkbox">
            <input
              type="checkbox"
              id="all-days"
              v-model="allDaysSelected"
              @change="toggleAllDays"
            />
            <span>All days</span>
          </div>

          <div class="section-label">Or select specific days:</div>
          <div class="days-grid">
            <label v-for="day in daysOfWeek" :key="day.value" class="day-checkbox">
              <input type="checkbox" v-model="newAlarm.repeatDays" :value="day.value" />
              <span>{{ day.label }}</span>
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="cancelAlarm" class="btn btn-ghost">Cancel</button>
          <button @click="saveAlarm" :disabled="!isAlarmValid" class="btn btn-primary">
            Save Alarm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useStore } from 'vuex'
import moment from 'moment'
import { Plus, Trash2, BellRing, Play, Pause, Square, SkipForward } from 'lucide-vue-next'

const store = useStore()

// --- ALARM LOGIC ---
const daysOfWeek = [
  { label: 'M', value: 'mon' },
  { label: 'T', value: 'tue' },
  { label: 'W', value: 'wed' },
  { label: 'T', value: 'thu' },
  { label: 'F', value: 'fri' },
  { label: 'S', value: 'sat' },
  { label: 'S', value: 'sun' }
]

const alarms = ref([])
const selectedAlarms = ref([])
const showAddAlarm = ref(false)
const newAlarm = ref({ hours: 0, minutes: 0, message: 'Wake up!', repeat: false, repeatDays: [] })
const allDaysSelected = ref(false)

const validateHours = () => {
  if (newAlarm.value.hours < 0) newAlarm.value.hours = 0
  if (newAlarm.value.hours > 23) newAlarm.value.hours = 23
}

const validateMinutes = () => {
  if (newAlarm.value.minutes < 0) newAlarm.value.minutes = 0
  if (newAlarm.value.minutes > 59) newAlarm.value.minutes = 59
}

const truncateMessage = () => {
  if (newAlarm.value.message.length > 50) {
    newAlarm.value.message = newAlarm.value.message.substring(0, 50)
  }
}

const isAlarmValid = computed(() => {
  const hours = newAlarm.value.hours
  const minutes = newAlarm.value.minutes
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
})

const loadAlarms = async () => {
  const files = await window.electronAPI.loadAlarms()
  alarms.value = files
    .map((file) => {
      try {
        let alarmTime = file.data?.time || '00:00:02'
        if (alarmTime.split(':').length === 2) alarmTime += ':02'
        return {
          time: alarmTime,
          message: file.data?.message || 'Sveglia',
          repeat: !!file.data?.repeat,
          repeatDays: Array.isArray(file.data?.repeatDays)
            ? file.data.repeatDays.filter((d) => typeof d === 'string')
            : [],
          filename: file.filename,
          id: file.data?.id || Date.now(),
          lastTriggered: file.data?.lastTriggered || null
        }
      } catch (e) {
        return null
      }
    })
    .filter((a) => a && /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(a.time))
}

const formatRepeatDays = (days) => days.map((day) => day.toUpperCase().substring(0, 3)).join(', ')

const isAlarmActive = (alarm) => {
  const now = moment(store.state.currentTime)
  const alarmTime = moment(alarm.time, 'HH:mm:ss')
  const timeMatch = now.format('HH:mm:ss') === alarmTime.format('HH:mm:ss')
  if (alarm.repeatDays?.length) {
    const currentDay = now.format('ddd').toLowerCase()
    const todayDate = now.format('YYYY-MM-DD')
    const alreadyTriggeredToday = alarm.lastTriggered === todayDate
    return timeMatch && alarm.repeatDays.includes(currentDay) && !alreadyTriggeredToday
  }
  return timeMatch
}

const saveAlarm = async () => {
  try {
    const hours = Math.max(0, Math.min(23, newAlarm.value.hours || 0))
    const minutes = Math.max(0, Math.min(59, newAlarm.value.minutes || 0))
    const alarmData = {
      id: Date.now(),
      time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:02`,
      message: (newAlarm.value.message?.trim() || 'Wake up!').substring(0, 50),
      repeat: !!newAlarm.value.repeat,
      repeatDays: Array.isArray(newAlarm.value.repeatDays)
        ? newAlarm.value.repeatDays.map(String)
        : [],
      created: Date.now(),
      lastTriggered: null
    }
    let filename = `alarm-${alarmData.time.replace(/:/g, '-')}`
    if (alarmData.repeat && alarmData.repeatDays.length)
      filename += `-REPEAT-${alarmData.repeatDays.join('-')}`
    filename += `.json`
    await window.electronAPI.saveAlarm({ filename, data: JSON.parse(JSON.stringify(alarmData)) })
    showAddAlarm.value = false
    resetNewAlarm()
    await loadAlarms()
  } catch (error) {
    console.error(error)
  }
}

const deleteSelectedAlarms = async () => {
  await Promise.allSettled(
    selectedAlarms.value.map((filename) => window.electronAPI.deleteAlarm(filename))
  )
  selectedAlarms.value = []
  await loadAlarms()
}

const toggleAlarmSelection = (filename) => {
  const index = selectedAlarms.value.indexOf(filename)
  if (index === -1) selectedAlarms.value.push(filename)
  else selectedAlarms.value.splice(index, 1)
}

const toggleAllDays = () => {
  if (allDaysSelected.value) {
    newAlarm.value.repeatDays = daysOfWeek.map((day) => day.value)
  } else {
    newAlarm.value.repeatDays = []
  }
}

const selectAll = (event) => {
  event.target.select()
}

const resetNewAlarm = () => {
  newAlarm.value = {
    hours: 0,
    minutes: 0,
    message: 'Wake up!',
    repeat: false,
    repeatDays: []
  }
  allDaysSelected.value = false
}

const cancelAlarm = () => {
  showAddAlarm.value = false
  resetNewAlarm()
}

watch(
  () => store.state.currentTime,
  async (newTime) => {
    const now = moment(newTime)
    if (now.second() === 2) {
      const todayDate = now.format('YYYY-MM-DD')
      for (const alarm of alarms.value) {
        if (isAlarmActive(alarm)) {
          window.electronAPI.showNotification({ title: 'Hey,', body: alarm.message, sound: true })
          if (alarm.repeatDays?.length) {
            const updatedAlarm = { ...alarm, lastTriggered: todayDate }
            await window.electronAPI.saveAlarm({ filename: alarm.filename, data: updatedAlarm })
            const index = alarms.value.findIndex((a) => a.filename === alarm.filename)
            if (index !== -1) alarms.value[index] = updatedAlarm
          } else {
            await window.electronAPI.deleteAlarm(alarm.filename)
            alarms.value = alarms.value.filter((a) => a.filename !== alarm.filename)
          }
        }
      }
    }
  },
  { immediate: true }
)

watch(
  () => newAlarm.value.repeatDays,
  (newDays) => {
    if (newDays.length === daysOfWeek.length) {
      allDaysSelected.value = true
    } else {
      allDaysSelected.value = false
    }
  },
  { deep: true }
)

watch(() => newAlarm.value.hours, validateHours)
watch(() => newAlarm.value.minutes, validateMinutes)

// --- POMODORO LOGIC ---
const pomodoroSettings = ref({ focus: 25, pause: 5, longPause: 15, cycles: 4 })
const timer = ref({
  isRunning: false,
  isPaused: false,
  currentTime: 0,
  currentCycle: 1,
  phase: 'focus',
  interval: null
})

const validatedSettings = computed(() => ({
  focus: Math.max(1, Number(pomodoroSettings.value.focus)) || 1,
  pause: Math.max(1, Number(pomodoroSettings.value.pause)) || 1,
  longPause: Math.max(1, Number(pomodoroSettings.value.longPause)) || 1,
  cycles: Math.max(1, Number(pomodoroSettings.value.cycles)) || 1
}))

const startTimer = (initialTime) => {
  if (timer.value.interval) clearInterval(timer.value.interval)

  const phaseDuration = validatedSettings.value[timer.value.phase]
  timer.value.currentTime = initialTime > 0 ? Number(initialTime) : phaseDuration * 60

  timer.value.isRunning = true
  timer.value.isPaused = false

  timer.value.interval = setInterval(() => {
    if (!timer.value.isPaused) {
      if (timer.value.currentTime <= 0) {
        handlePhaseCompletion()
        return
      }
      timer.value.currentTime--
    }
  }, 1000)
}

const stopTimer = () => {
  clearInterval(timer.value.interval)
  timer.value = {
    isRunning: false,
    isPaused: false,
    currentTime: 0,
    currentCycle: 1,
    phase: 'focus',
    interval: null
  }
}

const togglePause = () => {
  timer.value.isPaused = !timer.value.isPaused

  if (timer.value.isPaused) {
    clearInterval(timer.value.interval)
    window.electronAPI.showNotification({
      title: 'Timer Paused',
      body: 'Focus timer has been paused',
      sound: false
    })
  } else {
    window.electronAPI.showNotification({
      title: 'Timer Resumed',
      body: 'Focus timer has been resumed',
      sound: false
    })
    startTimer(timer.value.currentTime)
  }
}

const skipPhase = () => {
  clearInterval(timer.value.interval)
  handlePhaseCompletion(true)
}

const handlePhaseCompletion = (isSkip = false) => {
  clearInterval(timer.value.interval)

  const oldPhase = timer.value.phase
  let newPhase = timer.value.phase
  let newCycle = timer.value.currentCycle

  if (timer.value.phase === 'focus') {
    if (timer.value.currentCycle === validatedSettings.value.cycles) {
      newPhase = 'longPause'
    } else {
      newPhase = 'pause'
    }
  } else {
    newPhase = 'focus'
    if (timer.value.phase === 'pause') {
      newCycle = timer.value.currentCycle + 1
    } else if (timer.value.phase === 'longPause') {
      newCycle = 1
    }
  }

  timer.value.phase = newPhase
  timer.value.currentCycle = newCycle

  window.electronAPI.showNotification({
    title: isSkip ? 'Phase skipped!' : `${oldPhase.replace(/([A-Z])/g, ' $1').trim()} finished!`,
    body: `Starting ${newPhase.replace(/([A-Z])/g, ' $1').trim()} phase: ${validatedSettings.value[newPhase]} minutes`,
    sound: true
  })

  startTimer()
}

const formatTimer = (seconds) => {
  if (isNaN(seconds) || seconds < 0) seconds = 0
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const validateNumber = (field) => {
  if (isNaN(pomodoroSettings.value[field]) || pomodoroSettings.value[field] < 1)
    pomodoroSettings.value[field] = 1
}

onMounted(async () => {
  await loadAlarms()
  timer.value.currentTime = 0
  validateNumber('focus')
})
</script>

<!-- Stili mantenuti identici all'originale -->

<style scoped>
.alarms-layout {
  display: flex;
  height: 100%;
  gap: 1.5rem;
}
.panel-alarms,
.panel-timer {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.panel-header h3 {
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 0.5rem;
}

.alarms-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.alarm-item {
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.alarm-item:hover {
  background-color: var(--bg-hover);
}
.alarm-item.selected {
  border-color: var(--primary);
  background-color: rgba(99, 102, 241, 0.1);
}
.alarm-time {
  font-weight: 700;
  font-size: 1.2rem;
}
.alarm-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  gap: 4px;
}

.timer-display-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
.timer-circle {
  width: 250px;
  height: 250px;
  border-radius: 50%;
  border: 4px solid var(--border);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: border-color 0.3s;
}
.timer-circle.focus {
  border-color: var(--primary);
}
.timer-circle.pause {
  border-color: #10b981;
}
.timer-time {
  font-size: 3.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.timer-phase {
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.timer-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin: 2rem 0;
}
.timer-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}
.setting-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.setting-group label {
  font-size: 0.75rem;
  color: var(--text-muted);
}
.input-field.small {
  padding: 4px 8px;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: var(--bg-panel);
  padding: 2rem;
  border-radius: var(--radius);
  width: 90%;
  max-width: 500px;
  min-width: 450px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-content h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-main);
  text-align: center;
}

.time-inputs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 2rem 0;
}

.time-input {
  width: 100px;
  height: 80px;
  text-align: center;
  font-size: 2.5rem;
  font-weight: 600;
  border: 3px solid var(--border);
  border-radius: 12px;
  background-color: var(--bg-input);
  color: var(--text-main);
  transition: all 0.2s;
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
}

.time-input::-webkit-outer-spin-button,
.time-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.time-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
  transform: translateY(-2px);
}

.time-inputs span {
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--text-muted);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-main);
}

.all-days-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  background-color: var(--bg-input);
  border-radius: 10px;
  border: 1px solid var(--border);
}

.all-days-checkbox input[type='checkbox'] {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 2px solid var(--border);
  background-color: var(--bg-panel);
  cursor: pointer;
  appearance: none;
  position: relative;
  transition: all 0.2s;
}

.all-days-checkbox input[type='checkbox']:checked {
  background-color: var(--primary);
  border-color: var(--primary);
}

.all-days-checkbox input[type='checkbox']:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 0.875rem;
  font-weight: bold;
}

.all-days-checkbox span {
  font-weight: 500;
  color: var(--text-main);
}

.days-grid {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  justify-content: center;
}

.day-checkbox {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.day-checkbox input[type='checkbox'] {
  display: none;
}

.day-checkbox span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background-color: var(--bg-input);
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.day-checkbox input[type='checkbox']:checked + span {
  background-color: var(--primary);
  color: white;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.day-checkbox span:hover {
  background-color: var(--bg-hover);
  transform: translateY(-1px);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.modal-actions .btn {
  flex: 1;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 10px;
  transition: all 0.2s;
}

.modal-actions .btn-primary {
  background-color: var(--primary);
  color: white;
}

.modal-actions .btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.modal-actions .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.modal-actions .btn-ghost {
  background-color: transparent;
  border: 2px solid var(--border);
  color: var(--text-muted);
}

.modal-actions .btn-ghost:hover:not(:disabled) {
  background-color: var(--bg-hover);
  color: var(--text-main);
  border-color: var(--text-muted);
}

.input-field {
  padding: 1rem 1.25rem;
  border: 2px solid var(--border);
  border-radius: 12px;
  background-color: var(--bg-input);
  color: var(--text-main);
  font-size: 1rem;
  transition: all 0.2s;
  height: 52px;
}

.input-field::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
  font-size: 0.95rem;
}

.input-field:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
  outline: none;
  transform: translateY(-1px);
}

[data-theme='dark'] .modal-content {
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.5),
    0 10px 10px -5px rgba(0, 0, 0, 0.3);
}

[data-theme='dark'] .all-days-checkbox {
  background-color: var(--bg-hover);
}

[data-theme='dark'] .day-checkbox span {
  background-color: var(--bg-hover);
}

.section-label {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
  text-align: center;
}

.btn:focus-visible,
.input-field:focus-visible,
.time-input:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.ringing-icon {
  color: var(--danger);
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@media (max-width: 640px) {
  .modal-content {
    width: 95%;
    padding: 1.5rem;
    min-width: unset;
  }

  .time-input {
    width: 80px;
    height: 70px;
    font-size: 2rem;
  }

  .days-grid {
    gap: 0.5rem;
  }

  .day-checkbox span {
    width: 38px;
    height: 38px;
  }
}
</style>
