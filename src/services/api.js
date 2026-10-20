const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const TIEMPO_VERIFICACION_MS = 10 * 60 * 1000;
const TIEMPO_NORMAL_MS = 60 * 1000;

let tokenCsrf = '';
let alExpirarSesion = () => {};

export class ErrorApi extends Error {
  constructor(mensaje, { estado = 0, codigo = 'error' } = {}) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
}

export function configurarSesionExpirada(callback) {
  alExpirarSesion = callback;
}

function mensajePorEstado(estado) {
  if (estado === 413) return 'El archivo supera el tamaño máximo permitido.';
  if ([502, 503, 504].includes(estado)) {
    return 'El servidor no está disponible en este momento (puede estar iniciando). Espera un minuto e inténtalo nuevamente.';
  }
  return 'No fue posible completar la operación. Inténtalo nuevamente.';
}

async function leerJson(respuesta) {
  const tipo = respuesta.headers.get('Content-Type') || '';
  if (!tipo.includes('application/json')) return null;
  try {
    return await respuesta.json();
  } catch {
    return null;
  }
}

async function solicitar(ruta, { metodo = 'GET', cuerpo, json, tiempo = TIEMPO_NORMAL_MS, reintentarCsrf = true, comoBlob = false } = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), tiempo);
  const encabezados = {};
  if (metodo !== 'GET') encabezados['X-CSRF-Token'] = tokenCsrf;
  let body = cuerpo;
  if (json !== undefined) {
    encabezados['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: encabezados,
      body,
      credentials: BASE ? 'include' : 'same-origin',
      signal: controlador.signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ErrorApi('El servidor tardó demasiado en responder. Inténtalo nuevamente.', { codigo: 'tiempo' });
    }
    throw new ErrorApi('No fue posible conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.', { codigo: 'red' });
  } finally {
    clearTimeout(temporizador);
  }

  if (respuesta.ok && comoBlob) return respuesta;
  const datos = await leerJson(respuesta);
  if (datos?.csrf) tokenCsrf = datos.csrf;
  if (respuesta.ok) return datos ?? {};

  if (respuesta.status === 403 && datos?.codigo === 'csrf' && reintentarCsrf) {
    await obtenerCsrf();
    return solicitar(ruta, { metodo, cuerpo, json, tiempo, reintentarCsrf: false, comoBlob });
  }
  const error = new ErrorApi(datos?.error || mensajePorEstado(respuesta.status), {
    estado: respuesta.status,
    codigo: datos?.codigo || 'http',
  });
  if (respuesta.status === 401 && datos?.codigo === 'sesion_requerida') alExpirarSesion(error.message);
  throw error;
}

export async function obtenerCsrf() {
  const datos = await solicitar('/api/auth/csrf');
  tokenCsrf = datos.csrf;
  return tokenCsrf;
}

export async function consultarSesion() {
  try {
    return await solicitar('/api/auth/session');
  } catch (error) {
    if (error.estado === 401) return { autenticado: false };
    throw error;
  }
}

export async function iniciarSesion(usuario, password) {
  if (!tokenCsrf) await obtenerCsrf();
  return solicitar('/api/auth/login', { metodo: 'POST', json: { usuario, password } });
}

export async function cerrarSesion() {
  return solicitar('/api/auth/logout', { metodo: 'POST' });
}

export async function verificarDocumentos(archivos) {
  const formulario = new FormData();
  for (const archivo of archivos) formulario.append('documentos', archivo, archivo.name);
  return solicitar('/api/verificar', { metodo: 'POST', cuerpo: formulario, tiempo: TIEMPO_VERIFICACION_MS });
}

export async function nuevaVerificacion() {
  return solicitar('/api/nueva', { metodo: 'POST' });
}

export async function descargarReporte(reporteId, nombreArchivo) {
  const respuesta = await solicitar(`/api/descargar/${encodeURIComponent(reporteId)}`, { comoBlob: true });
  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
