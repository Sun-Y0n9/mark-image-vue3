import { createApp } from 'vue'
import App from './App.vue'
import MarkImage from '../src'

const app = createApp(App)
app.use(MarkImage)
app.mount('#app')
