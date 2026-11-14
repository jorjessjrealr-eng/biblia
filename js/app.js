"use strict";

// Aplicación de lectura de la Biblia, Reina-Valera 1909.

const app = document.getElementById("app");
const pie = document.getElementById("pie");
const botonInicio = document.getElementById("boton-inicio");
const PRIMER_CAPITULO = "#/leer/gen/1";
const CLAVE_ULTIMA = "biblia:ultima";
const CLAVE_LETRA = "biblia:letra";
const TAMANOS_LETRA = [22, 26, 30, 34, 38, 42];
const TAMANO_POR_DEFECTO = 1;

// Lista de libros, caché de libros completos y control de navegación.
let libros = null;
const librosCargados = {};
const indices = {};
let navegacionActual = 0;

// Preferencias de lectura.
let indiceLetra = TAMANO_POR_DEFECTO;

// --- Almacenamiento local ---

function leerAlmacen(clave) {
  try {
    return localStorage.getItem(clave);
  } catch (error) {
    return null;
  }
}

function guardarAlmacen(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
  } catch (error) {
    // Sin almacenamiento disponible, la preferencia queda solo en memoria.
  }
}

function obtenerIndiceLetraGuardado() {
  const guardado = leerAlmacen(CLAVE_LETRA);

  if (guardado === null || guardado === "") {
    return TAMANO_POR_DEFECTO;
  }

  const indice = Number(guardado);

  if (
    !Number.isInteger(indice) ||
    indice < 0 ||
    indice >= TAMANOS_LETRA.length
  ) {
    return TAMANO_POR_DEFECTO;
  }

  return indice;
}

function obtenerUltimaLecturaGuardada() {
  const guardado = leerAlmacen(CLAVE_ULTIMA);

  if (!guardado) {
    return null;
  }

  try {
    const datos = JSON.parse(guardado);

    if (!datos || typeof datos.libro !== "string" || datos.libro === "") {
      return null;
    }

    const capitulo = Number(datos.capitulo);

    if (!Number.isInteger(capitulo) || capitulo < 1) {
      return null;
    }

    return { libro: datos.libro, capitulo: capitulo };
  } catch (error) {
    return null;
  }
}

function guardarUltimaLectura(idLibro, numeroCapitulo) {
  guardarAlmacen(
    CLAVE_ULTIMA,
    JSON.stringify({ libro: idLibro, capitulo: numeroCapitulo })
  );
}

// --- Preferencias de lectura ---

function aplicarTamanoLetra(indice) {
  document.documentElement.style.setProperty(
    "--tam-letra",
    TAMANOS_LETRA[indice] + "px"
  );
}

function actualizarBotonLetra(boton, deshabilitado) {
  if (!boton) {
    return;
  }

  boton.disabled = deshabilitado;
  boton.className = deshabilitado ? "boton boton-deshabilitado" : "boton";
  boton.setAttribute("aria-disabled", deshabilitado ? "true" : "false");
}

function actualizarBotonesLetra() {
  actualizarBotonLetra(
    document.querySelector('[data-accion="letra-menos"]'),
    indiceLetra === 0
  );
  actualizarBotonLetra(
    document.querySelector('[data-accion="letra-mas"]'),
    indiceLetra === TAMANOS_LETRA.length - 1
  );
}

function cambiarLetra(paso) {
  const nuevoIndice = indiceLetra + paso;

  if (nuevoIndice < 0 || nuevoIndice >= TAMANOS_LETRA.length) {
    return;
  }

  indiceLetra = nuevoIndice;
  aplicarTamanoLetra(indiceLetra);
  guardarAlmacen(CLAVE_LETRA, String(indiceLetra));
  actualizarBotonesLetra();
}

// --- Utilidades de pantalla ---

function limpiarPantalla() {
  app.textContent = "";
}

function mostrarMensaje(texto) {
  limpiarPantalla();

  const mensaje = document.createElement("p");
  mensaje.className = "mensaje";
  mensaje.textContent = texto;
  app.appendChild(mensaje);
}

function crearTitulo(texto) {
  const titulo = document.createElement("h2");
  titulo.textContent = texto;
  return titulo;
}

function crearBoton(texto, href) {
  const boton = document.createElement("a");
  boton.className = "boton";
  boton.href = href;
  boton.textContent = texto;
  return boton;
}

function crearBotonDeshabilitado(texto) {
  const boton = document.createElement("span");
  boton.className = "boton-deshabilitado";
  boton.textContent = texto;
  return boton;
}

function crearBotonAjuste(texto, accion, deshabilitado) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = deshabilitado ? "boton boton-deshabilitado" : "boton";
  boton.dataset.accion = accion;
  boton.textContent = texto;
  boton.disabled = deshabilitado;
  boton.setAttribute("aria-disabled", deshabilitado ? "true" : "false");
  return boton;
}

function crearEnlaceLibro(libro) {
  const enlace = document.createElement("a");
  enlace.className = "boton";
  enlace.href = "#/libro/" + encodeURIComponent(libro.id);
  enlace.textContent = libro.nombre;
  return enlace;
}

function crearEnlaceCapitulo(libro, numero) {
  const enlace = document.createElement("a");
  enlace.className = "boton";
  enlace.href =
    "#/leer/" + encodeURIComponent(libro.id) + "/" + String(numero);
  enlace.textContent = numero;
  return enlace;
}

// --- Datos ---

async function cargarLibros() {
  if (libros) {
    return libros;
  }

  const respuesta = await fetch("data/libros.json");

  if (!respuesta.ok) {
    throw new Error("No se pudo cargar la lista de libros.");
  }

  libros = await respuesta.json();
  return libros;
}

async function cargarLibro(idLibro) {
  let libro = librosCargados[idLibro];

  if (!libro) {
    const respuesta = await fetch(
      "data/rv1909/" + encodeURIComponent(idLibro) + ".json"
    );

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el libro.");
    }

    libro = await respuesta.json();
    librosCargados[idLibro] = libro;
  }

  return libro;
}

async function cargarCapitulo(idLibro, numeroCapitulo) {
  const libro = await cargarLibro(idLibro);
  const capitulos = libro.capitulos;
  return { versiculos: capitulos[numeroCapitulo - 1] };
}

// --- Pantallas ---

async function mostrarInicio(numeroNavegacion) {
  let destino = PRIMER_CAPITULO;
  let textoDestino = "";

  try {
    const lista = await cargarLibros();

    if (numeroNavegacion !== navegacionActual) {
      return;
    }

    const guardada = obtenerUltimaLecturaGuardada();
    let libroDestino = null;
    let capituloDestino = 1;

    if (guardada) {
      libroDestino = lista.find(function (libro) {
        return libro.id === guardada.libro;
      });

      if (libroDestino && guardada.capitulo <= libroDestino.cantidadCapitulos) {
        capituloDestino = guardada.capitulo;
      } else {
        libroDestino = null;
      }
    }

    if (!libroDestino) {
      libroDestino = lista.find(function (libro) {
        return libro.id === "gen";
      });
      capituloDestino = 1;
    }

    if (libroDestino) {
      destino =
        "#/leer/" +
        encodeURIComponent(libroDestino.id) +
        "/" +
        String(capituloDestino);
      textoDestino = libroDestino.nombre + " " + String(capituloDestino);
    }
  } catch (error) {
    // Si falla la lista de libros, el botón queda sin línea de destino.
  }

  if (numeroNavegacion !== navegacionActual) {
    return;
  }

  limpiarPantalla();
  app.appendChild(crearTitulo("Inicio"));

  const acciones = document.createElement("div");
  acciones.className = "acciones";

  acciones.appendChild(crearBoton("Elegir libro", "#/libros"));

  const botonContinuar = crearBoton("Continuar leyendo", destino);
  botonContinuar.className = "boton boton-principal boton-continuar";

  if (textoDestino) {
    const recuadro = document.createElement("span");
    recuadro.className = "destino-boton";
    recuadro.textContent = textoDestino;
    botonContinuar.appendChild(recuadro);
  }

  acciones.appendChild(botonContinuar);
  acciones.appendChild(crearBoton("Buscar", "#/buscar"));
  app.appendChild(acciones);

  if ("caches" in window) {
    (async function () {
      try {
        const respuesta = await caches.match("data/rv1909/apo.json");

        if (!respuesta || numeroNavegacion !== navegacionActual) {
          return;
        }

        const estado = document.createElement("p");
        estado.className = "estado-offline";
        estado.textContent = "Lista para leer sin internet";
        pie.appendChild(estado);
      } catch (error) {
        // Si falla la consulta del caché, no se muestra la línea.
      }
    })();
  }
}

function mostrarLibros() {
  limpiarPantalla();
  const tituloLibros = crearTitulo("Libros");
  tituloLibros.className = "titulo-libros";
  app.appendChild(tituloLibros);

  const antiguoTestamento = libros.filter(function (libro) {
    return libro.testamento === "AT";
  });

  const nuevoTestamento = libros.filter(function (libro) {
    return libro.testamento === "NT";
  });

  const grupos = [
    { titulo: "Antiguo Testamento", libros: antiguoTestamento },
    { titulo: "Nuevo Testamento", libros: nuevoTestamento }
  ];

  grupos.forEach(function (grupo) {
    const seccion = document.createElement("section");
    seccion.className = "grupo";

    const titulo = document.createElement("h3");
    titulo.textContent = grupo.titulo;
    seccion.appendChild(titulo);

    const lista = document.createElement("div");
    lista.className = "lista";

    grupo.libros.forEach(function (libro) {
      lista.appendChild(crearEnlaceLibro(libro));
    });

    seccion.appendChild(lista);
    app.appendChild(seccion);
  });
}

function mostrarCapitulos(idLibro) {
  const libro = libros.find(function (item) {
    return item.id === idLibro;
  });

  if (!libro) {
    mostrarMensaje("No se encontró el libro.");
    return;
  }

  limpiarPantalla();
  app.appendChild(crearTitulo(libro.nombre));

  const grilla = document.createElement("div");
  grilla.className = "grilla";

  for (let numero = 1; numero <= libro.cantidadCapitulos; numero += 1) {
    grilla.appendChild(crearEnlaceCapitulo(libro, numero));
  }

  app.appendChild(grilla);
  app.appendChild(crearBoton("Elegir otro libro", "#/libros"));
}

function calcularVersiculosMarcados(verso, cantidad) {
  const marcados = {};
  const resultado = { marcados: marcados, aviso: "" };

  if (typeof verso !== "string") {
    return resultado;
  }

  if (!/^\d+$/.test(verso) && !/^\d+-\d+$/.test(verso)) {
    return resultado;
  }

  let inicio = 0;
  let fin = 0;

  if (verso.indexOf("-") === -1) {
    inicio = Number(verso);
    fin = inicio;
  } else {
    const partes = verso.split("-");
    inicio = Number(partes[0]);
    fin = Number(partes[1]);

    if (inicio > fin) {
      const cambio = inicio;
      inicio = fin;
      fin = cambio;
    }
  }

  const desde = inicio < 1 ? 1 : inicio;
  const hasta = fin > cantidad ? cantidad : fin;

  for (let numero = desde; numero <= hasta; numero += 1) {
    marcados[numero] = true;
  }

  if (inicio < 1 || fin > cantidad) {
    resultado.aviso =
      "Este capítulo tiene " +
      String(cantidad) +
      (cantidad === 1 ? " versículo." : " versículos.");
  }

  return resultado;
}

async function mostrarLectura(idLibro, numero, numeroNavegacion, verso) {
  try {
    if (!libros) {
      await cargarLibros();

      if (numeroNavegacion !== navegacionActual) {
        return;
      }
    }

    const libro = libros.find(function (item) {
      return item.id === idLibro;
    });

    if (
      !libro ||
      !Number.isInteger(numero) ||
      numero < 1 ||
      numero > libro.cantidadCapitulos
    ) {
      mostrarMensaje("No se encontró el capítulo.");
      return;
    }

    limpiarPantalla();
    app.appendChild(crearTitulo("Cargando..."));

    const capitulo = await cargarCapitulo(libro.id, numero);

    if (numeroNavegacion !== navegacionActual) {
      return;
    }

    if (!capitulo || !Array.isArray(capitulo.versiculos)) {
      mostrarMensaje("No se encontró el capítulo.");
      return;
    }

    guardarUltimaLectura(libro.id, numero);

    limpiarPantalla();
    app.appendChild(crearTitulo(libro.nombre + " " + String(numero)));

    const marcado = calcularVersiculosMarcados(verso, capitulo.versiculos.length);

    if (marcado.aviso) {
      const aviso = document.createElement("p");
      aviso.className = "aviso";
      aviso.textContent = marcado.aviso;
      app.appendChild(aviso);
    }

    const ajustes = document.createElement("div");
    ajustes.className = "ajustes";

    const botonMenos = crearBotonAjuste(
      "Letra más chica",
      "letra-menos",
      indiceLetra === 0
    );
    const botonMas = crearBotonAjuste(
      "Letra más grande",
      "letra-mas",
      indiceLetra === TAMANOS_LETRA.length - 1
    );

    botonMenos.addEventListener("click", function () {
      cambiarLetra(-1);
    });

    botonMas.addEventListener("click", function () {
      cambiarLetra(1);
    });

    ajustes.appendChild(botonMenos);
    ajustes.appendChild(botonMas);
    app.appendChild(ajustes);

    const lista = document.createElement("ol");
    lista.className = "versiculos";

    capitulo.versiculos.forEach(function (textoVersiculo, indice) {
      const item = document.createElement("li");
      item.className = marcado.marcados[indice + 1]
        ? "versiculo versiculo-marcado"
        : "versiculo";

      const numeroVersiculo = document.createElement("span");
      numeroVersiculo.className = "numero-versiculo";
      numeroVersiculo.textContent = indice + 1;

      const texto = document.createElement("span");
      texto.className = "texto-versiculo";
      texto.textContent = textoVersiculo;

      item.appendChild(numeroVersiculo);
      item.appendChild(texto);
      lista.appendChild(item);
    });

    app.appendChild(lista);

    const navegacion = document.createElement("nav");
    navegacion.className = "navegacion";
    navegacion.setAttribute("aria-label", "Navegación entre capítulos");

    if (numero > 1) {
      const botonAnterior = crearBoton(
        "Anterior",
        "#/leer/" + encodeURIComponent(libro.id) + "/" + String(numero - 1)
      );

      botonAnterior.addEventListener("click", function (event) {
        event.preventDefault();
        location.replace(botonAnterior.getAttribute("href"));
      });

      navegacion.appendChild(botonAnterior);
    } else {
      navegacion.appendChild(crearBotonDeshabilitado("Anterior"));
    }

    if (numero < libro.cantidadCapitulos) {
      const botonSiguiente = crearBoton(
        "Siguiente",
        "#/leer/" + encodeURIComponent(libro.id) + "/" + String(numero + 1)
      );

      botonSiguiente.addEventListener("click", function (event) {
        event.preventDefault();
        location.replace(botonSiguiente.getAttribute("href"));
      });

      navegacion.appendChild(botonSiguiente);
    } else {
      navegacion.appendChild(crearBotonDeshabilitado("Siguiente"));
    }

    navegacion.appendChild(crearBoton("Elegir otro libro", "#/libros"));
    app.appendChild(navegacion);

    const primerMarcado = app.querySelector(".versiculo-marcado");

    if (primerMarcado) {
      try {
        primerMarcado.scrollIntoView({ block: "center" });
      } catch (error) {
        try {
          primerMarcado.scrollIntoView();
        } catch (otroError) {
          // Si no se puede desplazar, el capítulo queda como está.
        }
      }
    }
  } catch (error) {
    if (numeroNavegacion === navegacionActual) {
      mostrarMensaje("No se pudo cargar el capítulo. Probá de nuevo.");
    }
  }
}

// --- Búsqueda ---

function buscarLibroPorId(idLibro) {
  for (let indice = 0; indice < libros.length; indice += 1) {
    if (libros[indice].id === idLibro) {
      return libros[indice];
    }
  }

  return null;
}

async function obtenerIndiceLibro(idLibro) {
  if (indices[idLibro]) {
    return indices[idLibro];
  }

  const libro = await cargarLibro(idLibro);
  indices[idLibro] = Busqueda.indexar(libro.capitulos);
  return indices[idLibro];
}

function cederControl() {
  return new Promise(function (resolver) {
    setTimeout(resolver, 0);
  });
}

function acumularResultados(
  datosLibro,
  posicionLibro,
  palabras,
  minimo,
  encontrados,
  soloCapitulo
) {
  const indice = indices[datosLibro.id];
  const cargado = librosCargados[datosLibro.id];
  const capitulos = cargado.capitulos;
  let desde = 0;
  let hasta = indice.length;

  if (soloCapitulo) {
    desde = soloCapitulo - 1;
    hasta = soloCapitulo;
  }

  for (let capitulo = desde; capitulo < hasta; capitulo += 1) {
    const normalizados = indice[capitulo];
    const originales = capitulos[capitulo];

    for (let verso = 0; verso < normalizados.length; verso += 1) {
      const puntos = Busqueda.puntuar(normalizados[verso], palabras);

      if (puntos >= minimo) {
        encontrados.push({
          libroId: datosLibro.id,
          nombreLibro: datosLibro.nombre,
          posicionLibro: posicionLibro,
          capitulo: capitulo + 1,
          versiculo: verso + 1,
          texto: originales[verso],
          puntos: puntos
        });
      }
    }
  }
}

function recortarTexto(texto) {
  if (texto.length <= 300) {
    return { texto: texto, cortado: false };
  }

  let corte = -1;

  for (let indice = 300; indice >= 0; indice -= 1) {
    if (/\s/.test(texto.charAt(indice))) {
      corte = indice;
      break;
    }
  }

  if (corte === -1) {
    for (let indice = 301; indice < texto.length; indice += 1) {
      if (/\s/.test(texto.charAt(indice))) {
        corte = indice;
        break;
      }
    }
  }

  if (corte === -1) {
    corte = texto.length;
  }

  return {
    texto: texto.slice(0, corte).replace(/\s+$/, ""),
    cortado: true
  };
}

function crearTextoResaltado(textoOriginal, palabras) {
  const partes = Busqueda.resaltar(textoOriginal, palabras);
  const fragmento = document.createDocumentFragment();

  for (let indice = 0; indice < partes.length; indice += 1) {
    const parte = partes[indice];

    if (parte.marcado) {
      const marca = document.createElement("mark");
      marca.textContent = parte.texto;
      fragmento.appendChild(marca);
    } else {
      fragmento.appendChild(document.createTextNode(parte.texto));
    }
  }

  return fragmento;
}

function crearEnlaceResultado(datos, palabras) {
  const enlace = document.createElement("a");
  enlace.className = "resultado";
  enlace.href =
    "#/leer/" +
    encodeURIComponent(datos.libroId) +
    "/" +
    String(datos.capitulo) +
    "/" +
    String(datos.versiculo);

  const referencia = document.createElement("strong");
  referencia.textContent =
    datos.nombreLibro +
    " " +
    String(datos.capitulo) +
    ":" +
    String(datos.versiculo);
  enlace.appendChild(referencia);
  enlace.appendChild(document.createElement("br"));

  const recorte = recortarTexto(datos.texto);
  const texto = document.createElement("span");
  texto.className = "texto-resultado";
  texto.appendChild(crearTextoResaltado(recorte.texto, palabras));

  if (recorte.cortado) {
    texto.appendChild(document.createTextNode("…"));
  }

  enlace.appendChild(texto);
  return enlace;
}

function renderizarResultados(zona, encontrados, palabras, consulta, alcance) {
  zona.textContent = "";

  if (encontrados.length === 0) {
    const aviso = document.createElement("p");
    aviso.className = "aviso";
    aviso.textContent =
      "No encontré nada con «" +
      consulta +
      "». Probá con menos palabras o con una palabra distinta.";
    zona.appendChild(aviso);

    if (alcance === "biblia") {
      const segunda = document.createElement("p");
      segunda.className = "aviso";
      segunda.textContent =
        "Esta Biblia usa un español antiguo (por ejemplo, «Jehová»).";
      zona.appendChild(segunda);
    }

    return;
  }

  const cabecera = document.createElement("p");
  cabecera.className = "cantidad-resultados";
  cabecera.textContent =
    encontrados.length === 1
      ? "1 resultado"
      : String(encontrados.length) + " resultados";
  zona.appendChild(cabecera);

  const lista = document.createElement("div");
  lista.className = "resultados";
  zona.appendChild(lista);

  let mostrados = 0;
  let botonMas = null;

  function agregarPagina() {
    const fin = Math.min(mostrados + 30, encontrados.length);

    while (mostrados < fin) {
      lista.appendChild(crearEnlaceResultado(encontrados[mostrados], palabras));
      mostrados += 1;
    }

    if (mostrados >= encontrados.length && botonMas) {
      if (botonMas.parentNode) {
        botonMas.parentNode.removeChild(botonMas);
      }

      botonMas = null;
    }
  }

  agregarPagina();

  if (mostrados < encontrados.length) {
    botonMas = document.createElement("button");
    botonMas.type = "button";
    botonMas.className = "boton";
    botonMas.textContent = "Ver más resultados";
    botonMas.addEventListener("click", function () {
      agregarPagina();
    });
    zona.appendChild(botonMas);
  }
}

function mostrarInterpretacion(zona, resultado) {
  zona.textContent = "";

  if (resultado.tipo === "sugerir") {
    const pregunta = document.createElement("p");
    pregunta.textContent = "¿Quisiste decir…?";
    zona.appendChild(pregunta);

    const acciones = document.createElement("div");
    acciones.className = "acciones";

    for (let indice = 0; indice < resultado.libros.length; indice += 1) {
      const libro = buscarLibroPorId(resultado.libros[indice]);

      if (libro) {
        acciones.appendChild(
          crearBoton(libro.nombre, "#/libro/" + encodeURIComponent(libro.id))
        );
      }
    }

    zona.appendChild(acciones);
    return;
  }

  const aviso = document.createElement("p");
  aviso.className = "aviso";

  if (resultado.tipo === "error") {
    aviso.textContent = resultado.mensaje;
  } else {
    aviso.textContent =
      "Escribí un libro, un capítulo o unas palabras.";
  }

  zona.appendChild(aviso);
}

async function ejecutarBusqueda(interpretado, numeroNavegacion, zona, consulta) {
  const palabras = interpretado.palabras;
  const minimo = Busqueda.minimo(palabras.length);
  const encontrados = [];
  let estado = null;

  function mostrarEstado(texto) {
    if (numeroNavegacion !== navegacionActual) {
      return;
    }

    if (!estado) {
      estado = document.createElement("p");
      estado.className = "estado-busqueda";
      zona.appendChild(estado);
    }

    estado.textContent = texto;
  }

  function quitarEstado() {
    if (estado && estado.parentNode) {
      estado.parentNode.removeChild(estado);
    }

    estado = null;
  }

  function terminar() {
    quitarEstado();

    if (numeroNavegacion !== navegacionActual) {
      return;
    }

    encontrados.sort(function (a, b) {
      if (a.puntos !== b.puntos) {
        return b.puntos - a.puntos;
      }

      if (a.posicionLibro !== b.posicionLibro) {
        return a.posicionLibro - b.posicionLibro;
      }

      if (a.capitulo !== b.capitulo) {
        return a.capitulo - b.capitulo;
      }

      return a.versiculo - b.versiculo;
    });

    renderizarResultados(
      zona,
      encontrados,
      palabras,
      consulta,
      interpretado.alcance
    );
  }

  if (
    interpretado.alcance === "capitulo" ||
    interpretado.alcance === "libro"
  ) {
    const datos = buscarLibroPorId(interpretado.libroId);

    if (!datos) {
      quitarEstado();

      if (numeroNavegacion === navegacionActual) {
        const aviso = document.createElement("p");
        aviso.className = "aviso";
        aviso.textContent = "No se encontró el libro.";
        zona.appendChild(aviso);
      }

      return;
    }

    mostrarEstado("Buscando…");
    await cederControl();

    if (numeroNavegacion !== navegacionActual) {
      return;
    }

    const posicion = libros.indexOf(datos);
    await obtenerIndiceLibro(datos.id);

    if (numeroNavegacion !== navegacionActual) {
      return;
    }

    acumularResultados(
      datos,
      posicion,
      palabras,
      minimo,
      encontrados,
      interpretado.alcance === "capitulo" ? interpretado.capitulo : 0
    );

    terminar();
    return;
  }

  for (let indice = 0; indice < libros.length; indice += 1) {
    if (numeroNavegacion !== navegacionActual) {
      return;
    }

    mostrarEstado(
      "Buscando… " +
        String(indice + 1) +
        " de " +
        String(libros.length)
    );

    await cederControl();

    if (numeroNavegacion !== navegacionActual) {
      return;
    }

    const datos = libros[indice];
    await obtenerIndiceLibro(datos.id);

    if (numeroNavegacion !== navegacionActual) {
      return;
    }

    acumularResultados(datos, indice, palabras, minimo, encontrados, 0);
  }

  terminar();
}

async function dibujarConsultaBusqueda(consulta, zona, numeroNavegacion) {
  const resultado = Busqueda.interpretar(consulta, libros);

  if (resultado.tipo === "ir") {
    location.replace(resultado.hash);
    return;
  }

  if (resultado.tipo === "buscar") {
    await ejecutarBusqueda(resultado, numeroNavegacion, zona, consulta);
    return;
  }

  mostrarInterpretacion(zona, resultado);
}

function crearFormularioBusqueda(consulta) {
  const formulario = document.createElement("form");
  formulario.className = "formulario-busqueda";

  const entrada = document.createElement("input");
  entrada.type = "search";
  entrada.id = "consulta";
  entrada.setAttribute("aria-label", "Qué buscar");
  entrada.setAttribute("placeholder", "Ej.: salmo 15 pastor");
  entrada.setAttribute("enterkeyhint", "search");
  entrada.setAttribute("autocomplete", "off");
  entrada.setAttribute("autocapitalize", "none");
  entrada.setAttribute("spellcheck", "false");
  entrada.value = consulta;

  const boton = document.createElement("button");
  boton.type = "submit";
  boton.className = "boton";
  boton.textContent = "Buscar";

  formulario.appendChild(entrada);
  formulario.appendChild(boton);

  return { formulario: formulario, entrada: entrada };
}

function procesarConsultaBusqueda(texto, zona) {
  const resultado = Busqueda.interpretar(texto, libros);

  if (resultado.tipo === "ir") {
    location.hash = resultado.hash;
    return;
  }

  if (resultado.tipo === "buscar") {
    const recortado = texto.trim();
    const nuevoHash = "#/buscar/" + encodeURIComponent(recortado);

    if (window.location.hash === nuevoHash) {
      navegar();
    } else {
      window.location.hash = nuevoHash;
    }

    return;
  }

  mostrarInterpretacion(zona, resultado);
}

async function mostrarBusqueda(consulta, numeroNavegacion) {
  if (!libros) {
    await cargarLibros();

    if (numeroNavegacion !== navegacionActual) {
      return;
    }
  }

  limpiarPantalla();
  app.appendChild(crearTitulo("Buscar"));

  const partes = crearFormularioBusqueda(
    consulta === null ? "" : consulta
  );
  app.appendChild(partes.formulario);

  const zona = document.createElement("div");
  zona.className = "zona-busqueda";
  app.appendChild(zona);

  partes.formulario.addEventListener("submit", function (event) {
    event.preventDefault();
    procesarConsultaBusqueda(partes.entrada.value, zona);
  });

  if (consulta === null || consulta === "") {
    try {
      partes.entrada.focus();
    } catch (error) {
      // Si el navegador no permite enfocar, la pantalla sigue igual.
    }

    return;
  }

  await dibujarConsultaBusqueda(consulta, zona, numeroNavegacion);
}

// --- Navegación ---

async function navegar() {
  window.scrollTo(0, 0);

  navegacionActual += 1;
  const numeroNavegacion = navegacionActual;

  limpiarPantalla();
  pie.textContent = "";

  const ruta = window.location.hash.replace(/^#\/?/, "");
  const partes = ruta.split("/").filter(Boolean);
  const seccion = partes[0];
  const esLibros = seccion === "libros";
  const esLibro = seccion === "libro" && partes.length === 2;
  const esLeer =
    seccion === "leer" && (partes.length === 3 || partes.length === 4);
  const esBuscar =
    seccion === "buscar" && (partes.length === 1 || partes.length === 2);
  const esConocida = esLibros || esLibro || esLeer || esBuscar;

  botonInicio.hidden = !esConocida;

  try {
    if (!seccion || !esConocida) {
      if (seccion) {
        history.replaceState(null, "", "#/");
      }

      await mostrarInicio(numeroNavegacion);
      return;
    }

    if (!libros) {
      await cargarLibros();

      if (numeroNavegacion !== navegacionActual) {
        return;
      }
    }

    if (esLibros) {
      mostrarLibros();
      return;
    }

    if (esLibro) {
      mostrarCapitulos(partes[1]);
      return;
    }

    if (esBuscar) {
      let consulta = null;

      if (partes.length === 2) {
        try {
          consulta = decodeURIComponent(partes[1]);
        } catch (error) {
          consulta = "";
        }
      }

      await mostrarBusqueda(consulta, numeroNavegacion);
      return;
    }

    await mostrarLectura(
      partes[1],
      Number(partes[2]),
      numeroNavegacion,
      partes[3]
    );
  } catch (error) {
    if (numeroNavegacion === navegacionActual) {
      mostrarMensaje("No se pudo cargar la información. Probá de nuevo.");
    }
  }
}

// Aplicar preferencias antes de mostrar la primera pantalla.
indiceLetra = obtenerIndiceLetraGuardado();
aplicarTamanoLetra(indiceLetra);

window.addEventListener("hashchange", navegar);
navegar();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {
      // Si el registro falla, la aplicación sigue funcionando.
    });
  });
}
