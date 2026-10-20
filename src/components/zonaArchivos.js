import { el, montar } from '../utils/dom.js';
import { formatearTamano } from '../utils/formato.js';
import { LIMITES, tipoPorExtension, tipoProbable, validarArchivo } from '../utils/validacion.js';

let contador = 0;

export function crearZonaArchivos({ titulo, descripcion, alCambiar }) {
  const idInput = `archivos-${(contador += 1)}`;
  let elementos = [];
  let mensajeError = '';

  const input = el('input', {
    id: idInput,
    type: 'file',
    class: 'oculto-visual',
    accept: '.xlsx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    multiple: true,
    onchange: () => {
      agregar([...input.files]);
      input.value = '';
    },
  });

  const lista = el('ul', { class: 'archivos', 'aria-label': 'Documentos seleccionados' });
  const error = el('p', { class: 'zona__error', role: 'alert' });

  const zona = el('div', { class: 'zona__soltar' },
    el('span', { class: 'zona__icono', 'aria-hidden': 'true', text: '▤' }),
    el('span', { text: 'Arrastra aquí todos tus documentos (Excel y PDF) o' }),
    el('label', {
      for: idInput, class: 'boton boton--secundario', tabindex: '0', text: 'Seleccionar documentos',
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } },
    }),
    input);

  zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('zona__soltar--activa'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('zona__soltar--activa'));
  zona.addEventListener('drop', (e) => {
    e.preventDefault();
    zona.classList.remove('zona__soltar--activa');
    agregar([...e.dataTransfer.files]);
  });

  const seccion = el('section', { class: 'zona tarjeta', 'aria-labelledby': `${idInput}-titulo` },
    el('h2', { id: `${idInput}-titulo`, class: 'zona__titulo', text: titulo }),
    el('p', { class: 'zona__descripcion', text: descripcion }),
    zona, error, lista);

  async function agregar(archivos) {
    mensajeError = '';
    if (!archivos.length) return;
    const existentes = new Set(elementos.map((e) => e.archivo.name.toLowerCase()));
    const repetidos = archivos.filter((a) => existentes.has(a.name.toLowerCase()));
    if (repetidos.length) mensajeError = 'Algunos documentos ya estaban en la lista y no se agregaron de nuevo.';
    let nuevos = archivos.filter((a) => !existentes.has(a.name.toLowerCase()));

    const cuenta = (tipo) => elementos.filter((e) => tipoPorExtension(e.archivo.name) === tipo).length;
    const pdfsDisponibles = LIMITES.maxPdfs - cuenta('pdf');
    const excelsDisponibles = LIMITES.maxExcels - cuenta('xlsx');
    const pdfs = nuevos.filter((a) => tipoPorExtension(a.name) === 'pdf');
    const excels = nuevos.filter((a) => tipoPorExtension(a.name) === 'xlsx');
    if (pdfs.length > pdfsDisponibles) mensajeError = `Puedes subir un máximo de ${LIMITES.maxPdfs} documentos PDF.`;
    if (excels.length > excelsDisponibles) mensajeError = `Puedes subir un máximo de ${LIMITES.maxExcels} archivos Excel.`;
    const permitidosPdf = new Set(pdfs.slice(0, Math.max(pdfsDisponibles, 0)));
    const permitidosExcel = new Set(excels.slice(0, Math.max(excelsDisponibles, 0)));
    nuevos = nuevos.filter((a) => permitidosPdf.has(a) || permitidosExcel.has(a) || !tipoPorExtension(a.name));

    const agregados = nuevos.map((archivo) => ({ id: (contador += 1), archivo, estado: null }));
    elementos = [...elementos, ...agregados];
    pintar();
    await Promise.all(agregados.map(async (item) => {
      item.estado = await validarArchivo(item.archivo);
    }));
    pintar();
  }

  function quitar(id) {
    elementos = elementos.filter((e) => e.id !== id);
    mensajeError = '';
    pintar();
  }

  function pintar() {
    error.textContent = mensajeError;
    montar(lista, ...elementos.map((item) => {
      const estado = item.estado;
      const claseEstado = !estado ? 'pendiente' : estado.valido ? 'valido' : 'invalido';
      const tipo = tipoPorExtension(item.archivo.name);
      const probable = tipoProbable(item.archivo.name);
      return el('li', { class: `archivo archivo--${claseEstado}` },
        el('span', { class: 'archivo__tipo', 'aria-hidden': 'true', text: tipo === 'xlsx' ? 'XLSX' : tipo === 'pdf' ? 'PDF' : '?' }),
        el('span', { class: 'archivo__datos' },
          el('span', { class: 'archivo__nombre', title: item.archivo.name, text: item.archivo.name }),
          el('span', { class: 'archivo__meta', text: `${formatearTamano(item.archivo.size)}${probable ? ` · probable: ${probable}` : ''}` })),
        el('span', { class: 'archivo__estado', text: estado ? estado.mensaje : 'Validando…' }),
        el('button', {
          type: 'button', class: 'archivo__quitar', 'aria-label': `Quitar ${item.archivo.name}`, text: '✕',
          onclick: () => quitar(item.id),
        }));
    }));
    alCambiar?.();
  }

  return {
    elemento: seccion,
    obtener: () => elementos,
    limpiar: () => { elementos = []; mensajeError = ''; pintar(); },
  };
}
