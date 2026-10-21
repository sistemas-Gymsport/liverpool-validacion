import { crearLogo } from '../components/logo.js';
import { crearAviso, crearBoton, crearCargando } from '../components/ui.js';
import { crearZonaArchivos } from '../components/zonaArchivos.js';
import { descargarReporte, nuevaVerificacion, verificarDocumentos } from '../services/api.js';
import { el, montar } from '../utils/dom.js';
import { excedeTotal, LIMITES, tipoPorExtension } from '../utils/validacion.js';
import { crearResultados } from './resultados.js';

export function crearPaginaVerificador() {
  const contenido = el('div', { class: 'contenido' });
  let procesando = false;

  const encabezado = el('header', { class: 'encabezado' },
    el('div', { class: 'encabezado__marca' },
      crearLogo({ claro: true, alto: 34 }),
      el('h1', { class: 'encabezado__titulo', text: 'Verificador de pedidos Liverpool – Gymsport' })));

  function crearPasos() {
    const paso = (numero, titulo, texto) => el('li', { class: 'paso' },
      el('span', { class: 'zona__numero', text: numero }),
      el('span', {}, el('strong', { text: titulo }), el('span', { class: 'paso__texto', text: texto })));
    return el('ol', { class: 'pasos' },
      paso('1', 'Primera revisión · Excel', 'Reporte de pedidos de Liverpool (obligatorio) y tabla de medidas de equipos: guías, pesos y medidas que registró Liverpool.'),
      paso('2', 'Segunda revisión · PDF', 'Picking de Odoo y guías de envío (FedEx, Estafeta…): pedido, SKU, cantidades, cliente, piezas por guía y pesos.'));
  }

  function pantallaSubida(avisoInicial) {
    const avisos = el('div', { class: 'avisos' });
    if (avisoInicial) montar(avisos, avisoInicial);
    const botonVerificar = crearBoton('Verificar pedidos', { deshabilitado: true, icono: '✓' });
    const estadoBoton = el('p', { class: 'subida__estado', id: 'estado-verificar' });
    botonVerificar.setAttribute('aria-describedby', 'estado-verificar');

    const actualizar = () => {
      const elementos = zona?.obtener() || [];
      let motivo = '';
      if (!elementos.some((e) => tipoPorExtension(e.archivo.name) === 'xlsx')) {
        motivo = 'Falta el reporte de pedidos de Liverpool (.xlsx), que es el documento principal.';
      } else if (elementos.some((e) => !e.estado)) motivo = 'Validando documentos…';
      else if (elementos.some((e) => !e.estado.valido)) motivo = 'Quita o reemplaza los documentos marcados como inválidos.';
      else if (excedeTotal(elementos)) motivo = `El total de documentos supera ${LIMITES.maxMbTotal} MB.`;
      botonVerificar.disabled = Boolean(motivo) || procesando;
      estadoBoton.textContent = motivo;
    };

    const zona = crearZonaArchivos({
      titulo: 'Documentos',
      alCambiar: actualizar,
      descripcion: `Sube todos los documentos que tengas, en cualquier orden: el sistema identifica cada uno por su contenido y revisa lo que sea posible. Máximo ${LIMITES.maxExcels} Excel y ${LIMITES.maxPdfs} PDF de 20 MB cada uno.`,
    });

    botonVerificar.addEventListener('click', async () => {
      if (procesando || botonVerificar.disabled) return;
      procesando = true;
      const archivos = zona.obtener().map((e) => e.archivo);
      montar(contenido, el('div', { class: 'tarjeta procesando' },
        crearCargando('Verificando pedidos...'),
        el('p', { class: 'procesando__detalle', text: `Analizando ${archivos.length} documentos. No cierres esta ventana.` })));
      try {
        const datos = await verificarDocumentos(archivos);
        pantallaResultados(datos);
      } catch (error) {
        pantallaSubida(crearAviso('error', error.message, 'No se pudo verificar:'));
      } finally {
        procesando = false;
      }
    });

    montar(contenido,
      el('section', { class: 'introduccion' },
        el('h2', { text: 'Nueva verificación' }),
        el('p', { text: 'Compara lo que registró Liverpool contra los documentos de Gymsport. Los documentos se eliminan del servidor en cuanto termina el análisis.' }),
        crearPasos()),
      avisos,
      zona.elemento,
      el('div', { class: 'subida__acciones' }, botonVerificar, estadoBoton));
    actualizar();
  }

  function pantallaResultados(datos) {
    montar(contenido, crearResultados(datos, {
      alDescargar: () => descargarReporte(datos.reporte_id, datos.nombre_reporte),
      alNueva: async () => {
        try {
          await nuevaVerificacion();
          pantallaSubida();
        } catch {
          pantallaSubida(crearAviso('revisar', 'Se limpió la pantalla, pero el servidor no confirmó la eliminación del reporte anterior. Caducará automáticamente en una hora.'));
        }
      },
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  pantallaSubida();
  return el('div', { class: 'aplicacion' }, encabezado, el('main', { class: 'principal' }, contenido),
    el('footer', { class: 'pie', text: 'Gymsport S.A. de C.V. · Querétaro, México · Uso interno' }));
}
