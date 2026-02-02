<template>
  <div class="diary-layout">
    <div class="diary-sidebar card">
      <div class="sidebar-actions">
        <button @click="addNewEntry" class="btn btn-primary full-width">
          <PenLine size="16" /> Today's Entry
        </button>
      </div>

      <div class="entries-list">
        <div
          v-for="entry in sortedEntries"
          :key="entry.date"
          @click="selectEntry(entry)"
          class="entry-item"
          :class="{ active: selectedDate === entry.date }"
        >
          <div class="entry-date">{{ formatDate(entry.date) }}</div>
          <div class="entry-preview">{{ entry.text.substring(0, 30) }}...</div>
        </div>
      </div>
    </div>

    <div class="diary-content card">
      <div class="content-header">
        <h2>{{ formatDate(selectedDate) || 'Select a date' }}</h2>
        <div class="header-controls">
          <span class="char-badge">{{ entryText.length }}/1500</span>
          <button @click="deleteEntry" :disabled="!existingEntry" class="btn btn-danger btn-sm">
            <Trash2 size="16" />
          </button>
        </div>
      </div>

      <textarea
        v-model="entryText"
        class="diary-textarea"
        placeholder="Write down your thoughts..."
        maxlength="1500"
        :disabled="!selectedDate"
      ></textarea>

      <div class="content-footer">
        <button
          @click="saveEntry"
          :disabled="!selectedDate || entryText.length > 1500"
          class="btn btn-primary"
        >
          <Save size="16" /> Save Entry
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import moment from 'moment'
import { PenLine, Trash2, Save } from 'lucide-vue-next'

const entries = ref([])
const selectedDate = ref(moment().format('YYYY-MM-DD'))
const entryText = ref('')

// ... Logica invariata ...
const sortedEntries = computed(() => {
  return [...entries.value].sort((a, b) => new Date(b.date) - new Date(a.date))
})

const formatDate = (date) => moment(date).format('MMMM Do YYYY')

const selectEntry = (entry) => {
  selectedDate.value = entry.date
  entryText.value = entry.text
}

const loadEntries = async () => {
  entries.value = await window.electronAPI.loadDiaryEntries()
}

const saveEntry = async () => {
  await window.electronAPI.saveDiary({ date: selectedDate.value, text: entryText.value })
  await loadEntries()
}

const existingEntry = computed(() => entries.value.find((e) => e.date === selectedDate.value))

const deleteEntry = async () => {
  if (!existingEntry.value) return
  await window.electronAPI.deleteDiary(selectedDate.value)
  entryText.value = ''
  await loadEntries()
}

const addNewEntry = () => {
  const today = moment().format('YYYY-MM-DD')
  selectedDate.value = today
  const existingTodayEntry = entries.value.find((e) => e.date === today)
  entryText.value = existingTodayEntry?.text || ''
}

onMounted(async () => {
  await loadEntries()
  const todayEntry = entries.value.find((e) => e.date === selectedDate.value)
  entryText.value = todayEntry?.text || ''
})
</script>

<style scoped>
.diary-layout {
  display: flex;
  height: 100%;
  gap: 1.5rem;
}

.diary-sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
}

.sidebar-actions {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.full-width {
  width: 100%;
}

.entries-list {
  flex: 1;
  overflow-y: auto;
}

.entry-item {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.2s;
}

.entry-item:hover {
  background-color: var(--bg-hover);
}

.entry-item.active {
  background-color: rgba(99, 102, 241, 0.1);
  border-left: 4px solid var(--primary);
}

.entry-date {
  font-weight: 600;
  font-size: 0.95rem;
}
.entry-preview {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.diary-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.content-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.char-badge {
  background: var(--bg-hover);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.diary-textarea {
  flex: 1;
  width: 100%;
  border: none;
  resize: none;
  background: transparent;
  font-size: 1.1rem;
  line-height: 1.6;
  outline: none;
  color: var(--text-main);
  font-family: inherit;
}

.content-footer {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}
</style>
