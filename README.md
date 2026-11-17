# SIMULAB · Panel solar en Tandil

¿Hacia dónde y cuánto inclinar un panel solar en una casa? Este simulador calcula la posición del sol para cualquier lugar y momento. Muestra cuánta luz recibe el panel, con las sombras de un árbol y de las nubes. También compara lo teórico con lo que midió el inversor y estima cómo está montado el panel en realidad.

**App:** https://simulab-solar-panel.vercel.app

Es un solo archivo, `index.html`, y funciona sin internet.

## Qué se puede hacer

- **Modo libre.** Elige fecha, hora, latitud, longitud, inclinación, giro, nubes y árbol desde el panel izquierdo. La app arranca en pausa; ▶ hace avanzar la hora y ❚❚ la congela. Mover una perilla no pone la animación en Play.
- **Árbol arrastrable.** Su sombra sigue al sol y baja la potencia cuando tapa el panel.
- **Nubes que viajan con el viento** y proyectan sombra sobre el suelo, el techo y el panel.
- **Video guiado** en los botones de abajo: plano, vertical, al sur, ángulo justo y tu techo. Después, *Nubes* muestra cómo se usa el panel de configuración, e *Inversor* carga el CSV simulado y corrige la orientación con el diagnóstico.
- **Datos del inversor.** *Importar CSV…* o *Cargar CSV simulado* dibuja la curva real contra la teórica y estima la inclinación, el giro y las horas de sombra fija.

## Formato del CSV

Una fila por medición. La fecha y hora es la hora local y la potencia puede estar en kW o en W. Se aceptan separadores `,` o `;`, coma decimal y fechas `AAAA-MM-DD` o `DD/MM/AAAA`. Hay ejemplos en `data/`:

| Archivo | Para qué |
|---|---|
| `tandil-simulado-2026-11.csv` | 14 días cada 5 min, formato simple |
| `tandil-prueba-formato-2.csv` | los mismos datos con `;`, coma decimal y W |
| `tandil-simulado-verdad.json` | la orientación y el árbol reales escondidos en el CSV, para comprobar el diagnóstico |

Son **datos simulados**, no vienen de un inversor real.

## Desarrollo

```
index.html        la app armada (lo que se publica)
model.js          modelo puro: sol, luz, nubes, árbol, CSV y diagnóstico
demo.js           escena, paneles, controles y panel lateral
demo.json         título y nota con fuentes y supuestos
sim-data.js       el CSV simulado incluido en la app (generado)
simular-csv.mjs   genera data/*.csv, data/*.json y sim-data.js
check.mjs         comprobaciones rápidas del modelo
build.sh          arma index.html
data/             CSV de prueba
```

```sh
./build.sh            # arma index.html (necesita el kit SIMULAB en ~/.claude/skills/simulab)
node check.mjs        # comprueba el modelo
node simular-csv.mjs  # regenera los datos simulados
```

Cada push a `main` se publica solo en Vercel. Corre `./build.sh` antes de cada commit para que `index.html` esté al día.

## Modelo y supuestos

- Posición del sol por declinación de Cooper, ecuación del tiempo y huso horario.
- Luz directa con masa de aire de Kasten-Young y la fórmula de Meinel.
- Difusa: 10 % de la directa. Albedo: 0.2.
- Nubes con Kasten-Czeplak.
- Pérdida por calor de −0.35 %/°C.
- Rendimiento del 86 % por cableado e inversor (supuesto).

La lista completa, con las fuentes, está en `demo.json`.

Motor, assets y herramientas: [SIMULAB](https://github.com/ecapri-dev/simulab-skill) / KAPRI LAB por @0xKapri (MIT). Fuentes JetBrains Mono, Caveat y Silkscreen (SIL OFL 1.1). `index.html` las incluye; los textos de las licencias están en [NOTICE](NOTICE).
