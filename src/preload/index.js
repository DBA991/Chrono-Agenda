const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Radio Window
  toggleRadioWindow: () => ipcRenderer.invoke('toggle-radio-window'),
  isRadioWindowOpen: () => ipcRenderer.invoke('is-radio-window-open'),

  // Diary
  loadDiaryEntries: () => ipcRenderer.invoke('load-diary-entries'),
  saveDiary: (data) => ipcRenderer.invoke('save-diary', data),
  deleteDiary: (filename) => ipcRenderer.invoke('delete-diary', filename),
  onDiaryUpdated: (callback) => {
    ipcRenderer.on('diary-updated', callback)
    return () => ipcRenderer.removeListener('diary-updated', callback)
  },

  // Events
  loadEvents: () => ipcRenderer.invoke('load-events'),
  saveEvent: (data) => ipcRenderer.invoke('save-event', data),
  deleteEvent: (filename) => ipcRenderer.invoke('delete-event', filename),
  onEventUpdated: (callback) => {
    ipcRenderer.on('event-updated', callback)
    return () => ipcRenderer.removeListener('event-updated', callback)
  },

  // Schedule
  loadSchedule: () => ipcRenderer.invoke('load-schedule'),
  saveSchedule: (data) => ipcRenderer.invoke('save-schedule', data),
  deleteSchedule: (key) => ipcRenderer.invoke('delete-schedule', key),
  onScheduleUpdated: (callback) => {
    ipcRenderer.on('schedule-updated', callback)
    return () => ipcRenderer.removeListener('schedule-updated', callback)
  },

  // Alarms
  saveAlarm: (data) => ipcRenderer.invoke('save-alarm', data),
  loadAlarms: () => ipcRenderer.invoke('load-alarms'),
  deleteAlarm: (filename) => ipcRenderer.invoke('delete-alarm', filename),
  showNotification: (options) => ipcRenderer.send('show-notification', options),

  // Notes
  saveNote: (note) => ipcRenderer.invoke('save-note', note),
  loadNotes: () => ipcRenderer.invoke('load-notes'),
  deleteNotes: (ids) => ipcRenderer.invoke('delete-notes', ids),
  onNotesUpdated: (callback) => {
    ipcRenderer.on('notes-updated', () => callback())
  },

  // Radio Data
  saveRadioData: (data) => ipcRenderer.invoke('save-entries', data),
  loadRadioData: () => ipcRenderer.invoke('load-entries'),
  onRadioUpdated: (callback) => {
    ipcRenderer.on('entries-updated', callback)
    return () => ipcRenderer.removeListener('entries-updated', callback)
  },

  // System
  getPath: (type) => ipcRenderer.invoke('get-path', type)
})
