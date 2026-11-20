# Funnelytics: recorrido funcional y manual oficial

**Fecha:** 19 nov 2026 · Complementa [01-reingenieria-funnelytics.md](01-reingenieria-funnelytics.md).
**Fuentes:**
- **[App]** recorrido en vivo de la cuenta de Carlos (plan Map Pro, en trial; workspace "Doux Work"), solo lectura. No se creó, editó ni envió nada.
- **[Demo]** canvas tutorial público "AGENCY - Overview Demo", donde las funciones de analítica están desbloqueadas.
- **[Código]** bundles del canvas ya capturados con REA.
- **[Manual]** help center oficial `docs.funnelytics.io`.

---

## 1. ¿Existe un manual?

**Sí, pero no como PDF.** El manual oficial es el help center **https://docs.funnelytics.io/** (plataforma NeetoKB): 7 carpetas y 94 artículos, actualizados entre octubre y noviembre de 2026 según el sitemap. No existe PDF descargable ni curso o "university" pública.
- El help center antiguo (`help.funnelytics.io`, estilo Intercom/HubSpot) ya no resuelve DNS; solo queda en buscadores.
- El "Resource Hub" (`hub.funnelytics.io`) no carga. Hoy solo se ofrece dentro del plan Agency, junto con un "Certification program" ([App], página de planes).
- Muchos artículos son la descripción de un video, sin texto detallado.
- Si hace falta una copia offline, se puede generar un PDF propio desde `https://docs.funnelytics.io/sitemap.xml` (94 URLs).

| Carpeta | Artículos | Contenido |
|---|---|---|
| Getting Started | 20 | Canvas, mapeo, plantillas, notas, checklists, share links, tags, colaboradores, modos de tráfico, Explorer, Step Explorer, Goals, Widgets, Comparison Signals, Contribution Window, People Filter, CSV, Reports |
| Integrations | 20 | Instalación del script (Shopify, GTM, WordPress, Webflow, verificación), Meta Ads, GoHighLevel, HubSpot, Google Ads, compras, webhooks, Calendly, ThriveCart, Vidalytics, SPA |
| Dashboard | 11 | KPIs custom, KPI Monitor, Targets, Workspace Overview, Monitor de fuentes/páginas/ads, exclusión de IP, Template Library, Insights Log, Vision AI |
| Account Management | 4 | Cuenta, facturación, email, contraseña |
| FAQ | 12 | Cancelación, borrar cuenta, recuperar canvas, línea directa vs indirecta, datos que no cuadran con el page builder, GDPR |
| How-To Guides | 3 | Split tests, canvas en blanco, wildcards |
| Playbooks & Use Cases | 24 | Lanzamientos, reportes de contribución, ICP desde formularios, frameworks de optimización, forecasting para cerrar clientes |

Lectura recomendada para el equipo: *Canvas Overview*, *Mapping Fundamentals*, *Traffic Modes & Reading Data*, *Direct vs Indirect Line*, *Journey Tracking*, *Contribution Window*, *Send Webhook Events*, *Understanding the KPI Monitor*.

---

## 2. Dashboard: lo que ve un usuario (observado [App])

Menú lateral del workspace:

| Sección | Plan Map Pro | Qué es |
|---|---|---|
| Workspaces Overview | Bloqueado | Estado de todos los workspaces/clientes (On track / Off pace / Critical) y emails programados [Manual] |
| Selector de workspace | ✔ | Un workspace por cliente o proyecto |
| **Tools** · Monitor | Bloqueado (modal "Upgrade to Performance") | KPIs, páginas, fuentes, ads |
| Tools · Targets | Bloqueado | Metas por KPI: actual, proyectado, meta, umbral, semáforo |
| Tools · **Canvases** | ✔ | Lista de mapas con orden, filtro (todos / míos) y filtro por tags |
| Tools · Insights log | Bloqueado | Bitácora de cambios y hallazgos con imágenes |
| **Setup** · Collaborate | ✔ | Tabla de colaboradores (nombre, email, permiso, fecha); invitar con nombre, apellido y email |
| Setup · Integrations | Bloqueado | OAuth con Meta, Google Ads, HubSpot, GHL |
| Setup · Settings | ✔ | ID del workspace, nombre, Site URL, zona horaria, borrar workspace |
| Funnelytics Onboarding | ✔ | Barra de progreso de onboarding (niveles e ítems) |
| Learn / chat | ✔ | Ayuda y chat (LeadConnector/GHL) |

**Campos reales de un workspace** (estado de la app): `name`, `main_url`, `client_timezone`, `tracking`, `tracking_eu`, `auto_tracking`, `analytics_script_installed`, `domains_verified`, `rate_limiting_enabled`, `session_continuity`, `started_tracking_at`, `is_locked`, `logo_url`, `facebook_account_id`, `int_id`.
→ Para DXW: el workspace debe guardar el estado de instalación del script, la verificación de dominios, la región de datos (EU) y el rate limiting.

**Permisos reales del plan Map Pro:** colaboración sí; analítica, integraciones, tracking de formularios y compras, cross-domain, Zapier/webhooks, IA y Workspace Overview no. `dataRetention: 0` y `customActionsAllowed: 0`.

### Planes vistos dentro de la app (precio anual)

| Plan | USD/mes (anual) | Diferencial |
|---|---|---|
| Map Pro | 39 (mensual, plan actual) | Solo mapa y forecast |
| Performance Pro | 107 (1.290/año) | Formularios y calendarios, segmentación, Zapier/webhooks |
| Performance Business | 291 (3.490/año) | Compras, eventos custom, auto-tracking multidominio, forecast vs real, HubSpot |
| **Performance Agency** | **833 (9.999/año)** | **Workspaces de cliente ilimitados**, onboarding del equipo, soporte prioritario, resource hub, **certificación**, directorio de proveedores, plantillas para agencias |

> Dato clave para DXW: el plan pensado para agencias que montan funnels a clientes cuesta ≈10.000 USD/año. Ese es el costo que DXW Funnel reemplaza.

---

## 3. Editor de canvas (observado [App] + [Demo])

### 3.1 Barra superior
| Control | Detalle |
|---|---|
| Nombre del canvas ▾ | Renombrar e historial de versiones con Restore [Manual] |
| Texto | 5 fuentes: Roboto, Montserrat, Lobster Two, Playfair Display, Josefin Slab |
| Imagen | Subir imagen al canvas |
| Formas ▾ | Rectángulo (`r`), elipse (`o`), triángulo (`p`); Shift mantiene la proporción |
| Puntero ▾ | Select (`s`) / Pan (rueda del mouse o barra espaciadora) |
| Widgets | Top Countries, People, Trends (analítica) y **Forecast** (disponible en Map) |
| Exportar | **PNG** con resolución x1–x4; **CSV** de pasos (elementos) y de conversiones (líneas), este último solo con analítica |
| Compartir | Pestaña *Sharing Link*: link para ver y **copiar a su cuenta**, y link **View Only**. Pestaña *Template Library*: publicar el canvas como plantilla para otros usuarios |
| Rango de fechas | Selector de fechas del análisis |
| Data View | **Traffic Mode** / **Funnel Mode** |
| Filters | People Filter: país, dispositivo, persona, "personas que hicieron X" |
| Compare | Comparison Signals: segmento o periodo, con semáforo y umbrales |
| Refresh | "Analytics data is stale. Refresh to get the latest data" (la analítica no es en vivo; se recalcula a pedido) |
| Zoom % y ayuda | |

### 3.2 Barra izquierda
1. **Map (biblioteca de elementos):** buscador y pestañas Sources / Pages / Actions, más "Custom Uploaded Icons" (JPG/PNG < 5 MB).
   - **Sources:** Paid (Facebook, Google, Instagram, Bing, LinkedIn, YouTube, X, TikTok, Pinterest, Reddit Ads) · Search (All Search, Bing, Google, YouTube) · Social (orgánico de las mismas redes) · Email/CRM (ActiveCampaign, HubSpot, Drip, Salesforce…) · Messaging (Chat Box, Slack, Telegram, Messenger, SMS, Chatbot) · Other Sites (Zoho, Yelp, Zendesk, Drift, GoToMeeting, Amazon, Zoom, Gmail, Spotify, Snapchat, Clutch, Google Maps) · **Offline** (entrevista, anuncio impreso, conferencia, reunión online, banner, correo directo, TV, directorio, workshop, radio, guest blog, bolsa de empleo, reunión, valla, tarjeta, sitio de empleo, teléfono, reporte, QR).
   - **Pages (16):** Generic, Download, Opt In, Order, Sales, Sales Video, Calendar, Survey, Upsell/OTO, Webinar Live, Webinar Replay, Blog Post, Members Area, Thank You, Popup.
   - **Actions:** *Conversion* (Purchase, Form Completed, Schedule Meeting, Deal Won) · *Engagement* (Watch Video, Link Click, Scroll, Button Click, Deal Status) · *Integration* (GHL Appointment, GHL Order, GHL Opportunity, GHL Opportunity Won, HubSpot Deal, HubSpot Deal Won) · *Custom* (Add To List, Contact, Request Consult, Request Info, Popup, Add To Cart, Add Tag).
2. **Explorer** (analítica): tabla de Sources / Pages / Actions con personas por ítem. Botón "+" para mapear un ítem al canvas y botón de "ver detalle". Ejemplo del demo: Page URL → People.
3. **Canvas Notes:** editor de texto enriquecido (negrita, H1–H3, listas, cita, código, alineación, link, imagen, video).
4. **Canvas Checklist:** ítems anidados, barra de progreso, "Copy Checklist", "Hide Completed".
5. **Plantillas:**
   - *Strategy:* Lead Magnet, Survey, Webinar, Mini Class, Product Sales (upsells/downsells), Application.
   - *Performance:* Page Analysis, Journey Analysis, Source Analysis.

### 3.3 Barra derecha: capas de datos
Numbers · Flow (puntos animados) · Lead Time · **Forecast** · Notes · Checklist. Cada capa se enciende y apaga.

### 3.4 Menú contextual de un **nodo**
- **Style:** etiqueta y cambio de ícono (con buscador).
- **Plan:** **Notes**, **Checklist**, **Forecast** por nodo.
- **Analytics:**
  - **Tracking Settings:**
    - Frase: *"This step represents people that [come / did not come] from the following"*. En acciones: *"people who [completed / not completed]"*.
    - **Source:** URL Parameters / Direct Traffic / Facebook Ad (campañas, ad sets, anuncios).
    - Tabla Key / operador / Value. Operadores: `=`, `≠`, `contains`, `does not contain`, `>`, `<`.
    - Se puede pegar un link y sus parámetros se cargan solos.
    - **Attribute Explorer** al costado, con los valores reales vistos.
  - **People:** lista de personas que pasaron por el paso, con export CSV.
- **⋯ (más):** Label, **"Create a thumbnail from a URL"** (miniatura de la página real), Copy (Ctrl+C), Duplicate (Ctrl+D), Delete, Bring forward/front, Send backward/back.
- Para conectar se arrastra desde los puntos azules del nodo. Arrastrar al vacío abre el "Floating Explorer" con los pasos siguientes reales [Manual].

### 3.5 Menú de una **conexión**
- **Line Type:** **Direct Step** (sólida: B justo después de A en la misma sesión), **Indirect Step (Skip Steps)** (punteada: la misma persona, en cualquier momento del rango) y **No Data** (solo visual).
- **Plan:** Forecast (% de conversión).
- **Analytics:** People (quiénes hicieron A→B).
- Etiqueta sobre la línea: **Rate %** y **People**.

### 3.6 Forecast (observado [Demo] + [Código])
- **Nodo raíz** (sin entradas), configurado con dos campos:
  - **Period:** Per Day / Per Week / Per Month (promedio de 30 días) / Fixed.
  - **Inputs:** *Spend & Cost per Person*, *People & Cost per Person* o *People & Spend*. El tercero se calcula solo (ej.: 105,16 personas/día + 200 USD/día → costo por persona 1,90).
- **Nodos no raíz:** reciben personas por las conexiones (% de cada línea).
- **Acciones de compra:** valor promedio por cliente → ingresos.
- **Widget Forecast:** People, Forms Completed, Purchases, Revenue, Expenses, Profit y **Return on Investment**, con una lista editable de gastos (Expenses) y el total.

### 3.7 Lo que el manual agrega (no observado en vivo)
- **Goals:** cualquier paso o línea puede marcarse como meta con un valor en dinero; valor = personas × valor.
- **Contribution Window:** después de filtrar por un paso, mira N días hacia adelante o atrás (ciclos de venta largos).
- **Reports con "Frames":** marcos sobre el canvas que se convierten en diapositivas (Executive, Contribution Impact).
- **Wildcards** en URLs: `*` reemplaza caracteres y `**` cubre un dominio completo.
- **Step Explorer:** desde un paso muestra los pasos anteriores y siguientes reales y permite mapearlos con un clic.
- **Canvas tags**, recuperación de canvas borrados vía soporte, exclusión de IPs.

---

## 4. Qué cambia para el diseño de DXW Funnel

Agregar al alcance (ver [02-diseno-dxw-funnel.md](02-diseno-dxw-funnel.md)):

| Funcionalidad | Fase sugerida | Por qué |
|---|---|---|
| Forecast con período (día/semana/mes/fijo) y 3 combinaciones de inputs en nodos raíz | 2 | Es lo que hace útil el forecast en propuestas |
| Widget de forecast con gastos manuales, utilidad y ROI | 2 | Igual |
| Tipos de línea Direct / Indirect / No Data | 1 (visual) y 3 (datos) | Define cómo se cuentan conversiones |
| Notas y checklist por nodo y por canvas, miniatura desde URL | 1 | Planeación y presentación a clientes |
| Plantillas Strategy + Performance y "publicar como plantilla" | 1 | Biblioteca DXW de funnels repetibles |
| Share: ver y copiar, solo lectura con contraseña | 1 | Entrega a clientes |
| Goals con valor monetario | 2 | Puente entre forecast y datos reales |
| Explorer / Step Explorer (mapear desde datos reales) | 3 | El "descubrir el embudo real" es diferencial |
| Filtros de personas, comparación con semáforo, Contribution Window | 3–4 | Análisis |
| Reportes por Frames → PDF | 5 | Reporte mensual al cliente |
| Workspace Overview con estado por cliente | 5 | Vista de agencia (es lo que cobran 10k USD/año) |

## 5. Vacíos que siguen abiertos
Ni el manual ni la cuenta Map Pro permiten ver:
- columnas exactas del CSV de personas;
- denominador del % en las líneas en modo tráfico;
- valores por defecto de Contribution Window y Signals;
- matching de contactos con HubSpot y GHL;
- formato del reporte descargable;
- qué captura exactamente el auto-tracking (en el código: links, botones, scroll, formularios, video y Calendly; ver doc 01 §6).

Para cerrarlos habría que activar el trial de Performance o pedir un demo.
