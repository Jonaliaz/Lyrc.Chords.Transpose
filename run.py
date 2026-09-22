#!/usr/bin/env python3
"""
LyrChords Transposer - Lanzador Local
Inicia un servidor HTTP local y abre automáticamente la aplicación en tu navegador web predeterminado.
"""

import os
import sys
import webbrowser
import socket
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer

PORT = 8000

def find_available_port(start_port):
    """Encuentra un puerto disponible comenzando desde start_port"""
    port = start_port
    while port < start_port + 100:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
            port += 1
    return start_port

class CustomHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Desactivar caché local para asegurar que los cambios se reflejen de inmediato
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    # Asegurar que el directorio de trabajo sea la raíz del proyecto
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    port = find_available_port(PORT)
    url = f"http://localhost:{port}/index.html"

    print("=" * 65)
    print(" 🎸 LyrChords Transposer - Editor y Transpositor de Acordes")
    print("=" * 65)
    print(f" Servidor iniciado en: {url}")
    print(" Abriendo navegador automáticamente...")
    print(" Para detener el servidor, presiona Ctrl+C en esta consola.")
    print("=" * 65)

    # Abrir navegador
    webbrowser.open(url)

    # Iniciar servidor
    try:
        with TCPServer(("", port), CustomHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[+] Servidor detenido con éxito. ¡Hasta la próxima!")
        sys.exit(0)

if __name__ == '__main__':
    main()
