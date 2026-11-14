// Cambiá este número cada vez que publiques cambios. Así los celulares
// detectan una versión nueva y actualizan el contenido guardado.
const VERSION = "biblia-v6";

// Al instalar, se guardan todos los archivos necesarios para leer sin internet.
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(VERSION)
      .then(function (cache) {
        return fetch("data/libros.json", { cache: "reload" })
          .then(function (respuesta) {
            if (!respuesta.ok) {
              throw new Error("No se pudo cargar data/libros.json");
            }

            return respuesta.json();
          })
          .then(function (libros) {
            var archivos = [
              "./",
              "index.html",
              "css/styles.css",
              "js/buscar.js",
              "js/app.js",
              "fonts/AtkinsonHyperlegibleMono-Variable.ttf",
              "manifest.webmanifest",
              "icons/icon-192.png",
              "icons/icon-512.png",
              "icons/icon-maskable-512.png",
              "data/libros.json"
            ];

            libros.forEach(function (libro) {
              archivos.push(
                "data/rv1909/" + encodeURIComponent(libro.id) + ".json"
              );
            });

            var solicitudes = archivos.map(function (url) {
              return new Request(url, { cache: "reload" });
            });

            return cache.addAll(solicitudes);
          });
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

// Al activar, se borran los cachés de versiones anteriores.
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (nombres) {
        return Promise.all(
          nombres.map(function (nombre) {
            if (nombre !== VERSION) {
              return caches.delete(nombre);
            }

            return null;
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

// Primero se busca en el caché; si no está, se pide a la red.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches
      .match(event.request, { ignoreSearch: true })
      .then(function (respuesta) {
        if (respuesta) {
          return respuesta;
        }

        return fetch(event.request).catch(function () {
          if (event.request.mode === "navigate") {
            return caches.match("index.html", { ignoreSearch: true });
          }

          throw new Error("Sin conexión");
        });
      })
  );
});
