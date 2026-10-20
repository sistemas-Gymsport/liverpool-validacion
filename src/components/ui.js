import { el } from '../utils/dom.js';

export function crearAviso(tipo, texto, titulo) {
  const rol = tipo === 'error' ? 'alert' : 'status';
  return el('div', { class: `aviso aviso--${tipo}`, role: rol },
    titulo ? el('strong', { text: titulo }) : null,
    el('span', { text: texto }));
}

export function crearInsignia(nivel) {
  const clase = { ERROR: 'error', REVISAR: 'revisar', CORRECTO: 'correcto' }[nivel] || 'neutra';
  return el('span', { class: `insignia insignia--${clase}`, text: nivel });
}

export function crearCargando(texto) {
  return el('div', { class: 'cargando', role: 'status' },
    el('span', { class: 'cargando__giro', 'aria-hidden': 'true' }),
    el('span', { text: texto }));
}

export function crearBoton(texto, { variante = 'primario', tipo = 'button', alPulsar, deshabilitado = false, icono } = {}) {
  return el('button', {
    class: `boton boton--${variante}`,
    type: tipo,
    disabled: deshabilitado,
    onclick: alPulsar,
  }, icono ? el('span', { class: 'boton__icono', 'aria-hidden': 'true', text: icono }) : null, texto);
}

export function ponerCargando(boton, cargando, textoCargando) {
  if (cargando) {
    boton.dataset.textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
    boton.textContent = textoCargando;
  } else {
    boton.disabled = false;
    boton.removeAttribute('aria-busy');
    if (boton.dataset.textoOriginal) boton.textContent = boton.dataset.textoOriginal;
  }
}
