<template>
  <div class="schedule-container">
    <div v-if="showDialog" class="modal-overlay" @click.self="closeDialog">
      <div class="modal-content">
        <h3 class="modal-title">
          {{ isNote ? 'Daily Note' : 'Schedule Entry' }}
          <span v-if="!isNote" class="subtitle"
            >for {{ selectedCell.time }} - {{ selectedCell.day }}</span
          >
        </h3>

        <div class="modal-body">
          <textarea
            v-model="selectedCell.text"
            :placeholder="isNote ? 'Enter daily notes...' : 'Enter schedule details...'"
            maxlength="280"
            class="textarea-field"
            rows="4"
          ></textarea>
          <div class="char-count">{{ textLength }}/280</div>
        </div>

        <div class="modal-actions">
          <button v-if="selectedCell.text" @click="deleteEntry" class="btn btn-danger">
            <Trash2 size="16" /> Delete
          </button>
          <div class="spacer"></div>
          <button @click="closeDialog" class="btn btn-ghost">Cancel</button>
          <button @click="saveEntry" :disabled="textLength > 280" class="btn btn-primary">
            <Save size="16" /> Save
          </button>
        </div>
      </div>
    </div>

    <div class="table-wrapper card">
      <table>
        <thead>
          <tr>
            <th class="time-header">Time</th>
            <th v-for="day in days" :key="day">{{ day }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="hour in hours" :key="hour">
            <td class="time-cell">{{ formatHour(hour) }}</td>
            <td
              v-for="day in days"
              :key="day"
              @click="openDialog(day, hour)"
              class="schedule-cell"
              :class="{ 'has-entry': hasEntry(day, hour) }"
            >
              <div class="cell-content">
                {{ getEntryPreview(day, hour) }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="notes-footer card">
      <div class="notes-label">Notes</div>
      <div class="notes-grid">
        <div
          v-for="day in days"
          :key="day"
          @click="openNotesDialog(day)"
          class="note-cell"
          :class="{ 'has-entry': hasNote(day) }"
        >
          <div class="cell-content">{{ getNotePreview(day) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { Trash2, Save } from 'lucide-vue-next'

const store = useStore()
const showDialog = ref(false)
const selectedCell = ref({ day: '', time: '', hour: null, text: '' })
const textLength = computed(() => selectedCell.value.text?.length || 0)
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const hours = Array.from({ length: 24 }, (_, i) => i)
const NOTES_HOUR = 25
const isNote = ref(false)

const openNotesDialog = (day) => {
  if (!days.includes(day)) return
  const key = `${day}-${NOTES_HOUR}`
  const entry = store.state.schedule[key] || { text: '' }
  selectedCell.value = { day, hour: NOTES_HOUR, text: entry.text }
  isNote.value = true
  showDialog.value = true
}

const hasNote = (day) => {
  const key = `${day}-${NOTES_HOUR}`
  return !!store.state.schedule[key]?.text
}
const getNotePreview = (day) => {
  const key = `${day}-${NOTES_HOUR}`
  const entry = store.state.schedule[key]
  if (!entry?.text) return '-'
  const maxLength = 20
  return entry.text.length > maxLength ? entry.text.substring(0, maxLength) + '...' : entry.text
}

const deleteEntry = async () => {
  const key = `${selectedCell.value.day}-${selectedCell.value.hour}`
  await window.electronAPI.deleteSchedule(key)
  store.commit('removeScheduleEntry', key)
  closeDialog()
}

const formatHour = (hour) => {
  const start = String(hour).padStart(2, '0')
  const end = String(hour + 1).padStart(2, '0')
  return `${start}-${end}`
}

const hasEntry = (day, hour) => !!store.state.schedule[`${day}-${hour}`]?.text

const getEntryPreview = (day, hour) => {
  const entry = store.state.schedule[`${day}-${hour}`]
  if (!entry?.text) return '-'
  const maxLength = 20
  return entry.text.length > maxLength ? entry.text.substring(0, maxLength) + '...' : entry.text
}

const openDialog = (day, hour) => {
  const entry = store.state.schedule[`${day}-${hour}`] || { text: '' }
  selectedCell.value = { day, time: formatHour(hour), hour, text: entry.text }
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  selectedCell.value = { day: '', time: '', text: '' }
  isNote.value = false
}

const saveEntry = async () => {
  const key = `${selectedCell.value.day}-${selectedCell.value.hour}`
  await window.electronAPI.saveSchedule({ key, text: selectedCell.value.text.slice(0, 280) })
  store.commit('setScheduleEntry', { key, text: selectedCell.value.text })
  closeDialog()
}

onMounted(() => {
  store.dispatch('loadSchedule')
  const removeListener = window.electronAPI.onScheduleUpdated(() => {
    store.dispatch('loadSchedule')
  })
  onBeforeUnmount(() => {
    removeListener()
  })
})
</script>

<style scoped>
.schedule-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1rem;
}

.table-wrapper {
  flex: 1;
  overflow: auto;
  position: relative;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

th {
  position: sticky;
  top: 0;
  background: var(--bg-panel);
  z-index: 10;
  padding: 1rem;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
  color: var(--text-muted);
}

.time-header,
.time-cell {
  width: 80px;
  text-align: center;
  border-right: 1px solid var(--border);
  background: var(--bg-hover);
  font-family: monospace;
}

.schedule-cell {
  height: 60px;
  border: 1px solid var(--border);
  padding: 4px;
  cursor: pointer;
  transition: background 0.2s;
  vertical-align: middle;
  text-align: center;
}

.schedule-cell:hover {
  background-color: var(--bg-hover);
}

.schedule-cell.has-entry {
  background-color: rgba(99, 102, 241, 0.15); /* Primary with opacity */
  color: var(--primary);
  font-weight: 500;
  border-color: rgba(99, 102, 241, 0.3);
}

.cell-content {
  font-size: 0.8rem;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notes-footer {
  display: flex;
  border-top: 1px solid var(--border);
  height: 80px;
  overflow-y: scroll;
}

.notes-label {
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover);
  font-weight: 600;
  border-right: 1px solid var(--border);
}

.notes-grid {
  display: flex;
  flex: 1;
}

.note-cell {
  flex: 1;
  border-right: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
}

.note-cell.has-entry {
  background-color: rgba(99, 102, 241, 0.15);
  color: var(--primary);
}

/* Modal Styling Internals */
.modal-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
}
.subtitle {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-weight: normal;
  margin-left: 0.5rem;
}
.char-count {
  text-align: right;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}
.modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
.spacer {
  flex: 1;
}
</style>
