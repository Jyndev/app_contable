---
trigger: always_on
---

# Guía de Diseño de Interfaz - EasyPay

Esta guía establece los parámetros visuales estrictos para la generación y maquetación de pantallas. Toda interfaz debe apegarse a estas reglas sin desviación para mantener la cohesión del producto.

## 1. Paleta de Colores
*   **Fondo Base:** Gris frío muy claro (`#f5f5f7`).
*   **Acento Principal (Púrpura):** `#7859d9`. Uso obligatorio en tarjetas principales, fondos de acciones rápidas, elementos activos de navegación y métricas destacadas en gráficos.
*   **Texto Primario:** Gris oscuro casi negro (`#1a1a1a`) para jerarquía alta (montos totales, nombres de comercios).
*   **Texto Secundario:** Gris medio (`#8a8a8e`) para subtítulos, balances y fechas.
*   **Texto Terciario:** Gris claro (`#aeaeaf`) para descripciones de menor impacto.
*   **Identidad de Comercios:** Colores de marca específicos para avatares de transacciones (ej. Azul Apple, Cian Amazon, Naranja Dyson).

## 2. Tipografía y Jerarquía
*   **Familia:** Sans-serif geométrica y limpia (Inter, San Francisco o equivalente).
*   **Métricas Principales (ej. $2,800):** Tamaño extra grande, peso `Bold`.
*   **Títulos de Sección y Montos de Lista:** Tamaño medio, peso `Semi-bold`.
*   **Nombres de Transacción:** Tamaño medio, peso `Bold`.
*   **Etiquetas y Detalles Menores:** Tamaño pequeño, peso `Regular` o `Light`.

## 3. Composición y Layout
*   **Márgenes:** Perímetro constante y amplio (mínimo 20px) en toda la pantalla. No alinear elementos al borde absoluto.
*   **Cabeceras (Header):** Distribución equilibrada. Icono de retorno a la izquierda (`outline`), título centrado en `Semi-bold`, icono de acción secundaria a la derecha (`outline`).
*   **Agrupación:** Uso intensivo de espacio en blanco (whitespace) vertical para separar secciones analíticas, tarjetas y listas de movimientos.

## 4. Especificaciones de Componentes
*   **Tarjetas de Débito:** 
    *   Formato rectangular con radio de esquina (border-radius) suave.
    *   Fondo con gradiente púrpura.
    *   Sombra difusa (drop shadow) amplia para simular elevación.
    *   Distribución: Red/Tipo superior, Saldo centralizado, Número y titular inferior.
*   **Acciones Rápidas:** 
    *   Botones circulares, fondo púrpura sólido.
    *   Iconografía interna en contorno blanco (`outline`).
    *   Etiqueta de texto pequeña centrada en la parte inferior.
*   **Listas de Transacciones:** 
    *   Avatar/Icono a la izquierda.
    *   Título principal y subtítulo (fecha/estado) apilados al centro.
    *   Monto alineado a la derecha en `Semi-bold`.
    *   Líneas de tiempo (Timeline) con círculos de contorno y uniones sólidas.
*   **Analítica:** 
    *   Navegación de tiempo con pestañas tipo pastilla (`pill`), fondo púrpura para el estado activo.
    *   Gráficos de barras con esquinas superiores redondeadas.
*   **Navegación Inferior (Bottom Nav):** 
    *   Fondo blanco, sin bordes duros.
    *   Iconos minimalistas en contorno. El elemento activo cambia a icono con relleno sólido (fill).

## 5. Detalles Visuales Críticos
*   **Iconografía:** Estrictamente línea fina (`outline`), salvo indicadores de estado activo o avatares de marca.
*   **Bordes (Corner Radius):** Totalmente prohibido el uso de esquinas afiladas (0px). Todo contenedor, tarjeta o botón debe tener un redondeo suave y orgánico.
*   **Sombras (Drop Shadows):** Deben ser amplias, muy difusas y tener un ligero tinte púrpura o azulado. Prohibidas las sombras negras opacas o cortantes.