<template>
  <div class="calendar-layout">
    <div class="calendar-section card">
      <div class="calendar-wrapper">
        <v-calendar
          ref="calendar"
          v-model="selectedDate"
          :attributes="calendarAttributes"
          expanded
          :is-dark="isDark"
          trim-weeks
          locale="en"
          @dayclick="handleDayClick"
          class="custom-calendar"
        />
      </div>
    </div>

    <div class="events-section card">
      <div class="events-header">
        <h3>Events for {{ formattedDateDisplay }}</h3>
      </div>

      <div class="events-list-container">
        <ul v-if="filteredEvents.length" class="events-list">
          <li v-for="(event, index) in filteredEvents" :key="index" class="event-item">
            <span class="event-text">{{ event.text }}</span>
            <button @click="deleteEvent(event)" class="btn-icon danger">
              <X size="16" />
            </button>
          </li>
        </ul>
        <div v-else class="empty-state">No events for this day</div>
      </div>

      <div class="add-event-form">
        <textarea
          v-model="newEventText"
          placeholder="New Event..."
          maxlength="280"
          class="textarea-field"
          rows="2"
        ></textarea>

        <div class="form-actions">
          <label class="checkbox-label">
            <input type="checkbox" v-model="eventRepeat" />
            Repeat annually
          </label>
          <button @click="addEvent" :disabled="!newEventText.trim()" class="btn btn-primary">
            <Plus size="16" /> Add
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import moment from 'moment'
import { Plus, X } from 'lucide-vue-next'

const store = useStore()
const { state, dispatch } = store

const eventRepeat = ref(false)
const isDark = computed(() => document.documentElement.getAttribute('data-theme') === 'dark')

onMounted(async () => {
  await store.dispatch('loadEvents')
  window.electronAPI.onEventUpdated(() => {
    store.dispatch('loadEvents')
  })
})

const selectedDate = computed({
  get: () => state.currentDate,
  set: (value) => store.commit('setDate', value)
})

const newEventText = ref('')
const formattedSelectedDate = computed(() => moment(selectedDate.value).format('YYYY-MM-DD'))
const formattedDateDisplay = computed(() => moment(selectedDate.value).format('DD/MM/YYYY'))

const filteredEvents = computed(() =>
  state.events.filter((e) => e.date === formattedSelectedDate.value)
)

const calendarAttributes = computed(() => [
  {
    key: 'events',
    dot: { color: 'red' }, // Changed highlight to dot for cleaner look
    dates: state.events
      .filter((event) => !event.date.includes(moment().format('YYYY-MM-DD')))
      .map((event) => new Date(event.date))
  },
  {
    key: 'today',
    highlight: { color: 'blue', fillMode: 'light' },
    dates: new Date(),
    order: 1
  }
])

const handleDayClick = (day) => {
  selectedDate.value = day.date
}

const addEvent = async () => {
  await dispatch('saveEvent', {
    date: formattedSelectedDate.value,
    text: newEventText.value.trim(),
    repeat: eventRepeat.value
  })
  newEventText.value = ''
  eventRepeat.value = false
}

const deleteEvent = async (event) => {
  await dispatch('deleteEvent', event.filename)
}
</script>

<style scoped>
.calendar-layout {
  display: flex;
  height: 100%;
  gap: 1.5rem;
}

.calendar-section {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.calendar-wrapper {
  height: 100%;
  /* Override v-calendar default styles via wrapper if needed */
}
/* Deep selector for v-calendar dark mode adjustment integration */
:deep(.vc-container) {
  border: none;
  background-color: transparent;
  width: 100%;
  height: 100%;
}
:deep(.vc-header) {
  padding-bottom: 20px;
}

.events-section {
  width: 350px;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

.events-header h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: var(--primary);
}

.events-list-container {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.events-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.event-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
  gap: 0.5rem;
}

.event-text {
  font-size: 0.9rem;
  word-break: break-word;
}

.btn-icon.danger {
  color: var(--text-muted);
}
.btn-icon.danger:hover {
  color: var(--danger);
  background: var(--bg-hover);
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  margin-top: 2rem;
  font-style: italic;
}

.add-event-form {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
}
</style>
