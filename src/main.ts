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

const skyTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{sky.50}',
      100: '{sky.100}',
      200: '{sky.200}',
      300: '{sky.300}',
      400: '{sky.400}',
      500: '{sky.500}',
      600: '{sky.600}',
      700: '{sky.700}',
      800: '{sky.800}',
      900: '{sky.900}',
      950: '{sky.950}'
    }
  }
})

const app = createApp(App)
app.use(PrimeVue, {
  theme: {
    preset: skyTheme,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark',
      cssLayer: false,
    },
  },
})
app.mount('#app')
