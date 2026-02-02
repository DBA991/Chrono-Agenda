<template>
  <div class="notes-layout">
    <div v-if="selectedNote || isNew" class="editor-panel card">
      <div class="editor-header">
        <input
          v-model="currentNote.title"
          placeholder="Note Title"
          maxlength="50"
          class="title-input"
        />
        <span class="char-count">{{ currentNote.title.length }}/50</span>
      </div>

      <textarea
        v-model="currentNote.content"
        placeholder="Write your note here..."
        maxlength="500"
        class="content-input"
      ></textarea>

      <div class="editor-footer">
        <span class="char-count">{{ currentNote.content.length }}/500</span>
        <div class="actions">
          <button @click="handleNew" class="btn btn-ghost"><Plus size="16" /> New</button>
          <button :disabled="!selectedNote" @click="deleteNote" class="btn btn-danger">
            <Trash2 size="16" /> Delete
          </button>
          <button @click="saveNote" class="btn btn-primary"><Save size="16" /> Save</button>
        </div>
      </div>
    </div>

    <div class="notes-grid-container">
      <div class="notes-grid">
        <div
          v-for="note in notes"
          :key="note.id"
          class="note-card"
          :class="{ active: selectedNote?.id === note.id }"
          @click="selectNote(note)"
        >
          <h3 class="note-title">{{ note.title || 'Untitled Note' }}</h3>
          <p class="note-preview">{{ note.content }}</p>
          <div class="note-meta">{{ formatDate(note.timestamp) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Trash2, Save } from 'lucide-vue-next'

const notes = ref([])
const selectedNote = ref(null)
const currentNote = ref({ title: '', content: '' })
const isNew = ref(true)

const loadNotes = async () => {
  notes.value = await window.electronAPI.loadNotes()
}

const selectNote = (note) => {
  selectedNote.value = note
  isNew.value = false
  currentNote.value = { ...note }
}

const handleNew = () => {
  selectedNote.value = null
  isNew.value = true
  currentNote.value = { title: '', content: '' }
}

const saveNote = async () => {
  const noteData = {
    ...currentNote.value,
    timestamp: new Date().toISOString()
  }

  if (selectedNote.value) {
    noteData.id = selectedNote.value.id
    await window.electronAPI.saveNote(noteData)
  } else {
    noteData.id = Date.now().toString()
    await window.electronAPI.saveNote(noteData)
  }

  await loadNotes()
  isNew.value = true
}

const deleteNote = async () => {
  if (selectedNote.value) {
    await window.electronAPI.deleteNotes([selectedNote.value.id])
    selectedNote.value = null
    currentNote.value = { title: '', content: '' }
    await loadNotes()
    isNew.value = true
  }
}

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  await loadNotes()
  window.electronAPI.onNotesUpdated(() => loadNotes())
})
</script>

<style scoped>
.notes-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.5rem;
}

.editor-panel {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-shrink: 0;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.title-input {
  font-size: 1.25rem;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--text-main);
  width: 100%;
  outline: none;
}

.content-input {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-main);
  resize: none;
  min-height: 120px;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
}

.char-count {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.notes-grid-container {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 1rem;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.note-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  height: 180px;
}

.note-card:hover {
  transform: translateY(2px);
  box-shadow: var(--shadow);
  border-color: var(--primary);
}

.note-card.active {
  border: 2px solid var(--primary);
  background-color: rgba(99, 102, 241, 0.05);
}

.note-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-preview {
  font-size: 0.875rem;
  color: var(--text-muted);
  flex: 1;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  margin: 0;
  white-space: pre-wrap;
}

.note-meta {
  margin-top: auto;
  font-size: 0.75rem;
  color: var(--text-muted);
  padding-top: 0.5rem;
  text-align: right;
}
</style>
