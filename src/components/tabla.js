import { el, montar } from '../utils/dom.js';

export function crearTabla({ etiqueta, columnas, textoVacio = 'Sin registros.' }) {
  const cuerpo = el('tbody');
  const pie = el('p', { class: 'tabla__conteo', 'aria-live': 'polite' });
  const tabla = el('table', { class: 'tabla' },
    el('caption', { class: 'oculto-visual', text: etiqueta }),
    el('thead', {}, el('tr', {}, columnas.map((c) => el('th', { scope: 'col', class: c.clase || null, text: c.titulo })))),
    cuerpo);
  const contenedor = el('div', { class: 'tabla__marco', tabindex: '0', role: 'region', 'aria-label': etiqueta }, tabla);

  function actualizar(filas, total = filas.length) {
    if (!filas.length) {
      montar(cuerpo, el('tr', {}, el('td', { class: 'tabla__vacia', colspan: columnas.length, text: textoVacio })));
    } else {
      montar(cuerpo, ...filas.map((fila) => el('tr', {},
        columnas.map((c) => {
          const valor = c.valor(fila);
          return el('td', { class: c.clase || null }, valor instanceof Node ? valor : String(valor ?? ''));
        }))));
    }
    pie.textContent = filas.length === total ? `${total} registros` : `Mostrando ${filas.length} de ${total} registros`;
  }

  return { elemento: el('div', { class: 'tabla__bloque' }, contenedor, pie), actualizar };
}
