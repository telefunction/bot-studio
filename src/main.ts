import { createApp } from 'vue';
import App from '@/App.vue';
import '@/style.css';

const app = createApp(App);

// Backstop for errors outside any component's onErrorCaptured reach (e.g. App.vue's own setup).
app.config.errorHandler = (error) => {
  console.error(error);
};

app.mount('#app');
