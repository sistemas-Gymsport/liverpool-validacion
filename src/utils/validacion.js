export const LIMITES = {
  maxMbPorArchivo: 20,
  maxPdfs: 10,
  maxExcels: 3,
  maxMbTotal: 260,
};

const MB = 1024 * 1024;
const FIRMAS = {
  xlsx: [0x50, 0x4b, 0x03, 0x04],
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d],
};

export function tipoPorExtension(nombre) {
  const minusculas = nombre.toLowerCase();
  if (minusculas.endsWith('.xlsx')) return 'xlsx';
  if (minusculas.endsWith('.pdf')) return 'pdf';
  return '';
}

export function tipoProbable(nombre) {
  const texto = nombre.toLowerCase();
  if (texto.endsWith('.xlsx')) {
    if (texto.includes('medida')) return 'tabla de medidas';
    if (texto.includes('pedido') || texto.includes('reporte')) return 'reporte Liverpool';
    return '';
  }
  if (texto.includes('recolecc') || texto.includes('pick')) return 'picking Odoo';
  if (texto.includes('guia') || texto.includes('guía') || texto.includes('merged') || texto.includes('etiqueta')) return 'guías de envío';
  return '';
}

async function leerCabecera(archivo, bytes) {
  const buffer = await archivo.slice(0, bytes).arrayBuffer();
  return new Uint8Array(buffer);
}

function contieneFirma(cabecera, firma, soloInicio) {
  const limite = soloInicio ? 1 : cabecera.length - firma.length + 1;
  for (let i = 0; i < limite; i += 1) {
    if (firma.every((b, j) => cabecera[i + j] === b)) return true;
  }
  return false;
}

export async function validarArchivo(archivo) {
  const tipo = tipoPorExtension(archivo.name);
  if (!tipo) return { valido: false, mensaje: 'Solo se aceptan .xlsx y .pdf' };
  if (archivo.size === 0) return { valido: false, mensaje: 'El archivo está vacío' };
  if (archivo.size > LIMITES.maxMbPorArchivo * MB) {
    return { valido: false, mensaje: `Supera ${LIMITES.maxMbPorArchivo} MB` };
  }
  const cabecera = await leerCabecera(archivo, 1024);
  if (!contieneFirma(cabecera, FIRMAS[tipo], tipo === 'xlsx')) {
    return {
      valido: false,
      mensaje: tipo === 'xlsx' ? 'El archivo Excel no tiene un formato válido' : 'El PDF está dañado o no puede leerse',
    };
  }
  return { valido: true, mensaje: 'Listo' };
}

export function excedeTotal(archivos) {
  const total = archivos.reduce((suma, a) => suma + a.archivo.size, 0);
  return total > LIMITES.maxMbTotal * MB;
}
