import { crearLogo } from '../components/logo.js';
import { crearAviso, crearBoton, ponerCargando } from '../components/ui.js';
import { iniciarSesion } from '../services/api.js';
import { el, montar } from '../utils/dom.js';

export function crearPaginaLogin({ mensaje, alIngresar }) {
  const avisos = el('div', { class: 'login__avisos' });
  if (mensaje) montar(avisos, crearAviso('info', mensaje));

  const usuario = el('input', { id: 'usuario', name: 'usuario', type: 'text', autocomplete: 'username', required: true, maxlength: 100 });
  const password = el('input', { id: 'password', name: 'password', type: 'password', autocomplete: 'current-password', required: true, maxlength: 200 });
  const boton = crearBoton('Iniciar sesión', { tipo: 'submit' });

  const formulario = el('form', { class: 'login__formulario', novalidate: true },
    el('label', { for: 'usuario', text: 'Usuario' }), usuario,
    el('label', { for: 'password', text: 'Contraseña' }), password,
    avisos, boton);

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (boton.disabled) return;
    const valorUsuario = usuario.value.trim();
    if (!valorUsuario || !password.value) {
      montar(avisos, crearAviso('error', 'Escribe tu usuario y contraseña.'));
      return;
    }
    ponerCargando(boton, true, 'Iniciando sesión…');
    montar(avisos);
    try {
      const datos = await iniciarSesion(valorUsuario, password.value);
      password.value = '';
      alIngresar(datos);
    } catch (error) {
      password.value = '';
      montar(avisos, crearAviso('error', error.message));
      ponerCargando(boton, false);
      password.focus();
    }
  });

  const pagina = el('main', { class: 'login' },
    el('div', { class: 'login__tarjeta tarjeta' },
      el('div', { class: 'login__logo' }, crearLogo({ alto: 44 })),
      el('h1', { class: 'login__titulo', text: 'Verificador de pedidos Liverpool' }),
      el('p', { class: 'login__subtitulo', text: 'Acceso exclusivo para personal autorizado de Gymsport.' }),
      formulario));

  setTimeout(() => usuario.focus(), 0);
  return pagina;
}
