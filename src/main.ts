import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.min.css'
import 'github-markdown-css/github-markdown-light.css'
import '@fontsource/open-sans/400.css'
import '@fontsource/open-sans/600.css'
import '@fontsource/open-sans/700.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/700.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/lora/400.css'
import '@fontsource/lora/700.css'
import '@fontsource/lato/400.css'
import '@fontsource/lato/700.css'
import '@fontsource/source-code-pro/400.css'
import '@fontsource/source-code-pro/700.css'
import 'primeicons/primeicons.css'
import { createApp } from 'vue'
import { definePreset } from '@primeuix/themes';
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import App from './App.vue'
import './styles/main.css'
import './styles/outline-content.css'
import './styles/outline-print.css'
import './styles/print-presets.css'

const studioTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}'
    }
  }
})

const app = createApp(App)
app.use(PrimeVue, {
  theme: {
    preset: studioTheme,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark',
      cssLayer: false,
    },
  },
})
app.mount('#app')
