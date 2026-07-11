import './style.css';
import { assets } from './assets/AssetManager';
import { Game } from './app/Game';
import { UIManager } from './ui/UIManager';

const loadingEl = document.getElementById('loading')!;
const barEl = document.getElementById('loading-bar')!;
const msgEl = document.getElementById('loading-msg')!;

async function boot(): Promise<void> {
  try {
    await assets.loadBoot((done, total) => {
      barEl.style.width = `${Math.round((done / total) * 100)}%`;
      msgEl.textContent = `Loading assets… ${done}/${total}`;
    });
  } catch (err) {
    console.error('Asset loading failed', err);
    loadingEl.innerHTML = `
      <div class="loading-error">
        <h2>Failed to load game assets</h2>
        <p>${(err as Error)?.message ?? 'Unknown error'}</p>
        <button onclick="location.reload()">Retry</button>
      </div>`;
    return;
  }

  const container = document.getElementById('app')!;
  const game = new Game(container);
  new UIManager(game);
  loadingEl.classList.add('hidden');
  // debug/testing hook
  (window as unknown as { __game: Game }).__game = game;
}

void boot();
