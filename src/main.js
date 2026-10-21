import './styles/main.css';
import { crearAviso, crearCargando } from './components/ui.js';
import { crearPaginaVerificador } from './pages/verificador.js';
import { asegurarSesion } from './services/api.js';
import { el, montar } from './utils/dom.js';

const raiz = document.getElementById('app');

async function iniciar() {
  montar(raiz, el('div', { class: 'inicio' }, crearCargando('Cargando…')));
  try {
    await asegurarSesion();
    montar(raiz, crearPaginaVerificador());
  } catch (error) {
    montar(raiz, el('main', { class: 'login' },
      el('div', { class: 'login__tarjeta tarjeta' },
        crearAviso('error', error.message, 'Sin conexión con el servidor.'),
        el('button', { class: 'boton boton--primario', type: 'button', text: 'Reintentar', onclick: iniciar }))));
  }
}

iniciar();
