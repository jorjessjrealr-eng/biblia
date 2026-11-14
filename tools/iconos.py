import struct
import zlib

FONDO = (0x76, 0x47, 0x30)
CRUZ = (0xF6, 0xEE, 0xEA)


def crear_png(ruta, ancho, alto, pixeles):
    filas = bytearray()

    for y in range(alto):
        filas.append(0)
        inicio = y * ancho * 3
        filas.extend(pixeles[inicio:inicio + ancho * 3])

    def bloque(tipo, datos):
        largo = struct.pack(">I", len(datos))
        crc = struct.pack(">I", zlib.crc32(tipo + datos) & 0xFFFFFFFF)
        return largo + tipo + datos + crc

    cabecera = struct.pack(">IIBBBBB", ancho, alto, 8, 2, 0, 0, 0)
    contenido = (
        b"\x89PNG\r\n\x1a\n"
        + bloque(b"IHDR", cabecera)
        + bloque(b"IDAT", zlib.compress(bytes(filas), 9))
        + bloque(b"IEND", b"")
    )

    with open(ruta, "wb") as archivo:
        archivo.write(contenido)


def crear_cruz(tamano, ancho_cruz, alto_cruz, grosor):
    x_vertical = (tamano - grosor) // 2
    y_vertical = (tamano - alto_cruz) // 2
    x_horizontal = (tamano - ancho_cruz) // 2
    y_horizontal = (tamano - grosor) // 2

    pixeles = bytearray()

    for y in range(tamano):
        for x in range(tamano):
            en_vertical = (
                x_vertical <= x < x_vertical + grosor
                and y_vertical <= y < y_vertical + alto_cruz
            )
            en_horizontal = (
                x_horizontal <= x < x_horizontal + ancho_cruz
                and y_horizontal <= y < y_horizontal + grosor
            )

            if en_vertical or en_horizontal:
                pixeles.extend(CRUZ)
            else:
                pixeles.extend(FONDO)

    return bytes(pixeles)


def main():
    ruta_script = __file__.replace("\\", "/")

    if "/" in ruta_script:
        carpeta = ruta_script.rsplit("/", 1)[0] + "/../icons/"
    else:
        carpeta = "../icons/"

    iconos = [
        ("icon-192.png", 192, 84, 134, 28),
        ("icon-512.png", 512, 224, 358, 72),
        ("icon-maskable-512.png", 512, 174, 266, 56),
    ]

    for nombre, tamano, ancho_cruz, alto_cruz, grosor in iconos:
        ruta = carpeta + nombre
        crear_png(
            ruta,
            tamano,
            tamano,
            crear_cruz(tamano, ancho_cruz, alto_cruz, grosor),
        )
        print(ruta)


if __name__ == "__main__":
    main()
