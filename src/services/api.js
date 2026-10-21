export const API_BASE_URL = '/api';
const TIEMPO_VERIFICACION_MS = 10 * 60 * 1000;
const TIEMPO_NORMAL_MS = 60 * 1000;

const ACCESO = {
  usuario: import.meta.env.VITE_ACCESO_USUARIO || '',
  password: import.meta.env.VITE_ACCESO_PASSWORD || '',
};

let tokenCsrf = '';
let sesionEnCurso = null;

export class ErrorApi extends Error {
  constructor(mensaje, { estado = 0, codigo = 'error' } = {}) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
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

async function solicitar(ruta, opciones = {}) {
  const {
    metodo = 'GET', cuerpo, json, tiempo = TIEMPO_NORMAL_MS, reintentarCsrf = true, renovarSesion = true, comoBlob = false,
  } = opciones;
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
    respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
      method: metodo,
      headers: encabezados,
      body,
      credentials: 'include',
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
    return solicitar(ruta, { ...opciones, reintentarCsrf: false });
  }
  if (respuesta.status === 401 && datos?.codigo === 'sesion_requerida' && renovarSesion) {
    await abrirSesion();
    return solicitar(ruta, { ...opciones, renovarSesion: false });
  }
  throw new ErrorApi(datos?.error || mensajePorEstado(respuesta.status), {
    estado: respuesta.status,
    codigo: datos?.codigo || 'http',
  });
}

async function obtenerCsrf() {
  const datos = await solicitar('/auth/csrf');
  tokenCsrf = datos.csrf;
  return tokenCsrf;
}

async function iniciarSesionAutomatica() {
  if (!ACCESO.usuario || !ACCESO.password) {
    throw new ErrorApi('El acceso automático no está configurado (VITE_ACCESO_USUARIO y VITE_ACCESO_PASSWORD).', { codigo: 'configuracion' });
  }
  await obtenerCsrf();
  return solicitar('/auth/login', {
    metodo: 'POST', json: { usuario: ACCESO.usuario, password: ACCESO.password }, renovarSesion: false,
  });
}

function abrirSesion() {
  if (!sesionEnCurso) {
    sesionEnCurso = iniciarSesionAutomatica().finally(() => { sesionEnCurso = null; });
  }
  return sesionEnCurso;
}

export async function asegurarSesion() {
  try {
    const sesion = await solicitar('/auth/session', { renovarSesion: false });
    if (sesion.autenticado) return sesion;
  } catch (error) {
    if (error.estado !== 401) throw error;
  }
  return abrirSesion();
}

export async function verificarDocumentos(archivos) {
  const formulario = new FormData();
  for (const archivo of archivos) formulario.append('documentos', archivo, archivo.name);
  return solicitar('/verificar', { metodo: 'POST', cuerpo: formulario, tiempo: TIEMPO_VERIFICACION_MS });
}

export async function nuevaVerificacion() {
  return solicitar('/nueva', { metodo: 'POST' });
}

export async function descargarReporte(reporteId, nombreArchivo) {
  const respuesta = await solicitar(`/descargar/${encodeURIComponent(reporteId)}`, { comoBlob: true });
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
