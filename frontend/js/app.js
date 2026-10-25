import {
  listarAutores,
  crearAutor,
  listarComics,
  crearComic,
  actualizarComic,
  eliminarComic
} from "./api.js";

// ============================================================
// 1. Referencias al DOM
// ============================================================
const $ = (id) => document.getElementById(id);

const formFiltros = $("form-filtros");
const filtroTitulo = $("filtro-titulo");
const filtroAutor = $("filtro-autor");
const filtroEditorial = $("filtro-editorial");
const btnLimpiar = $("btn-limpiar");
const btnAnterior = $("btn-anterior");
const btnSiguiente = $("btn-siguiente");
const paginaActual = $("pagina-actual");
const contador = $("contador");
const listaComics = $("lista-comics");
const mensaje = $("mensaje");
const formAutor = $("form-autor");
const formComic = $("form-comic");
const comicAutor = $("comic-autor");

// ============================================================
// 2. Estado y utilidades
// ============================================================

// Paginación
let pagina = 1;
const comicsPorPagina = 4;
let totalComics = 0;

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
// Valida los datos del formulario de cómic.
// Devuelve un texto con el error, o null si todo está bien
function validarComic(datos) {
  const anioActual = new Date().getFullYear();

  if (!datos.titulo) {
    return "El título no puede estar vacío";
  }
  if (!datos.autor) {
    return "Debes seleccionar un autor";
  }
  if (!Number.isFinite(datos.precio) || datos.precio <= 0) {
    return "El precio debe ser mayor que cero";
  }
  if (
    datos.anioPublicacion !== undefined &&
    (!Number.isInteger(datos.anioPublicacion) ||
      datos.anioPublicacion < 1900 ||
      datos.anioPublicacion > anioActual)
  ) {
    return `El año debe estar entre 1900 y ${anioActual}`;
  }
  if (
    datos.stock !== undefined &&
    (!Number.isInteger(datos.stock) || datos.stock < 0)
  ) {
    return "El stock debe ser un número entero mayor o igual a cero";
  }

  return null;
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

  totalComics = comics.length;

  const totalPaginas = Math.max(1, Math.ceil(totalComics / comicsPorPagina));

  if (pagina > totalPaginas) {
    pagina = totalPaginas;
  }

  contador.textContent =
    totalComics === 1
      ? "1 cómic encontrado"
      : `${totalComics} cómics encontrados`;

  paginaActual.textContent = `Página ${pagina} de ${totalPaginas}`;

  btnAnterior.disabled = pagina === 1;
  btnSiguiente.disabled = pagina === totalPaginas;

  if (totalComics === 0) {
    listaComics.append(
      crearElemento("p", "No se encontraron cómics con ese filtro.", "vacio")
    );
    return;
  }

  const inicio = (pagina - 1) * comicsPorPagina;
  const comicsPagina = comics.slice(inicio, inicio + comicsPorPagina);

  comicsPagina.forEach((comic) => {
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

    // Botón para editar
    const btnEditar = crearElemento("button", "Editar");
    btnEditar.type = "button";
    btnEditar.addEventListener("click", () => editarComic(comic));

    // Botón para eliminar
    const btnEliminar = crearElemento("button", "Eliminar");
    btnEliminar.type = "button";
    btnEliminar.className = "secundario";
    btnEliminar.addEventListener("click", () => borrarComic(comic));

    // Contenedor de los botones
    const acciones = document.createElement("div");
    acciones.className = "acciones";
    acciones.append(btnEditar, btnEliminar);
    // Enlace a la página de detalle
const enlaceDetalle = document.createElement("a");
enlaceDetalle.href = `detalle.html?id=${comic._id}`;
enlaceDetalle.textContent = "Ver detalle";
enlaceDetalle.className = "boton-enlace";
acciones.prepend(enlaceDetalle);

    tarjeta.append(acciones);
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

// Consulta los cómics aplicando los filtros elegidos y los dibuja.
// reiniciarPagina = false se usa al paginar, editar o eliminar
async function buscar(reiniciarPagina = true) {
  if (reiniciarPagina) pagina = 1;

  const comics = await listarComics({
    titulo: filtroTitulo.value.trim(),
    autor: filtroAutor.value,
    editorial: filtroEditorial.value
  });

  renderComics(comics);
}

// ============================================================
// 5. Editar y eliminar
// ============================================================
async function editarComic(comic) {
  const titulo = prompt("Nuevo título:", comic.titulo);
  if (titulo === null) return;

  const precioTexto = prompt("Nuevo precio:", comic.precio);
  if (precioTexto === null) return;

  const editorial = prompt("Nueva editorial:", comic.editorial || "");
  if (editorial === null) return;

  const stockTexto = prompt("Nuevo stock:", comic.stock);
  if (stockTexto === null) return;

  const precio = Number(precioTexto);
  const stock = Number(stockTexto);

  if (
    !titulo.trim() ||
    precioTexto.trim() === "" ||
    !Number.isFinite(precio) ||
    precio <= 0 ||
    stockTexto.trim() === "" ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    mostrarMensaje(
      "Verifica el título, el precio (mayor que cero) y el stock.",
      "error"
    );
    return;
  }

  try {
    await actualizarComic(comic._id, {
      titulo: titulo.trim(),
      precio,
      editorial: editorial.trim(),
      stock
    });

    mostrarMensaje(`Cómic "${titulo.trim()}" actualizado correctamente`);
    await Promise.all([cargarEditoriales(), buscar(false)]);
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

async function borrarComic(comic) {
  const confirmar = confirm(`¿Seguro que deseas eliminar "${comic.titulo}"?`);
  if (!confirmar) return;

  try {
    await eliminarComic(comic._id);

    mostrarMensaje(`Cómic "${comic.titulo}" eliminado correctamente`);
    await Promise.all([cargarEditoriales(), buscar(false)]);
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

// ============================================================
// 6. Eventos
// ============================================================

// Función reutilizable: busca y muestra el error si algo falla
async function buscarAutomaticamente() {
  try {
    await buscar();
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

// --- Filtrar con el botón Buscar ---
formFiltros.addEventListener("submit", (evento) => {
  evento.preventDefault(); // evita que el navegador recargue la página
  buscarAutomaticamente();
});

// --- Filtrar automáticamente al cambiar un <select> ---
filtroAutor.addEventListener("change", buscarAutomaticamente);
filtroEditorial.addEventListener("change", buscarAutomaticamente);

// --- Limpiar filtros ---
btnLimpiar.addEventListener("click", () => {
  formFiltros.reset();
  buscarAutomaticamente();
});

// --- Paginación: página anterior ---
btnAnterior.addEventListener("click", async () => {
  if (pagina > 1) {
    pagina--;
    try {
      await buscar(false);
    } catch (error) {
      pagina++;
      mostrarMensaje(error.message, "error");
    }
  }
});

// --- Paginación: página siguiente ---
btnSiguiente.addEventListener("click", async () => {
  pagina++;
  try {
    await buscar(false);
  } catch (error) {
    pagina--;
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

    // FormData entrega todo como texto: limpiamos y convertimos
    datos.titulo = datos.titulo?.trim();
    datos.precio = Number(datos.precio);
    if (datos.anioPublicacion) datos.anioPublicacion = Number(datos.anioPublicacion);
    if (datos.stock) datos.stock = Number(datos.stock);

    // Validamos antes de enviar a la API
    const errorValidacion = validarComic(datos);
    if (errorValidacion) {
      mostrarMensaje(errorValidacion, "error");
      return;
    }

    const comic = await crearComic(datos);

    mostrarMensaje(`Cómic "${comic.titulo}" guardado correctamente`);
    formComic.reset();
    await Promise.all([cargarEditoriales(), buscar()]);
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
});

// ============================================================
// 7. Arranque
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