# Mis Gastos – instalación en iPhone

Esta carpeta contiene una PWA (Progressive Web App) lista para instalar.

## Opción recomendada: GitHub Pages
1. Crea una cuenta en GitHub si no tienes una.
2. Crea un repositorio nuevo, por ejemplo `mis-gastos`.
3. Sube todos los archivos de esta carpeta a la raíz del repositorio.
4. Ve a Settings > Pages.
5. En "Build and deployment", elige "Deploy from a branch".
6. Selecciona `main` y `/ (root)`.
7. Guarda. GitHub te dará una URL pública.
8. Abre esa URL en Safari en el iPhone.
9. Pulsa Compartir > Añadir a pantalla de inicio.
10. Pulsa Añadir.

## Privacidad
Los datos de gastos se guardan localmente en el navegador del dispositivo.
No se envían a ningún servidor.

## Copias de seguridad
En Ajustes puedes exportar un JSON con todos los datos y volver a importarlo después.

## Importante
Para que se pueda instalar correctamente como app, debe servirse desde HTTPS.
GitHub Pages, Netlify y Vercel sirven HTTPS automáticamente.
