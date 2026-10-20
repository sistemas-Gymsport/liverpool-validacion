import { crearTabla } from '../components/tabla.js';
import { crearAviso, crearBoton, crearInsignia, ponerCargando } from '../components/ui.js';
import { el } from '../utils/dom.js';
import { formatearCantidad, normalizar, plural } from '../utils/formato.js';

const TARJETAS = [
  ['pedidos_liverpool', 'Pedidos en Liverpool', 'neutra'],
  ['verificados', 'En revisión', 'neutra'],
  ['correctos', 'Correctos', 'correcto'],
  ['errores', 'Errores', 'error'],
  ['revisar', 'Para revisar', 'revisar'],
  ['sin_picking', 'Sin picking', 'info'],
  ['guias_por_revisar', 'Paquetes por revisar', 'revisar'],
];

const ORIGENES = [['', 'Todas'], ['Excel', 'Primera · Excel'], ['Picking', 'Segunda · Picking'], ['Guías de envío', 'Segunda · Guías de envío']];

function crearBanner(resumen, advertencias) {
  if (resumen.errores > 0) {
    return el('div', { class: 'banner banner--error', role: 'alert' },
      el('span', { class: 'banner__icono', 'aria-hidden': 'true', text: '⚠️' }),
      el('span', { text: `Se encontraron ${plural(resumen.errores, 'error', 'errores')}. No surtas los pedidos marcados hasta corregirlos.` }));
  }
  if (resumen.revisar > 0 || advertencias.length > 0) {
    const partes = [];
    if (resumen.revisar) partes.push(plural(resumen.revisar, 'elemento para revisar', 'elementos para revisar'));
    if (advertencias.length) partes.push(plural(advertencias.length, 'advertencia', 'advertencias'));
    return el('div', { class: 'banner banner--revisar', role: 'status' },
      el('span', { class: 'banner__icono', 'aria-hidden': 'true', text: '🔎' }),
      el('span', { text: `Sin errores, pero hay ${partes.join(' y ')}. Revísalos antes de surtir.` }));
  }
  return el('div', { class: 'banner banner--correcto', role: 'status' },
    el('span', { class: 'banner__icono', 'aria-hidden': 'true', text: '✅' }),
    el('span', { text: 'Todo cuadra' }));
}

function crearTarjetas(resumen) {
  return el('div', { class: 'estadisticas' }, TARJETAS.map(([clave, titulo, tono]) => {
    const valor = resumen[clave];
    return el('div', { class: `estadistica estadistica--${tono}${valor > 0 ? ' estadistica--activa' : ''}` },
      el('span', { class: 'estadistica__valor', text: valor === null || valor === undefined ? '—' : String(valor) }),
      el('span', { class: 'estadistica__titulo', text: titulo }));
  }));
}

function crearSelect(id, etiqueta, opciones, alCambiar) {
  const select = el('select', { id, onchange: () => alCambiar(select.value) },
    opciones.map(([valor, texto]) => el('option', { value: valor, text: texto })));
  return el('div', { class: 'filtro' }, el('label', { for: id, text: etiqueta }), select);
}

function crearFiltroNivel(id, alCambiar) {
  return crearSelect(id, 'Nivel', [['', 'Todos'], ['ERROR', 'Errores'], ['REVISAR', 'Para revisar'], ['CORRECTO', 'Correctos']], alCambiar);
}

function crearSeccion(titulo, controles, ...contenido) {
  return el('section', { class: 'tarjeta seccion' },
    el('div', { class: 'seccion__cabecera' }, el('h3', { text: titulo }), controles), ...contenido);
}

function crearBloque(numero, titulo, descripcion, ...secciones) {
  return el('section', { class: 'bloque' },
    el('div', { class: 'bloque__cabecera' },
      el('span', { class: 'zona__numero', text: numero }),
      el('div', {}, el('h2', { text: titulo }), el('p', { class: 'seccion__nota', text: descripcion }))),
    ...secciones);
}

function seccionDocumentos(documentos) {
  return el('ul', { class: 'documentos' }, documentos.map((d) => el('li', {
    class: `documento${d.tipo === 'No reconocido' ? ' documento--desconocido' : ''}`,
  },
  el('span', { class: 'documento__tipo', text: d.tipo }),
  el('span', { class: 'documento__nombre', title: d.nombre, text: d.nombre }),
  el('span', { class: 'documento__detalle', text: d.detalle }))));
}

function seccionHallazgos(hallazgos) {
  let nivel = '';
  let origen = '';
  const tabla = crearTabla({
    etiqueta: 'Tabla de hallazgos',
    textoVacio: 'No hay hallazgos.',
    columnas: [
      { titulo: 'Nivel', valor: (h) => crearInsignia(h.nivel) },
      { titulo: 'Revisión', valor: (h) => h.origen, clase: 'sin-salto' },
      { titulo: 'Documento', valor: (h) => h.picking, clase: 'sin-salto' },
      { titulo: 'Pedido', valor: (h) => h.pedido, clase: 'monoespaciado' },
      { titulo: 'SKU', valor: (h) => h.sku, clase: 'monoespaciado texto-medio' },
      { titulo: 'Problema', valor: (h) => h.problema, clase: 'texto-largo' },
    ],
  });
  const aplicar = () => tabla.actualizar(
    hallazgos.filter((h) => (!nivel || h.nivel === nivel) && (!origen || h.origen === origen)), hallazgos.length);
  aplicar();
  return crearSeccion('Hallazgos',
    el('div', { class: 'seccion__controles' },
      crearSelect('filtro-origen', 'Revisión', ORIGENES, (valor) => { origen = valor; aplicar(); }),
      crearFiltroNivel('filtro-hallazgos', (valor) => { nivel = valor; aplicar(); })),
    tabla.elemento);
}

function crearCeldaPedido(d) {
  if (!d.pedido) return '—';
  if (d.productos_pedido > 1) {
    return el('span', {}, d.pedido, el('span', { class: 'pedido__productos', text: `${d.productos_pedido} productos en el pedido` }));
  }
  return d.pedido;
}

function seccionDetalle(detalle) {
  let nivel = '';
  let consulta = '';
  const indice = detalle.map((d) => normalizar([d.pedido, d.cliente_liverpool, d.sku_pdf, d.sku_liverpool, d.anotacion].join(' ')));
  const tabla = crearTabla({
    etiqueta: 'Picking contra Liverpool',
    textoVacio: 'Ningún renglón coincide con la búsqueda.',
    columnas: [
      { titulo: 'Resultado', valor: (d) => crearInsignia(d.resultado) },
      { titulo: 'Pedido', valor: crearCeldaPedido, clase: 'monoespaciado sin-salto' },
      { titulo: 'SKU PDF', valor: (d) => d.sku_pdf, clase: 'monoespaciado sin-salto' },
      { titulo: 'Cant. renglón', valor: (d) => formatearCantidad(d.cantidad_renglon), clase: 'numero' },
      { titulo: 'Anotación', valor: (d) => d.anotacion || '—', clase: 'texto-medio' },
      { titulo: 'Cliente Liverpool', valor: (d) => d.cliente_liverpool, clase: 'texto-medio' },
      { titulo: 'SKU Liverpool', valor: (d) => d.sku_liverpool, clase: 'monoespaciado sin-salto' },
      { titulo: 'Cant. Liverpool', valor: (d) => d.cantidad_liverpool, clase: 'numero' },
      { titulo: 'Envío', valor: (d) => d.envio, clase: 'sin-salto' },
      { titulo: 'Guía', valor: (d) => d.guia, clase: 'sin-salto' },
      { titulo: 'Observaciones', valor: (d) => d.observaciones.join('\n'), clase: 'texto-largo pre' },
    ],
  });
  const aplicar = () => {
    const termino = normalizar(consulta);
    const filas = detalle.filter((d, i) => (!nivel || d.resultado === nivel) && (!termino || indice[i].includes(termino)));
    tabla.actualizar(filas, detalle.length);
  };
  const buscador = el('input', {
    id: 'buscar-detalle', type: 'search', placeholder: 'Pedido, cliente, SKU o anotación',
    oninput: () => { consulta = buscador.value; aplicar(); },
  });
  aplicar();
  return crearSeccion('Picking contra Liverpool',
    el('div', { class: 'seccion__controles' },
      el('div', { class: 'filtro filtro--buscar' }, el('label', { for: 'buscar-detalle', text: 'Buscar' }), buscador),
      crearFiltroNivel('filtro-detalle', (valor) => { nivel = valor; aplicar(); })),
    tabla.elemento);
}

function seccionEtiquetas(etiquetas) {
  let nivel = '';
  let consulta = '';
  const indice = etiquetas.map((e) => normalizar([e.pedido, e.rastreo, e.contenido, e.archivo].join(' ')));
  const tabla = crearTabla({
    etiqueta: 'Guías de envío',
    textoVacio: 'Ninguna guía coincide con la búsqueda.',
    columnas: [
      { titulo: 'Resultado', valor: (e) => crearInsignia(e.resultado) },
      { titulo: 'Página', valor: (e) => e.pagina, clase: 'numero' },
      { titulo: 'Paquetería', valor: (e) => e.paqueteria, clase: 'sin-salto' },
      { titulo: 'Rastreo', valor: (e) => e.rastreo || '—', clase: 'monoespaciado sin-salto' },
      { titulo: 'Pedido', valor: (e) => (e.pedido ? el('span', {}, e.pedido, el('span', { class: 'pedido__productos', text: e.identificacion })) : '—'), clase: 'monoespaciado sin-salto' },
      { titulo: 'Contenido', valor: (e) => e.contenido || '—', clase: 'monoespaciado texto-medio' },
      { titulo: 'Peso', valor: (e) => e.peso || '—', clase: 'sin-salto' },
      { titulo: 'Peso estimado', valor: (e) => e.peso_estimado || '—', clase: 'sin-salto' },
      { titulo: 'Medidas', valor: (e) => e.medidas || '—', clase: 'sin-salto' },
      { titulo: 'Observaciones', valor: (e) => e.observaciones.join('\n'), clase: 'texto-largo pre' },
    ],
  });
  const aplicar = () => {
    const termino = normalizar(consulta);
    tabla.actualizar(etiquetas.filter((e, i) => (!nivel || e.resultado === nivel) && (!termino || indice[i].includes(termino))), etiquetas.length);
  };
  const buscador = el('input', {
    id: 'buscar-guias', type: 'search', placeholder: 'Pedido, rastreo o SKU',
    oninput: () => { consulta = buscador.value; aplicar(); },
  });
  aplicar();
  return crearSeccion('Guías de envío',
    el('div', { class: 'seccion__controles' },
      el('div', { class: 'filtro filtro--buscar' }, el('label', { for: 'buscar-guias', text: 'Buscar' }), buscador),
      crearFiltroNivel('filtro-etiquetas', (valor) => { nivel = valor; aplicar(); })),
    el('p', { class: 'seccion__nota', text: 'Cada guía se compara contra el pedido de Liverpool, el picking y la tabla de medidas: que el pedido exista, que los productos de la nota pertenezcan al pedido, el peso, una guía por pieza en pesas de 17 kg o más, máximo 30 kg al agrupar y que no haya guías duplicadas.' }),
    tabla.elemento);
}

function seccionPaquetes(guias, medidasCargadas, guiasEnvio) {
  const hayFueraDeRevision = guias.some((g) => !g.en_revision);
  let soloRevision = hayFueraDeRevision;
  let nivel = '';
  const columnas = [
    { titulo: 'Resultado', valor: (g) => crearInsignia(g.resultado) },
    { titulo: 'Pedido', valor: (g) => g.pedido, clase: 'monoespaciado sin-salto' },
    { titulo: 'Productos', valor: (g) => g.productos, clase: 'monoespaciado texto-medio' },
    { titulo: 'Guías Liverpool', valor: (g) => g.guias_liverpool || '—', clase: 'numero' },
    { titulo: 'Guías estimadas', valor: (g) => g.guias_estimadas, clase: 'sin-salto' },
  ];
  if (guiasEnvio) columnas.push({ titulo: 'Guías generadas', valor: (g) => g.guias_generadas || '—', clase: 'numero' });
  columnas.push(
    { titulo: 'Paquetes en Liverpool', valor: (g) => g.paquetes_liverpool, clase: 'texto-medio' },
    { titulo: 'Referencia', valor: (g) => g.referencia || '—', clase: 'texto-medio' },
    { titulo: 'Observaciones', valor: (g) => g.observaciones.join('\n'), clase: 'texto-largo pre' },
  );
  const tabla = crearTabla({ etiqueta: 'Guías, pesos y medidas por pedido', textoVacio: 'No hay pedidos con este filtro.', columnas });
  const aplicar = () => tabla.actualizar(
    guias.filter((g) => (!soloRevision || g.en_revision) && (!nivel || g.resultado === nivel)), guias.length);
  const controles = [crearFiltroNivel('filtro-guias', (valor) => { nivel = valor; aplicar(); })];
  if (hayFueraDeRevision) {
    const casilla = el('input', {
      id: 'guias-solo-revision', type: 'checkbox', checked: true,
      onchange: () => { soloRevision = casilla.checked; aplicar(); },
    });
    controles.unshift(el('label', { class: 'casilla', for: 'guias-solo-revision' }, casilla, 'Solo pedidos de los PDF cargados'));
  }
  aplicar();
  return crearSeccion('Guías, pesos y medidas registrados en Liverpool',
    el('div', { class: 'seccion__controles' }, ...controles),
    el('p', { class: 'seccion__nota', text: 'Liverpool baja un renglón por producto y repite los paquetes de todo el pedido; aquí se leen una vez por pedido. Sus valores pueden venir incompletos o genéricos (10 cm, 1 kg) y se validan contra la tabla de medidas y las reglas de empaque: hasta 30 kg por guía al agrupar, piso de dos en dos y una guía por pieza en pesas de 17 kg o más. «Parcial» indica que falta el peso de referencia de algún producto.' }),
    medidasCargadas ? null : crearAviso('info', 'No se cargó la tabla de medidas de equipos: solo se aplicaron las reglas de empaque.'),
    tabla.elemento);
}

function seccionSinPicking(pendientes) {
  const tabla = crearTabla({
    etiqueta: 'Pedidos sin picking',
    textoVacio: 'Todos los pedidos de Liverpool aparecen en los picking revisados.',
    columnas: [
      { titulo: 'Fecha límite de envío', valor: (s) => s.fecha_limite, clase: 'sin-salto' },
      { titulo: 'Pedido', valor: (s) => s.pedido, clase: 'monoespaciado' },
      { titulo: 'SKU', valor: (s) => s.sku, clase: 'monoespaciado sin-salto' },
      { titulo: 'Cant.', valor: (s) => s.cantidad, clase: 'numero' },
      { titulo: 'Cliente', valor: (s) => s.cliente, clase: 'texto-medio' },
      { titulo: 'Producto', valor: (s) => s.producto, clase: 'texto-medio' },
      { titulo: 'Estado', valor: (s) => s.estado, clase: 'sin-salto' },
      { titulo: 'Envío', valor: (s) => s.envio, clase: 'sin-salto' },
      { titulo: 'Observación', valor: (s) => s.observacion, clase: 'texto-medio' },
    ],
  });
  tabla.actualizar(pendientes);
  const pedidos = new Set(pendientes.map((s) => s.pedido)).size;
  return el('details', { class: 'tarjeta seccion plegable' },
    el('summary', {},
      el('h3', { text: 'Pedidos sin picking' }),
      el('span', { class: 'plegable__conteo', text: `${plural(pedidos, 'pedido')} · ordenados por fecha límite de envío` })),
    el('p', { class: 'seccion__nota', text: 'Información para operaciones: estos pedidos no aparecen en ninguno de los picking revisados.' }),
    tabla.elemento);
}

export function crearResultados(datos, { alDescargar, alNueva }) {
  const botonDescargar = crearBoton('Descargar reporte Excel', { icono: '⬇' });
  const botonNueva = crearBoton('Nueva verificación', { variante: 'secundario', icono: '↺' });
  const avisoAcciones = el('div', { class: 'acciones__aviso' });

  botonDescargar.addEventListener('click', async () => {
    ponerCargando(botonDescargar, true, 'Descargando…');
    avisoAcciones.replaceChildren();
    try {
      await alDescargar();
    } catch (error) {
      avisoAcciones.replaceChildren(crearAviso('error', error.message));
    } finally {
      ponerCargando(botonDescargar, false);
    }
  });
  botonNueva.addEventListener('click', async () => {
    ponerCargando(botonNueva, true, 'Limpiando…');
    botonDescargar.disabled = true;
    await alNueva();
  });

  const advertencias = datos.advertencias || [];
  const segunda = [];
  if (datos.picking_cargado) segunda.push(seccionDetalle(datos.detalle_pedidos));
  if (datos.guias_envio_cargadas) segunda.push(seccionEtiquetas(datos.etiquetas || []));
  if (datos.picking_cargado) segunda.push(seccionSinPicking(datos.pedidos_sin_picking));
  if (!segunda.length) {
    segunda.push(crearAviso('info', 'No se cargaron PDF de picking ni de guías de envío. Súbelos en una nueva verificación para hacer la segunda revisión.'));
  } else if (!datos.picking_cargado) {
    segunda.push(crearAviso('info', 'No se cargó el picking de Odoo: la segunda revisión se hizo solo con las guías de envío.'));
  } else if (!datos.guias_envio_cargadas) {
    segunda.push(crearAviso('info', 'No se cargaron guías de envío: la segunda revisión se hizo solo con el picking.'));
  }

  return el('div', { class: 'resultados' },
    el('div', { class: 'resultados__cabecera' },
      el('h2', { text: 'Resultado de la verificación' }),
      el('p', { class: 'resultados__meta', text: `Generado el ${datos.generado}` })),
    crearBanner(datos.resumen, advertencias),
    crearTarjetas(datos.resumen),
    advertencias.length
      ? el('div', { class: 'advertencias' }, advertencias.map((a) => crearAviso('revisar', a, 'Advertencia:')))
      : null,
    seccionDocumentos(datos.documentos || []),
    el('div', { class: 'acciones' }, botonDescargar, botonNueva, avisoAcciones),
    seccionHallazgos(datos.hallazgos),
    crearBloque('1', 'Primera revisión · Excel', 'Reporte de pedidos de Liverpool contra la tabla de medidas de equipos.',
      seccionPaquetes(datos.guias || [], datos.medidas_cargadas, datos.guias_envio_cargadas)),
    crearBloque('2', 'Segunda revisión · PDF', 'Picking de Odoo y guías de envío contra los datos de la primera revisión.', ...segunda));
}
