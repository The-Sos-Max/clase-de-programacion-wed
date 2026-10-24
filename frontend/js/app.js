import { listarAutores, crearAutor, listarComics, crearComic } from "./api.js";

// ============================================================
// 1. Referencias al DOM
// ============================================================
const $ = (id) => document.getElementById(id);

const formFiltros = $("form-filtros");
const filtroAutor = $("filtro-autor");
const filtroEditorial = $("filtro-editorial");
const btnLimpiar = $("btn-limpiar");
const contador = $("contador");
const listaComics = $("lista-comics");
const mensaje = $("mensaje");
const formAutor = $("form-autor");
const formComic = $("form-comic");
const comicAutor = $("comic-autor");

// ============================================================
// 2. Utilidades
// ============================================================

// Crea un elemento con texto. Usa textContent (no innerHTML) para evitar XSS
function crearElemento(etiqueta, texto, clase) {
  const elemento = document.createElement(etiqueta);
  elemento.textContent = texto;
  if (clase) elemento.className = clase;
  return elemento;
}

// Muestra un aviso arriba de la página y lo oculta a los 5 segundos
let temporizadorMensaje;
function mostrarMensaje(texto, tipo = "ok") {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
  mensaje.hidden = false;

  clearTimeout(temporizadorMensaje);
  temporizadorMensaje = setTimeout(() => {
    mensaje.hidden = true;
  }, 5000);
}

// Quita los campos vacíos del objeto (para no enviar "" a la API)
function limpiarVacios(objeto) {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== "")
  );
}

// Formatea números como pesos colombianos: 65000 → $ 65.000
const formatoPeso = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

// Llena un <select> con opciones, conservando la selección actual si aún existe
function llenarSelect(select, opciones, textoInicial) {
  const seleccionado = select.value;

  select.replaceChildren(new Option(textoInicial, ""));
  opciones.forEach(({ valor, texto }) => select.add(new Option(texto, valor)));

  select.value = seleccionado;
  if (select.selectedIndex === -1) select.selectedIndex = 0;
}

// ============================================================
// 3. Dibujar resultados
// ============================================================
function renderComics(comics) {
  listaComics.replaceChildren();

  contador.textContent =
    comics.length === 1 ? "1 cómic encontrado" : `${comics.length} cómics encontrados`;

  if (comics.length === 0) {
    listaComics.append(
      crearElemento("p", "No se encontraron cómics con ese filtro.", "vacio")
    );
    return;
  }

  comics.forEach((comic) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "comic";

    tarjeta.append(
      crearElemento("h3", comic.titulo),
      crearElemento("p", `✍️ ${comic.autor?.nombre ?? "Autor desconocido"}`),
      crearElemento(
        "p",
        [comic.editorial, comic.anioPublicacion].filter(Boolean).join(" · ")
      ),
      crearElemento("p", formatoPeso.format(comic.precio), "precio"),
      crearElemento("p", `Stock: ${comic.stock}`)
    );

    listaComics.append(tarjeta);
  });
}

// ============================================================
// 4. Cargar datos desde la API
// ============================================================

// Llena los <select> de autores (el de filtros y el del formulario de cómic)
async function cargarAutores() {
  const autores = await listarAutores();
  const opciones = autores.map((autor) => ({ valor: autor._id, texto: autor.nombre }));

  llenarSelect(filtroAutor, opciones, "Todos los autores");
  llenarSelect(comicAutor, opciones, "Seleccione un autor");
}

// La API no tiene un endpoint de editoriales, así que las sacamos de los cómics
async function cargarEditoriales() {
  const comics = await listarComics();
  const editoriales = [...new Set(comics.map((c) => c.editorial).filter(Boolean))].sort();

  llenarSelect(
    filtroEditorial,
    editoriales.map((editorial) => ({ valor: editorial, texto: editorial })),
    "Todas las editoriales"
  );
}

// Consulta los cómics aplicando los filtros elegidos y los dibuja
async function buscar() {
  const comics = await listarComics({
    autor: filtroAutor.value,
    editorial: filtroEditorial.value
  });
  renderComics(comics);
}

// ============================================================
// 5. Eventos
// ============================================================

// --- Filtrar ---
formFiltros.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // evita que el navegador recargue la página
  try {
    await buscar();
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
});

btnLimpiar.addEventListener("click", async () => {
  formFiltros.reset();
  try {
    await buscar();
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
});

// --- Agregar autor ---
formAutor.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  try {
    // FormData lee los campos por su atributo name → objeto { nombre, nacionalidad, ... }
    const datos = limpiarVacios(Object.fromEntries(new FormData(formAutor)));

    const autor = await crearAutor(datos);

    mostrarMensaje(`Autor "${autor.nombre}" guardado correctamente`);
    formAutor.reset();
    await cargarAutores(); // actualiza las listas desplegables
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
});

// --- Agregar cómic ---
formComic.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  try {
    const datos = limpiarVacios(Object.fromEntries(new FormData(formComic)));

    // FormData entrega todo como texto: convertimos los campos numéricos
    datos.precio = Number(datos.precio);
    if (datos.anioPublicacion) datos.anioPublicacion = Number(datos.anioPublicacion);
    if (datos.stock) datos.stock = Number(datos.stock);

    const comic = await crearComic(datos);

    mostrarMensaje(`Cómic "${comic.titulo}" guardado correctamente`);
    formComic.reset();
    await Promise.all([cargarEditoriales(), buscar()]); // refresca filtros y lista
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
});

// ============================================================
// 6. Arranque
// ============================================================
async function iniciar() {
  try {
    await Promise.all([cargarAutores(), cargarEditoriales()]);
    await buscar();
  } catch (error) {
    mostrarMensaje(`No se pudo conectar con la API: ${error.message}`, "error");
  }
}

iniciar();