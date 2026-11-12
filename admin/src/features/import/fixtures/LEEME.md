# Carteleras de prueba del importador

- `cartelera-2026-02-28.txt`: «Los tablados del sábado 28», de El Observador
  (<https://www.elobservador.com.uy/cultura-y-espectaculos/la-lista-tablados-y-espectaculos-carnaval-este-fin-semana-n6035835>).
  No es una copia directa de la página: se rearmó el 2026-11-12 con las 82 líneas transcritas
  en `supabase/local/noche_real_2026-02-28.sql` (decisión 39), en el formato en que la nota las
  publica. Ese día se comprobó contra la nota, que sigue en línea, que coinciden el formato
  (el nombre del escenario en mayúsculas y debajo «HH:MM - CONJUNTO», con una línea en blanco
  entre escenarios), los 18 títulos de escenario en su orden y la cantidad de líneas de cada uno.
  Incluye las tres de «ESCENARIOS MÓVILES», que la noche real de prueba deja afuera.
- `tabla-daecpu.txt`: una línea por actuación, con las columnas de la tabla «Programación de
  hoy» de la web de DAECPU (Fecha, Hora, Conjunto, Escenario) separadas por tabulaciones, como
  queda al copiar una tabla. **Es un ejemplo armado**: fuera de temporada esa tabla está vacía y
  no hay una muestra real. Cuando haya una, se reemplaza y se ajusta el parser si hace falta.
