import { obtenerComic } from "./api.js";

const $ = (id) => document.getElementById(id);

const mensaje = $("mensaje");
const cargando = $("cargando");
const detalle = $("detalle");

// Formatos para precio y fechas
const formatoPeso = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeZone: "UTC" // evita que la fecha de nacimiento se corra un día
});

const formatoFechaHora = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeStyle: "short"
});

// Muestra un texto en un elemento; si no hay dato, escribe un guion
// textContent (no innerHTML) evita ataques XSS
function poner(id, valor) {
  $(id).textContent = valor ?? "—";
}

function mostrarError(texto) {
  cargando.hidden = true;
  mensaje.textContent = texto;
  mensaje.className = "mensaje error";
  mensaje.hidden = false;
}

function dibujarComic(comic) {
  document.title = `${comic.titulo} · Tienda de Cómics`;

  poner("d-titulo", comic.titulo);
  poner("d-autor", `✍️ ${comic.autor?.nombre ?? "Autor desconocido"}`);
  poner("d-editorial", comic.editorial);
  poner("d-anio", comic.anioPublicacion);
  poner("d-precio", formatoPeso.format(comic.precio));
  poner("d-stock", comic.stock);
  poner("d-nacionalidad", comic.autor?.nacionalidad);

  poner(
    "d-nacimiento",
    comic.autor?.fechaNacimiento
      ? formatoFecha.format(new Date(comic.autor.fechaNacimiento))
      : null
  );
  poner(
    "d-creado",
    comic.createdAt ? formatoFechaHora.format(new Date(comic.createdAt)) : null
  );
  poner(
    "d-actualizado",
    comic.updatedAt ? formatoFechaHora.format(new Date(comic.updatedAt)) : null
  );

  cargando.hidden = true;
  detalle.hidden = false;
}

async function iniciar() {
  // Leemos el id desde la URL: detalle.html?id=abc123
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    mostrarError("No se indicó ningún cómic. Vuelve al catálogo y elige uno.");
    return;
  }

  try {
    const comic = await obtenerComic(id);
    dibujarComic(comic);
  } catch (error) {
    // La API responde "ID inválido" (400) o "Cómic no encontrado" (404)
    mostrarError(error.message);
  }
}

iniciar();