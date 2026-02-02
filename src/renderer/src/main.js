import { createApp } from 'vue'
import App from './App.vue'
import store from './store/store'
import './assets/main.css'
import VCalendar from 'v-calendar'
import 'v-calendar/style.css'

const app = createApp(App)
app.use(store)
app.use(VCalendar, {
  firstDayOfWeek: 1,
  locale: 'en'
})
app.mount('#app')
