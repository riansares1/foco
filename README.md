# Foco 🪙

Mi web personal de foco: cronometro lo que estudio, gano monedas de oro y plata, cumplo objetivos y me doy recompensas.

- **Foco**: elige asignatura (y categoría) → Empezar → Terminar. Modo estricto: si sales de la web más de X segundos, se pausa solo.
- **Monedas**: cada asignatura da X monedas de oro o plata por hora. 2 de plata = 1 de oro.
- **Tienda**: recompensas con su precio (ej. cine = 20 de oro).
- **Objetivos**: diarios (eligiendo días), semanales o antes de una fecha, con bonus opcional.
- **Estadísticas**: horas por asignatura y categoría, últimos 14 días e historial.

Todo se guarda **en local** en el navegador del dispositivo (localStorage). Haz copias en Ajustes → Exportar copia.

## Publicar en Vercel (una sola vez)
1. Entra en vercel.com e inicia sesión con GitHub.
2. **Add New… → Project** → importa el repositorio `foco`.
3. Framework Preset: **Other**. No toques nada más → **Deploy**.
4. Cada cambio que se suba a GitHub se publica solo.

## En el iPad
Abre la web en Safari → Compartir → **Añadir a pantalla de inicio**.

Web estática sin dependencias: `index.html`, `styles.css`, `app.js`, `sw.js` (funciona sin internet).
