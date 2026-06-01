#!/bin/bash
echo "========================================="
echo "  CATAMINER@S - Iniciando servidor"
echo "========================================="
echo ""

if command -v node &>/dev/null; then
    echo "Usando Node.js con guardado de fotos..."
    echo "Abrí Chrome en: http://localhost:8080"
    echo "Las fotos se guardan en la carpeta: fotos/"
    echo "Ctrl+C para cerrar"
    echo ""
    node server.js
else
    echo "ERROR: Node.js no encontrado."
    echo "Instalá Node.js desde https://nodejs.org/"
fi
