import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { sound } from './services/sound';
import './styles/global.css';

// Browsers only allow audio after a user gesture.
const unlockAudio = () => sound.unlock();
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio);

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
