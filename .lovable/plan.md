# Menú lateral visible en teléfono y tablet

## Qué ocurre hoy

El menú lateral izquierdo solo se muestra en pantallas grandes (a partir de 1024 px). En teléfono y tablet queda oculto por completo y no existe ningún botón que lo abra, por lo que desde esos dispositivos no hay forma de navegar entre las pantallas: solo se ve la barra superior y el contenido de la página actual.

## Solución propuesta

Agregar un botón de menú (icono de tres líneas) en la esquina izquierda de la barra superior, visible únicamente en teléfono y tablet. Al tocarlo se despliega el mismo menú de siempre como panel deslizable desde la izquierda, con:

- El logo y el nombre de la aplicación.
- Los mismos grupos y opciones que ve el usuario según sus permisos.
- La opción activa resaltada igual que en escritorio.
- El pie con usuario, perfil, compañía, fecha de corte y versión.

El panel se cierra solo al elegir una opción, y en pantallas grandes todo queda exactamente igual que ahora.

## Ajustes adicionales para pantallas pequeñas

- La barra superior se reorganiza para que el botón de menú, el selector de compañía y el botón de cerrar sesión no se amontonen ni se corten.
- El selector de compañía se adapta al ancho disponible en lugar de usar un ancho fijo.
- Se revisa que el contenido de las páginas no quede tapado por la barra superior fija.

## Detalle técnico

- `src/components/layout/AppShell.tsx`: extraer el contenido del `aside` a un componente interno reutilizable (`ContenidoMenu`), usado tanto por el `aside` de escritorio (`hidden lg:flex`) como por un `Sheet` (`side="left"`, ancho ~17rem) controlado con estado `menuAbierto`, cerrándose en el `onClick` de cada `Link` y al cambiar `pathname`.
- Disparador: `Button variant="ghost" size="icon"` con icono `Menu` de lucide-react, clase `lg:hidden`, dentro del `header`.
- Reutilizar `src/components/ui/sheet.tsx` (ya existe); incluir `SheetTitle` accesible (puede ir en `sr-only`) para evitar advertencias de Radix.
- Header: `SelectTrigger` pasa de `w-44` fijo a `w-full max-w-[11rem] sm:w-44`, y la fila usa `min-w-0` en los contenedores de texto.
- No se toca lógica de permisos, datos ni API. Subir versión de aplicación a 1.36.5 con su nota en `src/lib/version.ts`.
