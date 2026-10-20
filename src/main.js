import './styles/main.css';
import { crearAviso, crearCargando } from './components/ui.js';
import { crearPaginaLogin } from './pages/login.js';
import { crearPaginaVerificador } from './pages/verificador.js';
import { cerrarSesion, configurarSesionExpirada, consultarSesion } from './services/api.js';
import { el, montar } from './utils/dom.js';

const raiz = document.getElementById('app');
let enSesion = false;

function mostrarLogin(mensaje) {
  enSesion = false;
  montar(raiz, crearPaginaLogin({ mensaje, alIngresar: (datos) => mostrarVerificador(datos.usuario) }));
}

function mostrarVerificador(usuario) {
  enSesion = true;
  montar(raiz, crearPaginaVerificador({
    usuario,
    alCerrarSesion: async () => {
      try {
        await cerrarSesion();
        mostrarLogin('Cerraste sesión correctamente.');
      } catch (error) {
        mostrarLogin(error.estado === 401 ? undefined : 'Se cerró la sesión en este navegador. Si el servidor no respondió, la sesión caducará sola.');
      }
    },
  }));
}

configurarSesionExpirada((mensaje) => {
  if (enSesion) mostrarLogin(mensaje);
});

async function iniciar() {
  montar(raiz, el('div', { class: 'inicio' }, crearCargando('Cargando…')));
  try {
    const sesion = await consultarSesion();
    if (sesion.autenticado) mostrarVerificador(sesion.usuario);
    else mostrarLogin();
  } catch (error) {
    montar(raiz, el('main', { class: 'login' },
      el('div', { class: 'login__tarjeta tarjeta' },
        crearAviso('error', error.message, 'Sin conexión con el servidor.'),
        el('button', { class: 'boton boton--primario', type: 'button', text: 'Reintentar', onclick: iniciar }))));
  }
}

iniciar();
