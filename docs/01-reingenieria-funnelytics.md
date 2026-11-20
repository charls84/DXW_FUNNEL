# Reingeniería de Funnelytics → base para DXW Funnel

**Fecha:** 19 nov 2026 · **Método:** skill REA (reverse-engineer-anything) sobre artefactos públicos + investigación web.
**Alcance:** solo lo que Funnelytics sirve públicamente sin cuenta: pantalla de login de `app.funnelytics.io`, sus chunks JS estáticos, el canvas tutorial público de `canvas.funnelytics.io` y el script de tracking `cdn.funnelytics.io/track-v3.js`. No se inició sesión ni se tocó ninguna cuenta.

**Cómo leer este documento**
- **Observado** = visto directamente en código o tráfico capturado.
- **Inferido** = deducción razonable a partir de lo observado; hay que validarla.
- **Desconocido** = no se pudo ver desde fuera (backend, base de datos, colas).

---

## 1. Resumen en una página

Funnelytics no es una plataforma única. Son **tres productos pegados**:

| Pieza | Qué hace | Stack (observado) | Estado |
|---|---|---|---|
| **Dashboard** `app.funnelytics.io` | Cuentas, workspaces, KPIs, monitor, integraciones, planes | Vite + React + TanStack Router/Query + Ant Design + Zustand + Chart.js + Editor.js + PostHog | Moderno (2025-26) |
| **Canvas** `canvas.funnelytics.io` | Editor visual de embudos + capa de datos + forecasting | Create React App + React 16.14 + Redux + **PIXI.js 6.4 (WebGL)** + Draft.js + jsPDF/html2canvas + Sentry | Legado (≈2019-21), se abre en otra pestaña |
| **Tracking** `track-v3.js` | Script en las páginas del cliente: sesiones, pasos, eventos | JS plano sin minificar + Cloudflare Worker para configuración | Activo |

**La idea central que hay que copiar (en concepto, no en código):** el mapa *es* la consulta. Cada nodo del canvas lleva una regla de coincidencia (URL, UTM o nombre de evento) y cada flecha pide "¿cuántas personas pasaron de A a B?". El backend de analítica recibe el grafo completo y devuelve números por nodo y por conexión.

**Lo que DXW puede hacer mejor:** un solo producto (canvas + datos en la misma app), canvas moderno, modo "proceso interno" además de "embudo de marketing", integración nativa con CRMs que usan nuestros clientes (GoHighLevel, HubSpot) y un portal de cliente con su propio acceso.

---

## 2. Arquitectura observada

```
                 ┌──────────────────────┐      ┌─────────────────────────┐
  Usuario ──────▶│ app.funnelytics.io   │─────▶│ dashboard-api           │ REST, JWT Bearer, header x-project-id
                 │ (dashboard, Vite)    │      │ new-dashboard-api /api/v1│ (servicios nuevos: Google Ads…)
                 └─────────┬────────────┘      │ ai-agent-api            │ "Vision AI" (host qa- en producción)
                           │ window.open       └─────────────────────────┘
                 ┌─────────▼────────────┐      ┌─────────────────────────┐
                 │ canvas.funnelytics.io│─────▶│ analytics-api           │ POST /canvas, /traffic-explorer,
                 │ (editor PIXI/WebGL)  │      │                         │ /people, /sessions, /widgets/trends
                 └─────────┬────────────┘      └─────────────────────────┘
                           │ GET URL prefirmada (15 min)
                 ┌─────────▼────────────┐
                 │ S3 ca-central-1      │ funnels/{funnelId}/{revisionId}  ← JSON del mapa, versionado
                 └──────────────────────┘

  Visitante ────▶ página del cliente + track-v3.js
                    ├─ GET  tracker-shield.funnelytics.workers.dev/settings/{projectId}   (Cloudflare Worker)
                    └─ POST track-v3.funnelytics.io/{sessions|steps|events/trigger|trackers/set|set-attributes}
```

Observado en la configuración de build del dashboard (`VITE_*`): URLs de las 4 APIs, IDs de cliente OAuth de Facebook, Google Ads, Google SSO, HighLevel y HubSpot, PostHog (EU), reCAPTCHA, FirstPromoter (afiliados). Los valores son claves públicas de cliente; no se copian aquí.

**Inferido:** el mapa se guarda como documento JSON en S3 (no en columnas SQL) y la base relacional solo guarda metadatos (`funnel`, `revision`, `project`). Datos alojados en AWS Canadá.

---

## 3. Módulos y rutas del dashboard (observado)

Rutas extraídas del router (TanStack) del bundle principal:

| Área | Rutas | Para qué sirve |
|---|---|---|
| Acceso | `/login`, `/register`, `/forgot`, `/reset/$id`, `/set-password/$id`, `/survey` | Auth con email, Google SSO, encuesta de alta |
| Workspaces | `/workspaces/overview`, `/workspaces/create`, `/workspaces/$workspaceId` | Un workspace = un cliente/proyecto (en el backend se llama `project`) |
| Canvas | `/canvases`, `/$canvasId`, `/share/$canvasId`, `/library`, `/import` | Lista de mapas, enlace de solo lectura, biblioteca de plantillas, importar |
| KPIs | `/dashboard`, `/create-kpi`, `/edit-kpi/$kpiId`, `/targets` | Widgets de KPI, metas por KPI |
| Monitor | `/monitor`, `/insights-log` | Monitoreo de fuentes, páginas y anuncios; bitácora de insights (con IA e imágenes) |
| Integraciones | `/integrations`, `/oauth/{facebook_ads, google_ads, highlevel, hubspot}` | Conexión OAuth |
| Equipo | `/collaborate`, `/users`, `/permission-managment`, `/admin-dashboard` | Invitar clientes/colaboradores, permisos |
| Cuenta | `/account-settings`, `/settings`, `/subscription-plans`, `/plans/{map,performance,all}`, `/map-pro-oto` | Facturación Stripe, planes, oferta OTO |

### Feature flags por plan (observado en `/user-permissions/get-all`)
Útil como plantilla para nuestros planes:
`isActionsAllowed, isAnalyticsAllowed, isForecastAllowed, dateCompareFilterAllowed, peopleCompareFilterAllowed, pathExplorationAllowed, peopleFilterAllowed, trafficModeAllowed, widgetsAllowed, peopleDataExportAllowed, peopleCsvExportAllowed, gohighlevelIntegrationAllowed, hubspotIntegrationAllowed, webhookIntegrationAllowed, zapierIntegrationAllowed, calendarTrackingAllowed, dealTrackingAllowed, formTrackingAllowed, purchaseTrackingAllowed, notesAllowed, checklistAllowed, viewOnlyAllowed, pngExportAllowed, iconsAllowed, reportsAllowed, aiInsightsAllowed, unlockCanvasAllowance, dataRetention (meses), customActionsAllowed, isReadonlyAccess, isCollaborator`.

---

## 4. Modelo de datos

### 4.1 Entidades del backend (observadas por endpoints)

| Entidad | Endpoints clave | Notas |
|---|---|---|
| `user` | `/users`, `/auth`, `/auth/google-sso`, `/refresh-token`, `/users/cancel`, `/users/upgrade` | JWT con refresh |
| `project` (= workspace) | `/projects`, `/projects/{id}/api-key`, `/projects/lock-selected`, `/projects/unlock` | Cada workspace tiene API key; se puede "bloquear" por límite de plan |
| `project-domains` / `project-ips` | `/project-domains`, `/project-ips`, `/project-ips/my-ip` | Dominios permitidos (cross-domain) e IPs excluidas del tracking |
| `project-clients` | `/project-clients`, `/project-clients/invite` | Acceso de clientes al workspace |
| `memberships` / `permissions` | `/memberships/memberships-with-permissions`, `/permissions/all` | Roles por workspace |
| `funnel` (= canvas) | `/funnels`, `/funnels/load/{id}`, `/funnels/set-access`, `/funnels/thumbnail`, `/funnels/import`, `/funnels/unlock` | Formato JSON:API; `is_private`, `is_locked`, `version` |
| `funnel-revision` | `/funnel-revisions`, `/funnel-revisions/upload/{id}`, `/funnel-revisions/funnel/{id}` | Historial de versiones; el contenido vive en S3 |
| `funnel-viewonly-link` | `/funnel-viewonly-links` | Enlace público con contraseña opcional |
| `library` | `/library`, `/library/funnel/{id}` | Plantillas (Vault) |
| `icons` | `/icons`, `/icons/signed/...` | Imágenes subidas por el usuario, URLs firmadas |
| `kpi-widgets` / `kpi-targets` | `/kpi-widgets/{ws}`, `/kpi-targets/{ws}` | `metric_type` (p. ej. HITS), `is_commerce`, `is_deal`, favoritos |
| `monitoring-reports` / `monitoring-views` | `/monitoring-reports`, `/monitoring-views/{id}` | Vistas guardadas del monitor |
| `insights-log` | `/insights-log/{ws}`, `/insights-log/signed-image-url/...` | Bitácora de cambios/insights con imágenes |
| `tags` | `/tags/project/{id}` | Etiquetas |
| Integraciones | `/facebook-ads-integration/*`, `/integrations/google-ads/*`, `/hubspot-integration/*`, `/highlevel-integration/*`, `/integrations/shopify/*`, `/integrations/crm-data/{id}` | Costo de anuncios y datos de CRM por nodo |
| Onboarding | `/onboarding-items`, `/featured-tutorials`, `/spotlight-features/latest`, `/signup-survey` | Gamificación por niveles |
| Billing | `/billing/portal`, `/billing/subscription-info`, `/memberships/stripe/schedules` | Stripe |

### 4.2 Documento del mapa (observado: JSON real del canvas tutorial)

```jsonc
{
  "version": 6,
  "objects": [ /* nodos */ ],
  "joints":  [ /* conexiones */ ],
  "notes": { "data": { /* Draft.js raw: blocks + entityMap (links, imágenes, video) */ }, "title": "...", "timestamp": "..." },
  "canvasChecklistData": { "items": [ { "text": "...", "checked": false, "items": [ /* anidados */ ] } ] },
  "funnelConfiguration": {
    "dateRange": { "min": "...", "max": "...", "selectedLabel": "Custom Range" },
    "compareDateRange": { ... },
    "filter": { "countries": [], "device": "all devices", "session": null, "contributionWindow": null },
    "compareFilter": { ... },
    "focusedSteps": [],
    "visibleDataLayers": { "numbers": false, "flow": false, "leadTime": false, "notes": false, "checklist": false, "forecasting": true },
    "dataMode": "DATA_MODE_FUNNEL",          // o DATA_MODE_TRAFFIC
    "previousFunnelData": { /* copia completa del estado anterior (undo) */ }
  }
}
```

**Nodo (`objects[]`)** — categorías vistas: `STEP` (tipos `SOURCE`, `PAGE`, `EVENT`, y `MISC`/offline en el código), `TEXT`, `SHAPE`, `PHOTO`, `WIDGET` (`WIDGET_FORECASTING`, `WIDGET_TRENDS`, `WIDGET_PEOPLE`, `WIDGET_COUNTRIES`, `WIDGET_COMPARE`).

```jsonc
{
  "ID": "uuid", "category": "STEP", "type": "SOURCE",
  "x": 2788.3, "y": -470.5, "scaleX": 1.29, "scaleY": 1.29,
  "label": "Google Ads",
  "url": "",                                   // PAGE: dominio + path que identifica la página
  "texturePath": "StepsModal/Sources/google.png",
  "filterData": [ { "key": "utm_source", "value": "adwords", "operator": "=" } ],   // SOURCE: regla de coincidencia
  "integrationType": "url-parameters",         // none | url-parameters | facebook-ad | hubspot | …
  "integrationAttributes": [],                 // p. ej. campañas/adsets/ads de Meta para traer el costo
  "actionType": "none",                        // EVENT: custom | commerce | …   (+ "actionName")
  "forecastingData": { "cost": 200, "numberOfPeople": 105.16, "period": 0, "calculationMethod": 2 },
  "forecastingCalculatedData": { "people": 3255, "cost": 6200 },
  "analyticsFilterData": { "dataFilter": [], "displayFilter": { "avgValuePerCustomer": true, "totalCustomers": true, "totalRevenew": true } },
  "notes": null, "checklistData": null          // notas y checklist por nodo
}
```

**Conexión (`joints[]`)**
```jsonc
{
  "ID": "uuid", "iconA_ID": "<nodo origen>", "iconB_ID": "<nodo destino>",
  "category": "CONNECTION",
  "lineType": "DOTTED",            // SOLID | DOTTED; una variante marca "is_no_data_line"
  "drawLineType": "BEZIER", "breakPoints": [],
  "headAVisible": false, "headBVisible": true,
  "ignoreInBetween": true,         // ¿cuenta A→B aunque haya pasos intermedios?
  "goal": null,
  "forecastingData": { "percent": 40 }   // tasa de conversión supuesta para el forecast
}
```

### 4.3 Catálogo de nodos (observado en `AssetsConfig.json`)
- **Sources (65):** Google/Google Ads, Bing/Microsoft Ads, Meta (Facebook/Instagram ad, post, story), YouTube (ads, serie), TikTok (orgánico/ads), LinkedIn, X, Pinterest, Reddit, Snapchat, Spotify, email, chatbot, afiliados, directorios, Yelp, Clutch, Google Maps, etc.
- **Pages (16):** blank, blog post, calendario, descarga, genérica, área de miembros, opt-in, order page, popup, sales page (con y sin video), encuesta, thank you, upsell/OTO, webinar en vivo y replay.
- **Actions (32):** custom, add tag, add to list, add to cart, aplicación, click, contacto, lead, popup, **purchase**, request contact/info, **schedule meeting**, **deal won/updated**, **GHL opportunity/won/order/appointment**, **HubSpot deal/won**, scroll, watch video, link click.
- **Offline (41):** llamada, SMS, WhatsApp-like (Telegram), reunión, Zoom, conferencia, correo directo, QR, valla, radio, TV, tarjeta de presentación, entrevista, y CRMs/herramientas (ActiveCampaign, Keap, Mailchimp, Pipedrive, Salesforce, Zapier, Slack…).

> Los íconos son propiedad de Funnelytics. Para DXW hay que dibujar o licenciar los nuestros (p. ej. Lucide + Simple Icons).

---

## 5. Cómo calcula los números

### 5.1 Forecasting (inferido de los datos guardados, alta confianza)
- **Source:** `numberOfPeople` por día × días del rango → personas. `cost` por día × días → costo. (Google Ads: 200/día × 31 días = 6.200 ✔.)
- **Conexión:** `percent` = % de personas del nodo origen que llegan al destino.
- **Nodo destino:** suma de lo que le llega por todas sus conexiones entrantes.
- **Evento commerce (Purchase):** personas × `avgRevenue` → ingresos (28 × 350 = 9.800 ✔).
- **Widget de forecasting:** totaliza costo, ingresos, gastos manuales (`manualExpenses`) → utilidad y ROI.
- `calculationMethod` sugiere al menos dos modos de entrada en Sources (por día vs total / por costo); hay un ligero desfase de redondeo en algunos nodos (3.255 vs 3.260 esperado). **Validar** al construir.

### 5.2 Analítica real (observado en el código del canvas)
1. El canvas toma todos los nodos `STEP` y las conexiones con ambos extremos.
2. Arma un **diccionario** `{nodeId: reglaDeCoincidencia}` y una lista de **conexiones** `{id, source, target, ignore_in_between, is_no_data_line}`.
3. Detecta ciclos en el grafo (modo embudo) y parte el grafo en lotes.
4. Envía cada lote a `POST analytics-api/canvas` con `{ filter: { range, countries, device, focus, canvas: {dictionary, connections}, funnelMode }, options }`.
5. En paralelo pide el costo de anuncios de Meta por nodo (`/facebook-integration/...`).
6. Une las respuestas y pinta: personas por nodo, flujo por conexión, lead time, ingresos.

Modos: **Funnel** (personas que siguen el camino dibujado) y **Traffic** (todo el tráfico que tocó cada paso). Extras: comparar rangos de fechas, enfocar pasos ("personas que pasaron por X"), explorador de tráfico (`/traffic-explorer` con parámetros de página y atributos de acción), lista de personas con export CSV (`/people`), sesiones individuales (`/sessions/single`), tendencias (`/widgets/trends`), países (`/profile-attributes`).

**Desconocido:** el motor que responde `/canvas` (probablemente SQL sobre una base columnar o Postgres particionado), cómo resuelve "ignore in between" y la ventana de contribución.

---

## 6. Tracking: cómo funciona `track-v3.js` (observado, código legible)

**Instalación:** `funnelytics.init(projectId, isSPA, deferredEvents, autoTrackingOptions, hashSetAttributeEmails)`.

**Ciclo de vida**
1. `GET /settings/{project}` al Cloudflare Worker → `{tracking, is_locked, dominios permitidos}`. Si 403 o bloqueado, no rastrea.
2. Filtro de bots en el navegador (user agent, tamaños de pantalla raros, patrón de bots de Facebook).
3. Si no hay sesión: `POST /sessions {project, page, device: mobile|desktop, metadata: fingerprint}` → `session`.
4. Cada vista de página: `POST /steps {project, session, page, referrer}` → `step` (id de la vista). En SPA el referrer es el paso anterior.
5. Eventos: `POST /events/trigger {project, session, step, name, attributes:{pagePath, domain, …}}` (usa `sendBeacon` cuando puede).
6. Identificar persona: `POST /trackers/set {project, session, info:{email,…}}`; ID interno: `POST /set-attributes {attributes:{internal_user_id}}`.

**Identidad**
- Cookie `_fs` (UUID de sesión) en el dominio raíz más alto posible, `SameSite=None; Secure`, vence en 2038; respaldo en `localStorage._fs`.
- **Cross-domain:** a los enlaces hacia dominios permitidos les agrega `?_fs=<session>&_fsRef=<origen>`; la página destino adopta esa sesión.
- Email opcionalmente con hash SHA-256 antes de enviarlo.

**Auto-tracking (opcional)**
| Evento | Qué captura |
|---|---|
| `Link Click` | URL sin query, texto, path, dominio |
| `Button Click` | `button`, `.btn`, `.flButton` |
| `Scroll` | umbrales 10/25/50/75/90 % |
| `Form Completed` | campos del formulario; con `anonymiseUsers` omite nombre, email y teléfono; nunca contraseñas |
| `Meeting Scheduled` | Calendly |
| `Video View` | YouTube, Vimeo, Wistia: play, pause, mute e hitos 10…100 % |

**Debilidades técnicas detectadas** (oportunidad para DXW)
- Todo es client-side: bloqueadores de anuncios y Safari ITP lo afectan; el filtro de bots es solo en el navegador.
- La sesión dura "para siempre" (cookie a 2038): mezcla visitante y sesión.
- Envío en `x-www-form-urlencoded` con `d=<json>`, sin firma: cualquiera con el project ID puede inyectar eventos.
- El bundle de producción apunta a un host `qa-ai-agent-api` para la IA.

---

## 7. Integraciones (observado)
Meta Ads (cuentas, campañas, adsets, anuncios, audiencias personalizadas, vista previa), Google Ads (clientes, top ads), HubSpot (deals), GoHighLevel (oportunidades, órdenes, citas), Shopify, Zapier, webhooks, Calendly, ThriveCart, Vidalytics, WordPress, Webflow, GTM. Stripe para cobro, FirstPromoter para afiliados, y ellos mismos usan el chat de LeadConnector (GoHighLevel).

---

## 8. Mercado, precios y competencia (investigación web)

Fuentes al final de cada punto. G2 y Capterra bloquearon el acceso directo; sus cifras vienen de terceros.

**Empresa.** Toronto, fundada ≈2018 por Mikael Dia; seed de 1,5 M CAD en 2020; 11–50 empleados. Muy ligada al ecosistema ClickFunnels / infoproductos / agencias. ([BetaKit](https://betakit.com/digital-marketing-startup-funnelytics-raises-1-5-million-cad-in-seed-funding/), [LinkedIn](https://www.linkedin.com/company/funnelytics-io))

**Planes actuales** ([pricing](https://funnelytics.io/pricing)):

| Plan | USD/mes | Qué incluye |
|---|---|---|
| Map Pro | 39 | Canvas, forecast, +100 plantillas, canvases y colaboradores ilimitados. Sin tracking |
| Performance Pro | 129 | Auto-tracking multi-dominio, formularios y calendarios, KPIs y alertas, Zapier/webhooks |
| Performance Business | 349 | Compras, deals, eventos custom, costo de anuncios, Vision AI, varios workspaces, integraciones nativas |
| Ecom Insights | ≈2.500 | Servicio con analista para Shopify |
| Performance Agency | 833 (9.999/año) | Workspaces de cliente ilimitados, certificación, resource hub. Visto dentro de la app; no aparece en la web pública |

Recorrido funcional completo de la app y el índice del manual oficial: [03-funcionalidades-y-manual.md](03-funcionalidades-y-manual.md).

No publican límites de eventos ni de retención (en el código vimos `dataRetention: 24` meses en la cuenta demo). En 2025 tenían planes de 199/499/999 USD; bajaron precios y separaron "mapa" de "datos".

**Funciones documentadas que no vimos en el código:** escenarios de forecast (conservador / esperado / mejor), Contribution Window (cohortes N días antes/después de un paso), Wildcards para agrupar URLs, split tests, reportes Executive y Contribution Impact, share link de tipo **"duplicar"** (quien lo abre clona el mapa), y webhook server-side `POST events.funnelytics.io/api/v1/webhook/{acción}` con `X-PROJECT-ID` + `X-API-KEY`; compras como `__commerce_action__` con `__total_in_cents__`, `__sku__`, `__order__`, `__currency__`. ([docs](https://docs.funnelytics.io/), [webhooks](https://docs.funnelytics.io/articles/send-webhook-events-to-funnelytics-2))

**Reputación:** Capterra 4,4 (31 reseñas), G2 4,2 (35), Trustpilot 3,2 (139, casi sin actividad reciente). ([Trustpilot](https://www.trustpilot.com/review/funnelytics.io))
- **Les gusta:** canvas fácil, ver flujo y caídas en una sola vista, forecast antes de invertir, útil para reportar a clientes de agencia.
- **Se quejan de:** integraciones bloqueadas hasta el plan de 349 USD, curva de aprendizaje del tracking, datos que "no cuadran" con el page builder, pérdida de trabajo en el canvas, soporte y reembolsos lentos, upsells agresivos, sin atribución de campañas.

**Competidores**

| Herramienta | En qué se diferencia |
|---|---|
| Geru | Mapa + simulador; fuerte en forecast, sin datos reales |
| FunnelFlux Pro | Tracker para media buyers con constructor visual; desde ≈99 USD/mes |
| Hyros | Atribución de ingresos y llamadas, precio a medida; sin canvas de planificación |
| Triple Whale | Atribución e-commerce Shopify, precio por GMV |
| Miro / Lucidchart / Whimsical | Diagramas genéricos, sin forecast ni datos |
| GA4 + Looker Studio | Gratis, pero sin mapa y con mucho setup |

**Hueco de mercado para DXW:** nadie combina *mapa de proceso + CRM + embudo web* para negocios de servicio (agencias, consultoras, clínicas, inmobiliarias). Funnelytics se fue hacia e-commerce/Shopify; Hyros y Triple Whale son de atribución pura.

**Dos datos sin verificar del agente de investigación** (no los confirmé en mi lectura):
- Menciona buckets S3 en `us-west-2`; yo observé el JSON del mapa en `ca-central-1`. Puede haber más de un bucket.
- Afirma que el listener de inputs envía el email aunque `anonymiseUsers` esté activo. Revisar antes de citarlo.

---

## 9. Evidencia
Guardada fuera del repo en el scratchpad de la sesión (puede borrarse al reiniciar):
`C:\Users\ASUS\AppData\Local\Temp\claude\76cf5e1247050719\a4b003d5-5901-4ecc-b6d7-4808a1de17de\scratchpad\rea\`
- `app-capture-evidence.json` — captura REA del dashboard (Evidence `ev_26d46009…`)
- `canvas-capture-evidence.json` — captura REA del canvas tutorial (Evidence `ev_88ea2192…`)
- `chunks/` (111 chunks del dashboard), `canvas-js/` (bundles del canvas), `canvas-bodies/` (respuestas de API y JSON del mapa)
- Análisis estático REA del bundle principal y el tracker: Evidence `ev_55f2756a…`

No se copió código de Funnelytics al repositorio. Este documento describe comportamiento; la implementación de DXW debe escribirse desde cero.
