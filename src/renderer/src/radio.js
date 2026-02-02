import { createApp } from 'vue'
import Radio from './components/Radio.vue'
import './assets/radio.css' // Stili dedicati per Radio

const app = createApp(Radio)

// Applica sempre dark theme per la Radio window
document.documentElement.setAttribute('data-theme', 'dark')
document.documentElement.classList.add('dark')

app.mount('#radio-app')
