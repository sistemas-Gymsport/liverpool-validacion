import { svg } from '../utils/dom.js';

export function crearLogo({ claro = false, alto = 40 } = {}) {
  const colorTexto = claro ? '#ffffff' : '#393939';
  return svg(
    'svg',
    { viewBox: '0 0 250 56', height: alto, width: Math.round((alto * 250) / 56), role: 'img', 'aria-label': 'GS Gymsport', class: 'logo' },
    svg('rect', { x: 0, y: 0, width: 56, height: 56, rx: 12, fill: '#76bd22' }),
    svg('text', {
      x: 28, y: 37, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 800, fill: '#ffffff',
      'font-family': 'Arial, Helvetica, sans-serif', text: 'GS',
    }),
    svg('text', {
      x: 68, y: 37, 'font-size': 25, 'font-weight': 800, 'letter-spacing': 1.5, fill: colorTexto,
      'font-family': 'Arial, Helvetica, sans-serif', text: 'GYMSPORT',
    }),
  );
}
