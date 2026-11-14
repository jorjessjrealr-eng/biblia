#!/usr/bin/env python3
"""Convierte la Reina-Valera 1909 en formato USFX al formato de biblia-app.

Fuente descargada:
  https://raw.githubusercontent.com/seven1m/open-bibles/8b330654ade69f7c96268c761da18dc83a1f49b7/spa-rv1909.usfx.xml

El README de open-bibles declara para spa-rv1909.usfx.xml:
  "Reina Valera 1909 ... Public Domain"

Uso:
  python3 tools/convertir.py RUTA_AL_ARCHIVO.usfx.xml

Solo usa la biblioteca estándar de Python 3.
"""

import json
import re
import shutil
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

# Carpetas de salida, calculadas desde la ubicación de este script.
RAIZ_APP = Path(__file__).resolve().parent.parent
DIR_DATOS = RAIZ_APP / "data"
DIR_RV1909 = DIR_DATOS / "rv1909"

# Orden, ids, nombres y cantidades de capítulos pedidos para la aplicación.
# Cada tupla es: (id de la app, id USFX de la fuente, nombre, testamento, capítulos)
LIBROS = [
    ("gen", "GEN", "Génesis", "AT", 50),
    ("exo", "EXO", "Éxodo", "AT", 40),
    ("lev", "LEV", "Levítico", "AT", 27),
    ("num", "NUM", "Números", "AT", 36),
    ("deu", "DEU", "Deuteronomio", "AT", 34),
    ("jos", "JOS", "Josué", "AT", 24),
    ("jue", "JDG", "Jueces", "AT", 21),
    ("rut", "RUT", "Rut", "AT", 4),
    ("1sa", "1SA", "1 Samuel", "AT", 31),
    ("2sa", "2SA", "2 Samuel", "AT", 24),
    ("1re", "1KI", "1 Reyes", "AT", 22),
    ("2re", "2KI", "2 Reyes", "AT", 25),
    ("1cr", "1CH", "1 Crónicas", "AT", 29),
    ("2cr", "2CH", "2 Crónicas", "AT", 36),
    ("esd", "EZR", "Esdras", "AT", 10),
    ("neh", "NEH", "Nehemías", "AT", 13),
    ("est", "EST", "Ester", "AT", 10),
    ("job", "JOB", "Job", "AT", 42),
    ("sal", "PSA", "Salmos", "AT", 150),
    ("pro", "PRO", "Proverbios", "AT", 31),
    ("ecl", "ECC", "Eclesiastés", "AT", 12),
    ("can", "SNG", "Cantares", "AT", 8),
    ("isa", "ISA", "Isaías", "AT", 66),
    ("jer", "JER", "Jeremías", "AT", 52),
    ("lam", "LAM", "Lamentaciones", "AT", 5),
    ("eze", "EZK", "Ezequiel", "AT", 48),
    ("dan", "DAN", "Daniel", "AT", 12),
    ("ose", "HOS", "Oseas", "AT", 14),
    ("joe", "JOL", "Joel", "AT", 3),
    ("amo", "AMO", "Amós", "AT", 9),
    ("abd", "OBA", "Abdías", "AT", 1),
    ("jon", "JON", "Jonás", "AT", 4),
    ("miq", "MIC", "Miqueas", "AT", 7),
    ("nah", "NAM", "Nahum", "AT", 3),
    ("hab", "HAB", "Habacuc", "AT", 3),
    ("sof", "ZEP", "Sofonías", "AT", 3),
    ("hag", "HAG", "Hageo", "AT", 2),
    ("zac", "ZEC", "Zacarías", "AT", 14),
    ("mal", "MAL", "Malaquías", "AT", 4),
    ("mat", "MAT", "Mateo", "NT", 28),
    ("mar", "MRK", "Marcos", "NT", 16),
    ("luc", "LUK", "Lucas", "NT", 24),
    ("jua", "JHN", "Juan", "NT", 21),
    ("hch", "ACT", "Hechos", "NT", 28),
    ("rom", "ROM", "Romanos", "NT", 16),
    ("1co", "1CO", "1 Corintios", "NT", 16),
    ("2co", "2CO", "2 Corintios", "NT", 13),
    ("gal", "GAL", "Gálatas", "NT", 6),
    ("efe", "EPH", "Efesios", "NT", 6),
    ("fil", "PHP", "Filipenses", "NT", 4),
    ("col", "COL", "Colosenses", "NT", 4),
    ("1te", "1TH", "1 Tesalonicenses", "NT", 5),
    ("2te", "2TH", "2 Tesalonicenses", "NT", 3),
    ("1ti", "1TI", "1 Timoteo", "NT", 6),
    ("2ti", "2TI", "2 Timoteo", "NT", 4),
    ("tit", "TIT", "Tito", "NT", 3),
    ("flm", "PHM", "Filemón", "NT", 1),
    ("heb", "HEB", "Hebreos", "NT", 13),
    ("san", "JAS", "Santiago", "NT", 5),
    ("1pe", "1PE", "1 Pedro", "NT", 5),
    ("2pe", "2PE", "2 Pedro", "NT", 3),
    ("1jn", "1JN", "1 Juan", "NT", 5),
    ("2jn", "2JN", "2 Juan", "NT", 1),
    ("3jn", "3JN", "3 Juan", "NT", 1),
    ("jud", "JUD", "Judas", "NT", 1),
    ("apo", "REV", "Apocalipsis", "NT", 22),
]


def normalizar_texto(partes):
    """Une el texto y normaliza solamente los espacios del marcado XML."""
    return re.sub(r"\s+", " ", "".join(partes)).strip()


class LectorCapitulos:
    """Extrae capítulos y versículos de un libro USFX."""

    def __init__(self):
        self.capitulos = []
        self.capitulo_id = None
        self.versiculo_id = None
        self.partes = []

    def empezar_capitulo(self, capitulo_id):
        self.cerrar_versiculo()
        esperado = len(self.capitulos) + 1

        try:
            numero = int(capitulo_id)
        except (TypeError, ValueError):
            raise ValueError("capítulo con id inválido: %r" % (capitulo_id,))

        if numero != esperado:
            raise ValueError(
                "capítulos no consecutivos: se esperaba %d y se encontró %d"
                % (esperado, numero)
            )

        self.capitulo_id = numero
        self.capitulos.append([])

    def empezar_versiculo(self, versiculo_id):
        self.cerrar_versiculo()

        if self.capitulo_id is None:
            raise ValueError("versículo encontrado antes del primer capítulo")

        try:
            numero = int(versiculo_id)
        except (TypeError, ValueError):
            raise ValueError("versículo con id inválido: %r" % (versiculo_id,))

        self.versiculo_id = numero
        self.partes = []

    def cerrar_versiculo(self):
        if self.versiculo_id is None:
            return

        texto = normalizar_texto(self.partes)
        esperado = len(self.capitulos[-1]) + 1

        if self.versiculo_id != esperado:
            raise ValueError(
                "versículos no consecutivos en el capítulo %d: "
                "se esperaba %d y se encontró %d"
                % (self.capitulo_id, esperado, self.versiculo_id)
            )

        self.capitulos[-1].append(texto)
        self.versiculo_id = None
        self.partes = []

    def procesar(self, elemento):
        # <v> abre un versículo y <ve> lo cierra. El texto puede estar
        # dentro de <w>, <add>, <p> o directamente entre las etiquetas.
        if elemento.tag == "v":
            self.empezar_versiculo(elemento.get("id"))

            if elemento.text:
                self.partes.append(elemento.text)

            for hijo in elemento:
                self.procesar(hijo)

            if elemento.tail:
                self.partes.append(elemento.tail)

            return

        if elemento.tag == "ve":
            self.cerrar_versiculo()
            return

        if elemento.tag == "c":
            return

        if self.versiculo_id is not None and elemento.text:
            self.partes.append(elemento.text)

        for hijo in elemento:
            self.procesar(hijo)

        if self.versiculo_id is not None and elemento.tail:
            self.partes.append(elemento.tail)

    def cerrar_capitulo(self):
        self.cerrar_versiculo()

    def resultado(self):
        for numero, capitulo in enumerate(self.capitulos, 1):
            if not capitulo:
                raise ValueError(
                    "el capítulo %d no tiene versículos" % numero
                )

        if not self.capitulos:
            raise ValueError("el libro no tiene capítulos")

        return self.capitulos


def cargar_fuente(ruta_xml):
    """Lee el XML y devuelve la raíz del documento."""
    try:
        raiz = ET.parse(ruta_xml).getroot()
    except OSError as error:
        raise ValueError("no se pudo abrir la fuente: %s" % error)

    if raiz.tag != "usfx":
        raise ValueError("la fuente no parece ser un XML USFX")

    return raiz


def convertir(ruta_xml):
    """Valida la fuente, genera los datos y muestra los totales."""
    raiz = cargar_fuente(ruta_xml)
    nodos_libros = raiz.findall("book")

    ids_fuente = [nodo.get("id") for nodo in nodos_libros]
    ids_esperados = [libro[1] for libro in LIBROS]

    if ids_fuente != ids_esperados:
        faltantes = [
            codigo for codigo in ids_esperados if codigo not in ids_fuente
        ]
        sobrantes = [
            codigo for codigo in ids_fuente if codigo not in ids_esperados
        ]
        raise ValueError(
            "los libros de la fuente no coinciden con los esperados.\n"
            "Faltantes: %s\nSobrantes: %s\nOrden en la fuente: %s"
            % (faltantes or "ninguno", sobrantes or "ninguno", ids_fuente)
        )

    datos = []
    resultados = []
    total_capitulos = 0
    total_versiculos = 0
    total_vacios = 0

    for definicion, nodo_libro in zip(LIBROS, nodos_libros):
        id_app, codigo_usfx, nombre, testamento, cantidad_capitulos = definicion

        try:
            lector = LectorCapitulos()

            for elemento in nodo_libro:
                if elemento.tag == "c":
                    lector.empezar_capitulo(elemento.get("id"))
                elif lector.capitulo_id is not None:
                    lector.procesar(elemento)

            lector.cerrar_capitulo()
            capitulos = lector.resultado()

            if len(capitulos) != cantidad_capitulos:
                raise ValueError(
                    "se esperaban %d capítulos y se encontraron %d"
                    % (cantidad_capitulos, len(capitulos))
                )

            for capitulo in capitulos:
                total_capitulos += 1
                total_versiculos += len(capitulo)
                total_vacios += sum(1 for texto in capitulo if not texto)

        except ValueError as error:
            raise ValueError(
                "%s (%s, fuente %s): %s"
                % (nombre, id_app, codigo_usfx, error)
            )

        datos.append(
            {
                "id": id_app,
                "nombre": nombre,
                "testamento": testamento,
                "cantidadCapitulos": len(capitulos),
            }
        )
        resultados.append((definicion, capitulos))

    if total_capitulos != 1189:
        raise ValueError(
            "se esperaban 1189 capítulos en total y se encontraron %d"
            % total_capitulos
        )

    # Escribir el índice de libros.
    DIR_DATOS.mkdir(parents=True, exist_ok=True)

    with open(DIR_DATOS / "libros.json", "w", encoding="utf-8") as archivo:
        json.dump(datos, archivo, ensure_ascii=False, indent=2)
        archivo.write("\n")

    # Reemplazar los archivos de libros por una versión limpia.
    if DIR_RV1909.exists():
        shutil.rmtree(DIR_RV1909)
    DIR_RV1909.mkdir(parents=True)

    for definicion, capitulos in resultados:
        id_app = definicion[0]
        contenido = {"id": id_app, "capitulos": capitulos}
        texto = json.dumps(
            contenido, ensure_ascii=False, separators=(",", ":")
        )
        (DIR_RV1909 / (id_app + ".json")).write_text(
            texto, encoding="utf-8"
        )

    print("Libros: %d" % len(datos))
    print("Capítulos: %d (esperado: 1189)" % total_capitulos)
    print("Versículos: %d" % total_versiculos)
    print("Versículos con texto vacío: %d" % total_vacios)

    if total_vacios:
        print(
            "ADVERTENCIA: hay versículos con texto vacío.",
            file=sys.stderr,
        )


def main():
    if len(sys.argv) != 2:
        print(
            "Uso: python3 tools/convertir.py RUTA_AL_ARCHIVO.usfx.xml",
            file=sys.stderr,
        )
        return 1

    try:
        convertir(Path(sys.argv[1]))
    except (OSError, ET.ParseError, ValueError) as error:
        print("ERROR: %s" % error, file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
