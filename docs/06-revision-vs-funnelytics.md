# Revisión: DXW Funnel frente a Funnelytics

**Fecha:** 20 nov 2026 · Revisa el frontend y la funcionalidad construida en las fases 0–3 contra lo observado en Funnelytics ([03-funcionalidades-y-manual.md](03-funcionalidades-y-manual.md)).
**Objetivo:** que DXW Funnel sea igual o mejor en todo lo que usa el equipo, y que cubra los vacíos de Funnelytics para el caso de DXW (procesos internos y funnels de clientes conectados al CRM propio).

Leyenda: **✔ igual** · **▲ mejor** · **◐ parcial** · **✖ pendiente** (con fase prevista) · **—** no aplica a DXW.

---

## 1. Resumen

- De 64 funcionalidades revisadas: 30 iguales, 20 mejores, 6 parciales, 6 pendientes para las fases 4 y 5, y 2 que no aplican a DXW (facturación y copiar a otra cuenta).
- Todo lo que Funnelytics cobra en el plan Map Pro (mapa, forecast, compartir, plantillas) está cubierto.
- Lo que Funnelytics cobra en Performance (datos reales sobre el mapa, explorador, personas detrás de cada número, comparación) está cubierto con el CRM propio, que es la fuente que DXW decidió usar primero.
- Lo pendiente es tracking web (fase 4) y reportes/monitor de agencia (fase 5), según el roadmap de [02-diseno-dxw-funnel.md](02-diseno-dxw-funnel.md).

### Qué se agregó en esta revisión (20 nov 2026)

| Vacío encontrado | Qué se construyó |
|---|---|
| No había menú contextual | Clic derecho sobre paso, línea y fondo: duplicar, copiar, pegar, ver personas, traer al frente, enviar atrás, eliminar, tipo de línea |
| No se podía copiar y pegar ni seleccionar todo | Ctrl+C, Ctrl+V (pega donde está el cursor), Ctrl+A; copiar conserva las líneas entre los pasos copiados |
| No había alineación de elementos | Barra de alineación al seleccionar dos o más: izquierda, derecha, arriba, abajo y distribuir en horizontal o vertical |
| No había explorador de datos reales | Pestaña "Desde el CRM" en la biblioteca: orígenes, etapas y eventos con conteo; un clic agrega el paso ya conectado al CRM |
| Los números reales no mostraban quiénes son | Panel "Personas" por paso y por línea: id, responsable, origen, etapa, fecha y días en el paso; buscador y CSV |
| No había tendencia | Vista Real muestra ▲▼ frente al período anterior en cada paso |
| Exportar solo PNG ×1 | PNG ×1, ×2 y ×3 (impresión) más CSV de pasos y CSV de líneas |
| No había ayuda dentro del editor | Diálogo "Cómo usar el editor" con atajos; indicador de zoom |
| Sin capa de flujo animada | Botón "Animar el flujo entre pasos" (respeta `prefers-reduced-motion`) |
| Texto sin estilo, formas sin triángulo | Tamaño, color, negrita y alineación en textos; triángulo además de rectángulo y elipse |
| Borrar era definitivo | Papelera de 30 días con restaurar; borrado definitivo solo para administradores |
| La lista de mapas no tenía vista previa ni orden | Miniatura SVG de cada mapa, orden por última edición, nombre o creación, filtro "Mis mapas" y por tag |
| Diálogos sin Escape | Ayuda y panel de personas cierran con Escape |
| El panel derecho no se podía ocultar | Botón en la barra superior para ocultar o mostrar el panel de detalles, como ya existía para la biblioteca |
| No había forma de guardar solo prototipos de flujo | Modo **Prototipo** por mapa: oculta simulación, CRM y el resumen de la simulación sobre el mapa; deja solo el flujo. Se elige al crear el mapa o desde la barra del editor, donde en Prototipo queda como una etiqueta que muestra el selector al hacer clic. La lista lo marca y permite filtrar por "Prototipos" |
| El ícono no se podía agrandar ni achicar | Tamaño del ícono por paso: pequeño, normal, grande y extra grande |
| No había logos de redes ni herramientas predefinidos | Categoría "Redes y herramientas" con 91 marcas: 70 logos oficiales (Simple Icons, CC0) con su color de marca y 21 monogramas para marcas sin logo disponible o cuyo logo es un nombre muy largo (LinkedIn, Slack, Canva, Salesforce, Teams, Outlook, Typeform, Nequi, Wompi, Bancolombia, Rappi…), reemplazables subiendo el logo real. Los logos que son una palabra (Zoom, Uber, Zapier, Odoo, Zoho, Wix) se agrandan dentro del círculo para que se lean. Buscador por palabra clave ("pagos", "crm", "redes") |
| Subir un logo desde el paso no lo dejaba disponible para otros | "Subir logo" en el paso lo guarda en "Logos e íconos del equipo" del workspace (PNG, JPG, SVG, WEBP, GIF) y lo asigna al paso |

---

## 2. Matriz por área

### 2.1 Cuenta, equipo y workspaces

| Funcionalidad | Funnelytics | DXW Funnel | Estado |
|---|---|---|---|
| Login | Email y contraseña, Google | Google restringido al dominio de DXW | ▲ sin contraseñas que administrar |
| Colaboradores | Invitación por email con permiso | Membresía automática por dominio, roles admin / editor / lector, un admin mínimo | ▲ sin invitaciones manuales |
| Workspaces por cliente | Ilimitados solo en plan Agency | Ilimitados, tipo interno o cliente, zona horaria, moneda | ▲ |
| Configuración del workspace | Nombre, URL, zona horaria, borrar | Nombre, tipo, zona horaria, moneda, borrar | ✔ |
| Facturación y planes | Stripe, 4 planes | — (uso interno) | — |
| Workspace Overview (estado por cliente) | Plan Agency | ✖ fase 5 | ✖ |

### 2.2 Lista de mapas

| Funcionalidad | Funnelytics | DXW Funnel | Estado |
|---|---|---|---|
| Orden y filtros | Orden, "míos", tags | Última edición / nombre / más recientes, "Mis mapas", tags | ✔ |
| Vista previa | Miniatura | Miniatura SVG generada desde el mapa, sin textos ni datos | ✔ |
| Crear desde plantilla | Biblioteca pública | 5 plantillas base + plantillas propias de DXW marcadas por el equipo | ▲ plantillas del equipo |
| Duplicar | ✔ | ✔ | ✔ |
| Eliminar | Definitivo (recuperar vía soporte) | Papelera 30 días, restaurar, borrado definitivo solo admin | ▲ |
| Tags | ✔ | ✔ con filtro | ✔ |

### 2.3 Editor: lienzo y elementos

| Funcionalidad | Funnelytics | DXW Funnel | Estado |
|---|---|---|---|
| Biblioteca de elementos | Sources / Pages / Actions, ~120 ítems con marcas | 150 ítems en 7 categorías: 59 genéricos (Lucide) y 91 marcas con logo y color oficial; buscador por nombre y palabra clave | ▲ |
| Íconos propios | JPG/PNG < 5 MB | PNG/JPG/SVG/WEBP/GIF por workspace; se suben desde la biblioteca o desde el paso y quedan para reutilizar | ▲ |
| Tamaño del ícono | Fijo | Cuatro tamaños por paso | ▲ |
| Modo solo flujo (prototipo) | ✖ no existe (el forecast siempre está) | Modo Prototipo por mapa, con filtro en la lista | ▲ |
| Texto | 5 fuentes | Tamaño, color, negrita, alineación | ◐ sin elección de fuente (decisión: una sola tipografía de marca) |
| Formas | Rectángulo, elipse, triángulo | Rectángulo, elipse, triángulo, color y opacidad | ✔ |
| Imágenes | Subir | Subir, URL segura, redimensionar | ✔ |
| Miniatura de página desde URL | Automática | Subida manual de la captura | ◐ pendiente elegir servicio de screenshots |
| Conectar pasos | Arrastrar desde puntos | Igual, con puntos en los cuatro lados | ✔ |
| Tipos de línea | Directa, indirecta, sin datos | Directa, indirecta, sin datos, con etiqueta | ✔ |
| Notas por paso y del mapa | Texto enriquecido | Texto plano | ◐ enriquecido queda para después |
| Checklist por paso y del mapa | Anidado, progreso, copiar, ocultar completados | Progreso, copiar, ocultar completados | ✔ (sin anidación) |
| Deshacer / rehacer | ✔ | ✔ Ctrl+Z / Ctrl+Shift+Z | ✔ |
| Copiar / pegar / duplicar | Ctrl+C, Ctrl+V, Ctrl+D | Igual, pega donde está el cursor y conserva líneas | ✔ |
| Seleccionar todo, multiselección | Shift + arrastrar | Shift + arrastrar, Ctrl + clic, Ctrl+A | ✔ |
| Alinear y distribuir | ✖ no existe | Barra de alineación con 6 acciones | ▲ |
| Traer al frente / enviar atrás | ✔ | ✔ | ✔ |
| Menú contextual | Nodo y línea | Nodo, línea y fondo | ✔ |
| Zoom, pan, minimapa | ✔ | ✔ con indicador de zoom | ✔ |
| Ayuda y atajos | Enlace externo | Diálogo dentro del editor | ▲ |
| Capa de flujo animado | ✔ | ✔ (respeta reducción de movimiento) | ✔ |
| Autoguardado | ✔ | ✔ con control de versión optimista (dos personas no se pisan) | ▲ |
| Historial de versiones | Restore | Lista de versiones con restaurar | ✔ |
| Exportar PNG | ×1 a ×4 | ×1 a ×3 | ✔ |
| Exportar CSV | Pasos; líneas solo con analítica | Pasos y líneas siempre | ▲ |
| Modo oscuro | ✖ | ✔ sigue al sistema | ▲ |
| Interfaz en español | ✖ | ✔ con el estándar de UX writing de DXW | ▲ |

### 2.4 Simulación (forecast)

| Funcionalidad | Funnelytics | DXW Funnel | Estado |
|---|---|---|---|
| Pasos de entrada con período | Día / semana / mes / fijo | Igual | ✔ |
| Dos de tres datos (personas, gasto, costo) | ✔ | ✔ el tercero se calcula | ✔ |
| % por línea | ✔ | ✔ | ✔ |
| Ingreso por conversión | Valor promedio por cliente | Ingreso y valor de meta por persona | ✔ |
| Gastos fijos | Lista editable | Lista editable | ✔ |
| Widget de resumen | Personas, formularios, compras, ingresos, gastos, utilidad, ROI | Igual más ROAS y costo por venta | ▲ |
| Escenarios | ✖ un solo escenario | Conservador / esperado / optimista con factores del mapa o valores por línea | ▲ |
| Goals con valor | ✔ | ✔ valor de meta por paso | ✔ |
| Motor probado | — | `src/lib/forecast/engine.ts` con tests | ▲ |

### 2.5 Datos reales

| Funcionalidad | Funnelytics | DXW Funnel | Estado |
|---|---|---|---|
| Fuente de datos | Script web, Meta Ads, HubSpot, GHL | CRM propio de DXW (webhook firmado + CSV) | ▲ para el caso de DXW; ✖ web en fase 4 |
| Conectar un paso a datos | Tracking settings (URL, parámetros, acciones) | Evento o etapa del CRM, pipeline, origen; sugerencias de valores vistos | ✔ |
| Explorer (mapear desde datos reales) | Plan Performance | Pestaña "Desde el CRM" con conteos y un clic para agregar | ✔ |
| Step Explorer (anterior / siguiente real) | ✔ | ✖ fase 4 | ✖ |
| Números sobre el mapa | Personas y % por línea | Personas, %, tiempo en el paso, SLA | ▲ |
| Personas detrás del número | Lista y CSV | Panel por paso y línea con buscador y CSV | ✔ |
| Vistas | Traffic Mode / Funnel Mode | Simulación / Real / Comparar | ◐ Funnel vs Traffic queda para fase 4 (solo tiene sentido con sesiones web) |
| Comparar simulación con realidad | Plan Business | Vista Comparar con delta por paso y en el widget | ▲ |
| Tendencia vs período anterior | Comparison Signals (segmento o periodo) | ▲▼ frente al período anterior en cada paso | ◐ sin semáforo ni umbrales (fase 5, junto con targets) |
| Rango de fechas | Selector libre | Últimos N días (7–365) desde el widget | ◐ selector de fechas libres pendiente |
| Filtros de personas (país, dispositivo) | ✔ | ✖ fase 4 (requiere tracking web) | ✖ |
| Contribution Window | ✔ | ✖ fase 4 | ✖ |
| Refrescar datos | Manual, "data is stale" | Se recalcula al abrir y al cambiar el rango | ▲ |

### 2.6 Compartir y entrega a clientes

| Funcionalidad | Funnelytics | DXW Funnel | Estado |
|---|---|---|---|
| Link de solo lectura | ✔ | ✔ con contraseña, vencimiento y notas ocultas por defecto | ▲ |
| Link para copiar a otra cuenta | ✔ | — (solo uso interno) | — |
| Publicar como plantilla | Biblioteca pública | Plantillas del equipo | ✔ |
| Reportes por frames → PDF | ✔ | ✖ fase 5 | ✖ |
| KPI Monitor, Targets, Insights Log | Plan Performance | ✖ fase 5 | ✖ |

### 2.7 Calidad y seguridad

| Aspecto | Funnelytics | DXW Funnel |
|---|---|---|
| Datos de contactos | Email en claro | Solo hash SHA-256 del email, id del CRM y campos operativos |
| Webhook | Secreto compartido | HMAC-SHA256 verificado en Postgres, clave rotable |
| Acceso | Permisos por plan | RLS en todas las tablas, roles por organización |
| Pruebas | — | 39 tests (motor de forecast, actuals del CRM, alineación, documento) |

---

## 3. Pendientes conocidos y dónde van

| Pendiente | Fase | Nota |
|---|---|---|
| Captura automática de páginas desde URL | 1.5 | Falta elegir servicio externo o worker propio |
| Notas con texto enriquecido | 1.5 | Hoy texto plano; evaluar si el equipo lo pide |
| Selector de rango de fechas libre y comparación de períodos personalizados | 3.5 | Hoy "últimos N días" y período anterior equivalente |
| Tracking web (`dxw.js`), modos Funnel/Traffic, filtros de personas, Contribution Window, Step Explorer | 4 | Según [02-diseno-dxw-funnel.md](02-diseno-dxw-funnel.md) §7 |
| Reportes por frames, KPI Monitor, Targets con semáforo, Workspace Overview | 5 | Vista de agencia |
| Purga automática de la papelera | — | `purge_old_canvases()` existe; falta programarla (cron de Supabase) |
| Rate limiting del webhook y de contraseñas de links | — | Antes de exponer la app en internet |
| Setup real de Supabase y Google | — | Carlos, según [04-setup-fase-0.md](04-setup-fase-0.md) |
| Envío de eventos desde el CRM (Neon) | — | Equipo del CRM, según [05-integracion-crm.md](05-integracion-crm.md) |

---

## 4. Verificación de esta revisión

- Typecheck, ESLint (0 avisos) y 39 tests en verde.
- Probado en el navegador en `/dev/canvas` con datos de ejemplo: modo Prototipo (oculta el botón Simulación, los selectores de vista y escenario, la pestaña "Desde el CRM", los números bajo los pasos y las secciones CRM y Simulación del inspector; al volver a Completo todo reaparece y el modo se guarda en el documento), tamaños de ícono (40, 56, 80 y 112 px), "Subir logo" (queda en la biblioteca, en el selector de íconos y en el paso), menú contextual (6 acciones en un paso), Ctrl+C/Ctrl+V (agrega 1 paso), Ctrl+A (selecciona todo), barra de alineación (6 botones; "Alinear arriba" deja todos los pasos en la misma Y), menú Descargar (5 opciones), ayuda (abre y cierra con Escape), animación de flujo (14 líneas animadas, se apaga), panel de personas (14 contactos para "Referido", cierra con Escape), pestaña "Desde el CRM" (agrega un paso ya conectado a la etapa "Negociación"), indicador de zoom.
- No probado con Supabase real: papelera, miniaturas y filtros de la lista de mapas dependen de la base de datos y se verificaron solo por tipos y build.
