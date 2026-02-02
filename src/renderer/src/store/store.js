import { createStore } from 'vuex'

export default createStore({
  state: {
    currentDate: new Date(),
    events: [],
    schedule: {},
    alarms: [],
    timer: { isRunning: false }
  },
  mutations: {
    setDate(state, date) {
      state.currentDate = new Date(date)
    },
    setEvents(state, events) {
      state.events = events
    },
    setSchedule(state, schedule) {
      state.schedule = schedule
    },
    setScheduleEntry(state, { key, text }) {
      state.schedule = {
        ...state.schedule,
        [key]: { text }
      }
    },
    updateCurrentTime(state, timestamp) {
      state.currentTime = timestamp
    },
    removeScheduleEntry(state, key) {
      delete state.schedule[key]
      // Per mantenere la reattività
      state.schedule = { ...state.schedule }
    },
    setAlarms(state, alarms) {
      state.alarms = alarms
    },
    updateTimerState(state, timerState) {
      state.timer = { ...state.timer, ...timerState }
    }
  },
  actions: {
    async loadEvents({ commit }) {
      const events = await window.electronAPI.loadEvents()
      commit('setEvents', events)
    },
    async saveEvent({ dispatch }, event) {
      await window.electronAPI.saveEvent({
        ...event,
        text: event.text.slice(0, 280)
      })
      dispatch('loadEvents')
    },
    async deleteEvent({ dispatch }, filename) {
      // Riceve il filename
      await window.electronAPI.deleteEvent(filename)
      dispatch('loadEvents')
    },
    async loadSchedule({ commit }) {
      const schedule = await window.electronAPI.loadSchedule()
      commit('setSchedule', schedule)
    },
    async saveSchedule({ commit }, { key, text }) {
      await window.electronAPI.saveSchedule({ key, text })
      commit('setScheduleEntry', { key, text })
    },
    async loadDiary({ commit }) {
      const entries = await window.electronAPI.loadDiaryEntries()
      commit('setDiary', entries)
    },
    async saveDiary({ dispatch }, entry) {
      await window.electronAPI.saveDiary(entry)
      dispatch('loadDiary')
    },
    async loadAlarms({ commit }) {
      const alarms = await window.electronAPI.loadAlarms()
      commit('setAlarms', alarms)
    },
    updateTimer({ commit }, timerState) {
      commit('updateTimerState', timerState)
    }
  }
})
