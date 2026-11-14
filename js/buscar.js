"use strict";

// Motor de búsqueda de la Biblia.
// No toca el DOM: solo normaliza texto, interpreta consultas y prepara resultados.

var Busqueda = (function () {
  // Muletillas que se pueden descartar antes del nombre del libro.
  var MULETILLAS_INICIO = {
    en: true,
    el: true,
    la: true,
    los: true,
    las: true,
    del: true,
    de: true,
    libro: true,
    capitulo: true,
    cap: true,
    versiculo: true,
    versiculos: true,
    vers: true,
    verso: true,
    evangelio: true,
    segun: true,
    san: true,
    santo: true,
    carta: true,
    epistola: true,
    a: true
  };

  // Muletillas que se descartan de la lista de palabras buscadas.
  var MULETILLAS_PALABRAS = {
    en: true,
    el: true,
    la: true,
    los: true,
    las: true,
    del: true,
    de: true,
    al: true,
    un: true,
    una: true,
    y: true,
    a: true,
    o: true,
    que: true,
    con: true,
    por: true,
    para: true,
    se: true,
    su: true,
    sus: true,
    lo: true,
    es: true
  };

  // Palabras y números que indican el ordinal de un libro numerado.
  var ORDINALES = {
    "1": 1,
    primero: 1,
    primera: 1,
    primer: 1,
    i: 1,
    "1ro": 1,
    "1ra": 1,
    "1o": 1,
    "2": 2,
    segundo: 2,
    segunda: 2,
    ii: 2,
    "2do": 2,
    "2da": 2,
    "3": 3,
    tercero: 3,
    tercera: 3,
    iii: 3,
    "3ro": 3,
    "3ra": 3
  };

  // Conectores que se ignoran entre el ordinal y el nombre del libro.
  var CONECTORES_ORDINAL = {
    de: true,
    a: true,
    los: true,
    las: true
  };

  // Libros que necesitan un ordinal para reconocerse.
  var GRUPOS_NUMERADOS = {
    samuel: { 1: "1sa", 2: "2sa" },
    reyes: { 1: "1re", 2: "2re" },
    cronicas: { 1: "1cr", 2: "2cr" },
    corintios: { 1: "1co", 2: "2co" },
    tesalonicenses: { 1: "1te", 2: "2te" },
    timoteo: { 1: "1ti", 2: "2ti" },
    pedro: { 1: "1pe", 2: "2pe" },
    juan: { 1: "1jn", 2: "2jn", 3: "3jn" }
  };

  // Nombres completos aceptados para cada libro sin ordinal.
  var TABLA_NOMBRES = [
    ["gen", ["genesis", "gen"]],
    ["exo", ["exodo", "exo"]],
    ["lev", ["levitico", "lev"]],
    ["num", ["numeros", "num"]],
    ["deu", ["deuteronomio", "deut", "deu"]],
    ["jos", ["josue", "jos"]],
    ["jue", ["jueces", "jue"]],
    ["rut", ["rut", "ruth"]],
    ["esd", ["esdras", "esd"]],
    ["neh", ["nehemias", "neh"]],
    ["est", ["ester", "est"]],
    ["job", ["job"]],
    ["sal", ["salmo", "salmos", "sal"]],
    ["pro", ["proverbio", "proverbios", "prov", "pro"]],
    ["ecl", ["eclesiastes", "ecl"]],
    ["can", ["cantares", "cantar", "cantar de los cantares", "can"]],
    ["isa", ["isaias", "isa"]],
    ["jer", ["jeremias", "jer"]],
    ["lam", ["lamentaciones", "lam"]],
    ["eze", ["ezequiel", "eze"]],
    ["dan", ["daniel", "dan"]],
    ["ose", ["oseas", "ose"]],
    ["joe", ["joel", "joe"]],
    ["amo", ["amos", "amo"]],
    ["abd", ["abdias", "abd"]],
    ["jon", ["jonas", "jon"]],
    ["miq", ["miqueas", "miq"]],
    ["nah", ["nahum", "nah"]],
    ["hab", ["habacuc", "hab"]],
    ["sof", ["sofonias", "sof"]],
    ["hag", ["hageo", "hag"]],
    ["zac", ["zacarias", "zac"]],
    ["mal", ["malaquias", "mal"]],
    ["mat", ["mateo", "mat"]],
    ["mar", ["marcos", "mar"]],
    ["luc", ["lucas", "luc"]],
    ["jua", ["juan", "jua"]],
    ["hch", ["hechos", "hechos de los apostoles", "hech", "hch"]],
    ["rom", ["romanos", "rom"]],
    ["gal", ["galatas", "gal"]],
    ["efe", ["efesios", "efe"]],
    ["fil", ["filipenses"]],
    ["col", ["colosenses", "col"]],
    ["tit", ["tito", "tit"]],
    ["flm", ["filemon", "flm"]],
    ["heb", ["hebreos", "heb"]],
    ["san", ["santiago", "sant"]],
    ["jud", ["judas", "jud"]],
    ["apo", ["apocalipsis", "revelacion", "apoc", "rev", "apo"]]
  ];

  // Nombre principal de los libros sin ordinal, usado para prefijos.
  var NOMBRE_PRINCIPAL = {
    gen: "genesis",
    exo: "exodo",
    lev: "levitico",
    num: "numeros",
    deu: "deuteronomio",
    jos: "josue",
    jue: "jueces",
    rut: "rut",
    esd: "esdras",
    neh: "nehemias",
    est: "ester",
    job: "job",
    sal: "salmos",
    pro: "proverbios",
    ecl: "eclesiastes",
    can: "cantares",
    isa: "isaias",
    jer: "jeremias",
    lam: "lamentaciones",
    eze: "ezequiel",
    dan: "daniel",
    ose: "oseas",
    joe: "joel",
    amo: "amos",
    abd: "abdias",
    jon: "jonas",
    miq: "miqueas",
    nah: "nahum",
    hab: "habacuc",
    sof: "sofonias",
    hag: "hageo",
    zac: "zacarias",
    mal: "malaquias",
    mat: "mateo",
    mar: "marcos",
    luc: "lucas",
    jua: "juan",
    hch: "hechos",
    rom: "romanos",
    gal: "galatas",
    efe: "efesios",
    fil: "filipenses",
    col: "colosenses",
    tit: "tito",
    flm: "filemon",
    heb: "hebreos",
    san: "santiago",
    jud: "judas",
    apo: "apocalipsis"
  };

  var MAPA_NOMBRES = {};
  var i;
  var j;

  for (i = 0; i < TABLA_NOMBRES.length; i += 1) {
    var idLibro = TABLA_NOMBRES[i][0];
    var nombres = TABLA_NOMBRES[i][1];

    for (j = 0; j < nombres.length; j += 1) {
      MAPA_NOMBRES[nombres[j]] = idLibro;
    }
  }

  // Caché de conversión por carácter: la Biblia repite las mismas letras.
  var CACHE_NORMALIZACION = [];

  // Devuelve el texto en minúsculas y sin tildes, carácter por carácter.
  function normalizar(texto) {
    var salida = "";
    var valor = typeof texto === "string" ? texto : String(texto);

    for (var indice = 0; indice < valor.length; indice += 1) {
      var codigo = valor.charCodeAt(indice);
      var convertido = CACHE_NORMALIZACION[codigo];

      if (convertido === undefined) {
        var caracter = valor.charAt(indice);
        var minuscula = caracter.toLowerCase();
        convertido = minuscula
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        if (convertido.length !== 1) {
          convertido = minuscula;
        }

        CACHE_NORMALIZACION[codigo] = convertido;
      }

      salida += convertido;
    }

    return salida;
  }

  // Convierte la consulta normalizada en tokens listos para interpretar.
  function separarToken(token) {
    if (ORDINALES[token]) {
      return [token];
    }

    if (/^\d+$/.test(token) || /^\d+-\d+$/.test(token)) {
      return [token];
    }

    var pegado = /^(\d+)([a-z].*)$/.exec(token);

    if (pegado) {
      var partes = [pegado[1]];
      var resto = separarToken(pegado[2]);

      for (var indice = 0; indice < resto.length; indice += 1) {
        partes.push(resto[indice]);
      }

      return partes;
    }

    var letrasNumeros = /^([a-z]+)(\d+)$/.exec(token);

    if (letrasNumeros) {
      return [letrasNumeros[1], letrasNumeros[2]];
    }

    return [token];
  }

  function prepararTokens(texto) {
    var normal = normalizar(texto);
    var conSeparadores = "";

    // Los dos puntos y el punto entre dígitos separan capítulo y versículo.
    for (var indice = 0; indice < normal.length; indice += 1) {
      var caracter = normal.charAt(indice);
      var anterior = indice > 0 ? normal.charAt(indice - 1) : "";
      var siguiente =
        indice + 1 < normal.length ? normal.charAt(indice + 1) : "";

      if (
        (caracter === ":" || caracter === ".") &&
        /\d/.test(anterior) &&
        /\d/.test(siguiente)
      ) {
        conSeparadores += " ";
      } else {
        conSeparadores += caracter;
      }
    }

    // Un rango "3 - 5" queda como un solo token "3-5".
    conSeparadores = conSeparadores.replace(/(\d)\s*-\s*(\d)/g, "$1-$2");

    // El resto de los signos de puntuación pasa a espacios.
    var limpio = conSeparadores.replace(/[^a-z0-9\s-]/g, " ");
    var conGuiones = "";

    for (indice = 0; indice < limpio.length; indice += 1) {
      caracter = limpio.charAt(indice);

      if (caracter === "-") {
        anterior = indice > 0 ? limpio.charAt(indice - 1) : "";
        siguiente =
          indice + 1 < limpio.length ? limpio.charAt(indice + 1) : "";

        if (/[0-9]/.test(anterior) && /[0-9]/.test(siguiente)) {
          conGuiones += "-";
        } else {
          conGuiones += " ";
        }
      } else {
        conGuiones += caracter;
      }
    }

    var brutos = conGuiones.split(/\s+/);
    var tokens = [];

    for (indice = 0; indice < brutos.length; indice += 1) {
      if (brutos[indice] === "") {
        continue;
      }

      var partes = separarToken(brutos[indice]);

      for (var jota = 0; jota < partes.length; jota += 1) {
        tokens.push(partes[jota]);
      }
    }

    return tokens;
  }

  function esVerso(token) {
    return /^\d+$/.test(token) || /^\d+-\d+$/.test(token);
  }

  function ordenarVerso(token) {
    if (/^\d+-\d+$/.test(token)) {
      var partes = token.split("-");
      var inicio = parseInt(partes[0], 10);
      var fin = parseInt(partes[1], 10);

      if (inicio > fin) {
        var cambio = inicio;
        inicio = fin;
        fin = cambio;
      }

      return inicio + "-" + fin;
    }

    return token;
  }

  function extraerPalabras(tokens) {
    var palabras = [];

    for (var indice = 0; indice < tokens.length; indice += 1) {
      var token = tokens[indice];

      if (MULETILLAS_PALABRAS[token]) {
        continue;
      }

      if (!/^[a-z]{2,}$/.test(token)) {
        continue;
      }

      if (palabras.indexOf(token) === -1) {
        palabras.push(token);
      }
    }

    return palabras;
  }

  // Busca un libro al comienzo de los tokens restantes.
  function reconocerLibro(tokens, libros) {
    if (tokens.length === 0) {
      return null;
    }

    var ordinal = ORDINALES[tokens[0]];

    if (ordinal) {
      var posicion = 1;

      while (
        posicion < tokens.length &&
        CONECTORES_ORDINAL[tokens[posicion]]
      ) {
        posicion += 1;
      }

      if (posicion < tokens.length) {
        var grupo = GRUPOS_NUMERADOS[tokens[posicion]];

        if (grupo && grupo[ordinal]) {
          return {
            id: grupo[ordinal],
            consumidos: posicion + 1
          };
        }
      }

      return null;
    }

    // Primero se revisan los nombres completos exactos, del más largo al más corto.
    var maximo = Math.min(4, tokens.length);

    for (var cantidad = maximo; cantidad >= 1; cantidad -= 1) {
      var frase = tokens.slice(0, cantidad).join(" ");

      if (MAPA_NOMBRES[frase]) {
        return {
          id: MAPA_NOMBRES[frase],
          consumidos: cantidad
        };
      }
    }

    // Si no hubo nombre exacto, se intenta con prefijos de 3 o más letras.
    var candidato = tokens[0];

    if (candidato.length >= 3) {
      var coincidencias = [];

      for (var indice = 0; indice < libros.length; indice += 1) {
        var principal = NOMBRE_PRINCIPAL[libros[indice].id];

        if (principal && principal.indexOf(candidato) === 0) {
          if (coincidencias.indexOf(libros[indice].id) === -1) {
            coincidencias.push(libros[indice].id);
          }
        }
      }

      if (coincidencias.length === 1) {
        return {
          id: coincidencias[0],
          consumidos: 1
        };
      }

      if (coincidencias.length >= 2 && coincidencias.length <= 4) {
        return {
          sugerir: coincidencias,
          consumidos: 1
        };
      }
    }

    return null;
  }

  function mensajeCapitulos(nombre, cantidad) {
    return (
      nombre +
      " tiene " +
      String(cantidad) +
      (cantidad === 1 ? " capítulo." : " capítulos.")
    );
  }

  function interpretar(texto, libros) {
    if (typeof texto !== "string") {
      return { tipo: "vacio" };
    }

    var tokens = prepararTokens(texto);

    if (tokens.length === 0) {
      return { tipo: "vacio" };
    }

    var inicio = 0;

    while (inicio < tokens.length && MULETILLAS_INICIO[tokens[inicio]]) {
      inicio += 1;
    }

    var restantes = tokens.slice(inicio);

    if (restantes.length === 0) {
      return { tipo: "vacio" };
    }

    var lista = libros || [];
    var libro = reconocerLibro(restantes, lista);

    if (libro && libro.sugerir) {
      return { tipo: "sugerir", libros: libro.sugerir };
    }

    var datosLibro = null;

    if (libro) {
      for (var indice = 0; indice < lista.length; indice += 1) {
        if (lista[indice].id === libro.id) {
          datosLibro = lista[indice];
          break;
        }
      }

      if (!datosLibro) {
        libro = null;
      }
    }

    var capitulo = null;
    var verso = null;
    var palabras = [];

    if (libro) {
      var posicion = libro.consumidos;

      if (posicion < restantes.length && /^\d+$/.test(restantes[posicion])) {
        capitulo = Number(restantes[posicion]);
        posicion += 1;

        if (posicion < restantes.length && esVerso(restantes[posicion])) {
          verso = restantes[posicion];
          posicion += 1;
        }
      }

      palabras = extraerPalabras(restantes.slice(posicion));

      if (
        capitulo !== null &&
        (capitulo < 1 || capitulo > datosLibro.cantidadCapitulos)
      ) {
        return {
          tipo: "error",
          mensaje: mensajeCapitulos(
            datosLibro.nombre,
            datosLibro.cantidadCapitulos
          )
        };
      }
    } else {
      palabras = extraerPalabras(tokens);
    }

    if (palabras.length > 0) {
      if (!libro) {
        return {
          tipo: "buscar",
          alcance: "biblia",
          palabras: palabras
        };
      }

      if (capitulo !== null) {
        return {
          tipo: "buscar",
          alcance: "capitulo",
          libroId: libro.id,
          capitulo: capitulo,
          palabras: palabras
        };
      }

      return {
        tipo: "buscar",
        alcance: "libro",
        libroId: libro.id,
        palabras: palabras
      };
    }

    if (!libro) {
      return { tipo: "vacio" };
    }

    if (capitulo === null) {
      return {
        tipo: "ir",
        hash: "#/libro/" + libro.id
      };
    }

    if (verso === null) {
      return {
        tipo: "ir",
        hash: "#/leer/" + libro.id + "/" + String(capitulo)
      };
    }

    return {
      tipo: "ir",
      hash:
        "#/leer/" +
        libro.id +
        "/" +
        String(capitulo) +
        "/" +
        ordenarVerso(verso)
    };
  }

  // Normaliza cada versículo conservando la estructura de capítulos.
  function indexar(capitulos) {
    var salida = [];

    for (var indice = 0; indice < capitulos.length; indice += 1) {
      var capitulo = capitulos[indice];
      var normalizado = [];

      for (var verso = 0; verso < capitulo.length; verso += 1) {
        normalizado.push(normalizar(capitulo[verso]));
      }

      salida.push(normalizado);
    }

    return salida;
  }

  // Cuenta cuántas palabras aparecen al inicio de alguna palabra del texto.
  function puntuar(textoNormalizado, palabras) {
    if (!textoNormalizado || !palabras || palabras.length === 0) {
      return 0;
    }

    var limpio = String(textoNormalizado).replace(/[^a-z0-9]+/g, " ");
    var buscable = " " + limpio + " ";
    var total = 0;

    for (var indice = 0; indice < palabras.length; indice += 1) {
      var palabra = palabras[indice];

      if (palabra && buscable.indexOf(" " + palabra) !== -1) {
        total += 1;
      }
    }

    return total;
  }

  // Cantidad mínima de coincidencias para que un versículo sea resultado.
  function minimo(cantidad) {
    if (cantidad <= 0) {
      return 0;
    }

    if (cantidad <= 2) {
      return cantidad;
    }

    return Math.ceil(cantidad * 0.6);
  }

  // Separa el texto original en partes marcadas y sin marcar.
  function resaltar(textoOriginal, palabras) {
    if (typeof textoOriginal !== "string" || textoOriginal.length === 0) {
      return [];
    }

    var normal = normalizar(textoOriginal);
    var marcas = [];

    for (var indice = 0; indice < textoOriginal.length; indice += 1) {
      marcas.push(false);
    }

    for (var posicionPalabra = 0; posicionPalabra < palabras.length; posicionPalabra += 1) {
      var palabra = palabras[posicionPalabra];

      if (!palabra) {
        continue;
      }

      var desde = 0;

      while (desde <= normal.length - palabra.length) {
        var encontrado = normal.indexOf(palabra, desde);

        if (encontrado === -1) {
          break;
        }

        var anterior =
          encontrado > 0 ? normal.charAt(encontrado - 1) : "";

        if (encontrado === 0 || !/[a-z0-9]/.test(anterior)) {
          var fin = encontrado;

          while (fin < normal.length && /[a-z0-9]/.test(normal.charAt(fin))) {
            fin += 1;
          }

          for (var marca = encontrado; marca < fin; marca += 1) {
            marcas[marca] = true;
          }
        }

        desde = encontrado + 1;
      }
    }

    var partes = [];
    var actual = marcas[0];
    var texto = textoOriginal.charAt(0);

    for (var posicion = 1; posicion < textoOriginal.length; posicion += 1) {
      if (marcas[posicion] === actual) {
        texto += textoOriginal.charAt(posicion);
      } else {
        partes.push({ texto: texto, marcado: actual });
        actual = marcas[posicion];
        texto = textoOriginal.charAt(posicion);
      }
    }

    partes.push({ texto: texto, marcado: actual });

    return partes;
  }

  return {
    normalizar: normalizar,
    interpretar: interpretar,
    indexar: indexar,
    puntuar: puntuar,
    minimo: minimo,
    resaltar: resaltar
  };
})();

if (typeof window !== "undefined") {
  window.Busqueda = Busqueda;
}
