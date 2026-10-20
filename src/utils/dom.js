const SVG_NS = 'http://www.w3.org/2000/svg';

export function el(tag, props = {}, ...hijos) {
  const nodo = document.createElement(tag);
  for (const [clave, valor] of Object.entries(props)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'text') nodo.textContent = valor;
    else if (clave === 'dataset') Object.assign(nodo.dataset, valor);
    else if (clave.startsWith('on') && typeof valor === 'function') nodo.addEventListener(clave.slice(2), valor);
    else if (valor === true) nodo.setAttribute(clave, '');
    else nodo.setAttribute(clave, String(valor));
  }
  agregar(nodo, hijos);
  return nodo;
}

export function svg(tag, atributos = {}, ...hijos) {
  const nodo = document.createElementNS(SVG_NS, tag);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (clave === 'text') nodo.textContent = valor;
    else nodo.setAttribute(clave, String(valor));
  }
  agregar(nodo, hijos);
  return nodo;
}

function agregar(nodo, hijos) {
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.appendChild(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

export function vaciar(nodo) {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
  return nodo;
}

export function montar(contenedor, ...hijos) {
  vaciar(contenedor);
  agregar(contenedor, hijos);
}
