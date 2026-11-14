"use strict";

// Aplicación de lectura de la Biblia, Reina-Valera 1909.

const app = document.getElementById("app");
const PRIMER_CAPITULO = "#/leer/gen/1";
const CLAVE_ULTIMA = "biblia:ultima";
const CLAVE_LETRA = "biblia:letra";
const TAMANOS_LETRA = [22, 26, 30, 34, 38, 42];
const TAMANO_POR_DEFECTO = 1;

// Lista de libros, caché de libros completos y control de navegación.
let libros = null;
const librosCargados = {};
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

async function cargarCapitulo(idLibro, numeroCapitulo) {
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

  const continuar = document.createElement("div");
  continuar.className = "continuar";
  const botonContinuar = crearBoton("Continuar leyendo", destino);
  botonContinuar.className = "boton boton-principal";
  continuar.appendChild(botonContinuar);

  if (textoDestino) {
    const linea = document.createElement("p");
    linea.className = "destino";
    linea.textContent = textoDestino;
    continuar.appendChild(linea);
  }

  acciones.appendChild(continuar);
  acciones.appendChild(crearBoton("Elegir libro", "#/libros"));
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
        app.appendChild(estado);
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

async function mostrarLectura(idLibro, numero, numeroNavegacion) {
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
      item.className = "versiculo";

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
  } catch (error) {
    if (numeroNavegacion === navegacionActual) {
      mostrarMensaje("No se pudo cargar el capítulo. Probá de nuevo.");
    }
  }
}

// --- Navegación ---

async function navegar() {
  window.scrollTo(0, 0);

  navegacionActual += 1;
  const numeroNavegacion = navegacionActual;

  limpiarPantalla();

  const ruta = window.location.hash.replace(/^#\/?/, "");
  const partes = ruta.split("/").filter(Boolean);
  const seccion = partes[0];
  const esLibros = seccion === "libros";
  const esLibro = seccion === "libro" && partes.length === 2;
  const esLeer = seccion === "leer" && partes.length === 3;
  const esConocida = esLibros || esLibro || esLeer;

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

    await mostrarLectura(partes[1], Number(partes[2]), numeroNavegacion);
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
