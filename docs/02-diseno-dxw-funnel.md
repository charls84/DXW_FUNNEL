# DXW Funnel — diseño propuesto (v3)

**Fecha:** 19 nov 2026 · **v2:** ajustado con el recorrido de la app y el manual oficial. **v3:** aplicadas las 4 decisiones de Carlos (§10).
**Base:** [01-reingenieria-funnelytics.md](01-reingenieria-funnelytics.md) (arquitectura, datos y tracking) y [03-funcionalidades-y-manual.md](03-funcionalidades-y-manual.md) (funciones y manual).
**Objetivo de negocio:** una sola herramienta para (1) mapear y medir los procesos comerciales y operativos de DOUX.WORK y (2) montar, medir y presentar embudos a clientes, cada cliente con su propio acceso.

Todo en este documento son **decisiones de diseño**. Lo que viene de Funnelytics está referenciado a los documentos 01 y 03.

---

## 1. Posicionamiento

- **Herramienta interna de DXW.** La usa solo el equipo de DOUX.WORK. Los clientes no tienen login; ven los mapas por links de solo lectura o en reportes.
- **Dos usos:** (1) mapear y medir el proceso comercial y operativo de DXW; (2) que el equipo arme, proyecte y presente funnels de clientes dentro de workspaces por cliente.
- **Lo que evita pagar:** Funnelytics Performance Agency, 9.999 USD/año (doc 03 §2).
- **Fuente de datos principal:** el **CRM propio de DXW** (§6.5), no un CRM de terceros.
- **Futuro, no en este alcance:** venderlo como SaaS. El modelo `organizations` lo deja posible sin rehacer nada.

## 2. Qué tomamos, qué mejoramos, qué agregamos

| Tema | Funnelytics (observado) | DXW Funnel |
|---|---|---|
| Producto | Dashboard + canvas legado en otra pestaña + tracker | **Una sola app**; el canvas vive dentro del workspace |
| Tipos de mapa | Embudo de marketing | **Embudo** y **Proceso** (etapas, responsable, SLA, herramienta) |
| Biblioteca de elementos | Sources, Pages, Actions, Offline, íconos propios | Lo mismo, más nodos de **proceso** (Etapa, Tarea, Decisión, Traspaso) y **CRM** (Oportunidad, Cita, Deal ganado/perdido) |
| Regla de un nodo | "Personas que [vinieron / no vinieron] de…" con operadores `= ≠ contiene no-contiene > <` | Misma idea, más operadores `empieza con`, `existe` y comodines `*` / `**` en URLs |
| Líneas | Directa, Indirecta (skip steps), Sin datos | Igual, con la ventana de tiempo de la indirecta configurable y explícita |
| Forecast | Nodos raíz: período + 2 de 3 inputs; % por línea; widget con gastos y ROI | Igual, más **escenarios** (conservador / esperado / optimista), **Goals** con valor y **forecast vs real** en el mismo nodo |
| Datos | Pixel + webhooks; integraciones solo en el plan de 291–349 USD | **CRM propio de DXW como fuente principal** + pixel web + webhooks |
| Confianza en números | Queja: "no cuadra con mi page builder" | Cada número abre **la regla que lo produjo y la lista de personas** |
| Colaboración | Un rol (lectura y escritura) sobre todo el workspace | Equipo DXW con roles admin / editor / viewer |
| Compartir | Copiar a mi cuenta, solo lectura (con contraseña) | Solo lectura con contraseña y vencimiento, para presentar a clientes; duplicar como plantilla interna |
| Reportes | Frames sobre el canvas → reporte | Frames → **PDF y link**, con resumen escrito por IA y envío programado |
| Vista de agencia | Workspace Overview (On track / Off pace / Critical) | Igual, desde la fase 5 |
| IA | Vision AI sobre la página visible | Insights con Claude sobre mapa + datos + forecast ("dónde se cae y qué probar") |

---

## 3. Stack recomendado

| Capa | Elección | Por qué |
|---|---|---|
| App web | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** | Un repo para UI, API y endpoint de tracking |
| Canvas | **React Flow (`@xyflow/react`)** | Nodos y líneas como componentes, menús contextuales, minimapa, selección múltiple, atajos |
| Texto enriquecido | Tiptap | Notas de canvas y de nodo (H1–H3, listas, links, imagen, video) |
| Base de datos y auth | **Supabase** (Postgres + Auth + Storage + RLS) — *o* **Neon** (por decidir) | Supabase trae auth y storage listos. Neon alinea con el CRM (mismo proveedor, lectura cruzada sencilla) pero requiere sumar auth (Auth.js / Neon Auth) y storage (Vercel Blob o S3) |
| Miniaturas de páginas | Servicio de screenshot (Playwright en un job) | "Crear miniatura desde URL" como Funnelytics |
| Ingesta de eventos | Route handler Edge → Postgres particionado por mes | Simple al inicio; migrar a ClickHouse/Tinybird si se superan ~50 M hits/mes |
| Jobs | Supabase cron / Vercel cron | Rollups, sincronizar CRM y costo de anuncios, envío de reportes |
| PDF | React-PDF o Playwright | Reportes por Frames |
| Auth | Supabase Auth con Google, restringido al dominio de DXW | Solo el equipo entra; sin registro abierto |
| IA | Claude API | Insights y redacción de reportes |
| Hosting | Vercel + Supabase | Ya conectados en este entorno |

---

## 4. Modelo de datos (Postgres)

```text
organizations         id, name, created_at                     -- una sola fila (DXW); deja abierta la opción SaaS
workspaces            id, organization_id, name, type(client|internal), main_url, timezone, currency,
                      tracking_key, tracking_enabled, data_region(us|eu), auto_tracking jsonb,
                      script_installed_at, domains_verified, rate_limit_enabled, is_locked, logo_url,
                      crm_account_ref null                       -- id del cliente/cuenta en el CRM de DXW
members               user_id, organization_id, role(admin|editor|viewer)
workspace_domains     workspace_id, domain, verified_at
workspace_ip_excludes workspace_id, ip_cidr, label

canvases              id, workspace_id, name, kind(funnel|process), tags text[], is_template,
                      template_category(strategy|performance|process), is_locked,
                      current_revision_id, thumbnail_path, created_by, updated_at, deleted_at
canvas_revisions      id, canvas_id, doc jsonb, created_by, created_at, note        -- historial con Restore
share_links           id, canvas_id, token, password_hash, expires_at, show_data bool   -- solo lectura, para clientes
custom_icons          id, workspace_id, category(source|page|action|offline|process), path, name

-- Tracking (alto volumen)
visitors              id uuid, workspace_id, first_seen, person_id null
sessions              id uuid, workspace_id, visitor_id, started_at, device, country,
                      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                      fl_params jsonb, referrer, landing_url
hits                  id, workspace_id, session_id, visitor_id, ts, kind(page|event),
                      host, path, query jsonb, name, props jsonb, revenue_cents bigint null
                      -- PARTITION BY RANGE(ts) mensual
people                id, workspace_id, email_hash, external_ids jsonb, traits jsonb

-- CRM, comercio y costos
crm_events            id, workspace_id, person_id, source(dxw_crm|stripe|calendly|webhook|manual),
                      kind(opportunity_stage|deal_won|deal_lost|appointment|order|payment|form),
                      pipeline, stage, value_cents, ts, raw jsonb, dedupe_key unique
ad_costs              workspace_id, platform, campaign_id, adset_id, ad_id, date, spend_cents, clicks, impressions

-- Medición y reporte
kpis                  id, workspace_id, name, category(financial|conversion|page|custom),
                      metric, filters jsonb, is_favorite
kpi_targets           id, kpi_id, target, threshold, period(day|week|month)
reports               id, workspace_id, canvas_id, frames jsonb, period, summary_md, pdf_path,
                      schedule(cron) null, recipients text[]
insights_log          id, workspace_id, canvas_id null, title, body_md, image_paths text[], ts
integrations          id, workspace_id, provider, status, tokens_encrypted, settings jsonb
```

---

## 5. Documento del canvas (`canvas_revisions.doc`)

```jsonc
{
  "schema": 1,
  "nodes": [{
    "id": "uuid",
    "kind": "source|page|action|offline|stage|task|decision|handoff|text|shape|image|frame|widget",
    "icon": "google-ads", "label": "Google Ads", "position": {"x": 0, "y": 0}, "size": {"w": 80, "h": 80},
    "thumbnailUrl": null,                                    // páginas: miniatura desde URL
    "match": {                                               // §6.1
      "polarity": "include|exclude",                         // "vinieron / no vinieron", "completaron / no completaron"
      "source": "url_params|direct|referrer|page_url|event|crm|ad_platform|manual",
      "rules": [{"key": "utm_source", "op": "eq|neq|contains|not_contains|gt|lt|starts_with|exists", "value": "google"}],
      "url": "doux.work/agenda/**"                           // páginas, con comodines
    },
    "forecast": {                                            // §6.3; solo nodos raíz llevan inputs de volumen
      "period": "day|week|month|fixed",
      "inputs": "people_spend|people_cpp|spend_cpp",
      "people": 100, "spend": 200, "costPerPerson": null,
      "avgValue": 350                                        // acciones de compra o deal
    },
    "goal": {"valuePerPerson": 27},                          // Goals
    "process": {"ownerId": null, "slaHours": 24, "tool": "CRM DXW"},
    "notes": "markdown", "checklist": [{"text": "", "done": false, "children": []}],
    "style": {}
  }],
  "edges": [{
    "id": "uuid", "source": "nodeA", "target": "nodeB",
    "type": "direct|indirect|visual",                       // §6.2
    "indirectWindowDays": null,                              // null = rango de fechas completo
    "forecast": {"rate": 0.4},
    "goal": null, "style": {"curve": "bezier|straight", "label": null}
  }],
  "widgets": [{"id": "uuid", "kind": "forecast|trends|people|countries|goals", "position": {}, "config": {}}],
  "frames": [{"id": "uuid", "name": "Resumen ejecutivo", "rect": {}, "locked": false}],
  "notes": "markdown", "checklist": [],
  "settings": {
    "dateRange": "last_30d", "compare": null,
    "dataView": "traffic|funnel",
    "filters": {"country": [], "device": "all", "performed": {"nodes": [], "join": "and|or"}, "contributionWindow": null},
    "layers": ["numbers", "flow", "leadTime", "forecast", "notes", "checklist"],
    "scenario": "expected"
  },
  "scenarios": {"conservative": {"rates": {}, "inputs": {}}, "optimistic": {"rates": {}, "inputs": {}}}
}
```

---

## 6. Reglas de negocio clave

### 6.1 Coincidencia de nodos
- **Source:** parámetros de URL de la *sesión* (UTM o `fl_*`), referrer o tráfico directo. `exclude` invierte la regla.
- **Page:** host + path con comodines; los query params de la URL pegada se vuelven reglas AND.
- **Action:** nombre del evento + reglas sobre sus propiedades (Attribute Explorer muestra los valores vistos).
- **CRM:** pipeline + etapa del CRM propio de DXW, cita agendada, deal ganado/perdido (§6.5).
- **Manual:** sin datos; solo forecast (útil para procesos internos y offline).

### 6.2 Conexiones
- **Directa:** B es el siguiente paso de A en la misma sesión.
- **Indirecta:** la misma persona hizo A y después B dentro del rango (o de `indirectWindowDays`).
- **Visual:** sin datos.
- **Etiqueta:** `Rate %` = personas(A→B) / personas(A), y `People`. El denominador queda explícito (Funnelytics no lo documenta).

### 6.3 Forecast
- **Nodos raíz:** período y dos de tres inputs (personas, gasto, costo por persona); el tercero se calcula. El período se convierte a días según el rango (mes = 30 días, como Funnelytics).
- **Nodos no raíz:** Σ(personas de cada entrada × rate). En ciclos, cortar y avisar.
- **Ingresos y metas:** ingresos = personas × `avgValue`; goals = personas × `valuePerPerson`.
- **Widget:** personas, conversiones, compras, ingresos, gastos (de nodos + manuales), utilidad, ROI.
- **Escenarios:** sobrescriben rates e inputs; el widget los muestra lado a lado.
- **Forecast vs real:** cuando hay datos, cada nodo muestra los dos y el desvío.

**Implementado (Fase 2, 20 nov 2026):** motor en `src/lib/forecast/engine.ts`.
- **Escenarios:** factores globales del mapa (por defecto conservador: tasas ×0,8 y volumen ×0,9; optimista: tasas ×1,2 y volumen ×1,1) o valores propios por línea. Ninguna tasa pasa de 100 %.
- **Ciclos:** las líneas que cierran un ciclo no suman personas y se avisa en el resumen.
- **"Ventas":** cuenta a las personas que llegan a pasos con ingreso por persona; una recompra cuenta como otra venta.
- **Pendiente:** forecast vs real, que llega con los datos del CRM (Fase 3).

### 6.4 Modos de vista
- **Traffic:** cada nodo cuenta a todas las personas que cumplen su regla.
- **Funnel:** solo personas que recorrieron los caminos dibujados.
- Ambos con filtros (país, dispositivo, "personas que hicieron X" con AND/OR), comparación de periodo o segmento con semáforo (umbrales configurables) y Contribution Window.

### 6.5 Integración con el CRM propio de DXW
DXW tiene un CRM construido en casa. Es la fuente principal de datos del proceso comercial.
- **Contrato mínimo que necesitamos del CRM:** un evento por cada cambio relevante (lead creado, cambio de etapa, cita, propuesta enviada, deal ganado/perdido, pago) con `contact_id`, `email` (para unir con la web), `pipeline`, `stage`, `value`, `occurred_at`, `owner_id` e `id` único.
- **Opción A (preferida): webhooks** del CRM a `POST /api/ingest/crm`, firmados con HMAC → `crm_events`. Desacoplado y en tiempo casi real.
- **Opción B: lectura directa** de la base del CRM (vista o réplica de solo lectura) con un job cada 15 min. **El CRM corre en Neon (Postgres)**, así que esta opción es viable: un rol de solo lectura en Neon con vistas de `contactos`, `oportunidades` y `cambios de etapa`. No requiere tocar el código del CRM.
- **Backfill:** importación inicial del histórico (CSV o API) para tener datos desde el primer día.
- **Mapa ↔ CRM:** al configurar un nodo de tipo CRM, el panel lista pipelines y etapas reales del CRM. El lead time entre etapas y el SLA del nodo salen de `occurred_at`.
- **Unión con la web:** si el formulario del sitio manda el `dxw_vid` del visitante al CRM (campo oculto), se une el recorrido web con el contacto. Es lo mismo que Funnelytics hace con GHL (doc 03 §3.7).

**Implementado (Fase 3, 20 nov 2026):** opción A (webhook firmado) más importación CSV; contrato en [05-integracion-crm.md](05-integracion-crm.md).
- **La firma se verifica en Postgres** (`ingest_crm_events`, pgcrypto). No se usa clave de servicio.
- **Motor** de datos reales en `src/lib/crm/actuals.ts`: contactos por paso, tasas A→B, mediana de días entre pasos, tiempo en el paso y SLA.
- **Período de los datos reales:** el mismo horizonte de la simulación.
- **Pendiente:**
  - La opción B (lectura directa de Neon) queda descartada mientras el webhook funcione.
  - Límite de solicitudes por minuto en el webhook.
  - Las líneas que pasan por pasos sin conexión al CRM muestran "Sin datos".

---

## 7. Tracker `dxw.js`
Mismo contrato funcional que Funnelytics (doc 01 §6), con estas diferencias:
- `dxw('init', 'WORKSPACE_KEY', {spa, autoTrack: {links, buttons, forms, scroll, video, calendly}, anonymize})`; `dxw('track', name, props)`; `dxw('identify', {email})` con hash SHA-256.
- Cookies `dxw_vid` (visitante, 365 días) y `dxw_sid` (sesión, 30 min). Cross-domain con el parámetro `dxw_x`, solo hacia `workspace_domains`.
- Endpoint `POST /t` por lotes con `sendBeacon`, validación de `Origin`, rate limit, filtro de bots en servidor y exclusión de IP.
- Webhook firmado `POST /api/ingest/:workspaceKey/:event`. Compras en centavos con `dedupe_key` para evitar duplicados (Funnelytics los rechaza por `dateTime`).
- En formularios, el script rellena un campo oculto `dxw_vid` para que el CRM propio lo guarde con el contacto (§6.5).
- Página de verificación de instalación en Settings (Funnelytics lo hace por consola).

---

## 8. Roadmap (v3: uso interno, CRM propio antes que la web)

| Fase | Entregable | Resultado para el negocio | Esfuerzo |
|---|---|---|---|
| **0. Base** | Next.js + Supabase, login con Google del dominio DXW, workspaces (interno / por cliente), roles admin / editor / viewer, RLS, settings | El equipo entra y organiza su trabajo | 1 sem |
| **1. Canvas** | React Flow; biblioteca de elementos (embudo, offline, **proceso**, CRM) e íconos propios; texto, formas, imagen; líneas directa / indirecta / visual; notas y checklist (canvas y nodo); miniatura desde URL; historial con Restore; tags; PNG; link de solo lectura con contraseña; plantillas **Proceso comercial DXW** + Strategy | El proceso comercial de DXW queda mapeado y versionado | 4 sem |
| **2. Forecast** | Inputs en nodos raíz (período + 2 de 3), rates, Goals, widget con gastos / utilidad / ROI, escenarios | Metas comerciales de DXW y proyecciones para propuestas | 2 sem |
| **3. CRM propio** | Ingesta de eventos del CRM de DXW (webhooks o lectura directa), backfill, nodos de etapa con datos reales, lead time y SLA, forecast vs real | **El proceso comercial de DXW medido con números reales** | 2–3 sem |
| **4. Datos web** | `dxw.js`, ingesta, unión web ↔ CRM por `dxw_vid`, Traffic / Funnel, Explorer, panel de personas, filtros, comparación, Contribution Window | Fuentes y páginas que alimentan el pipeline | 5–6 sem |
| **5. Seguimiento** | KPIs + targets + alertas, vista general de workspaces, reportes por Frames (PDF + envío programado a clientes), Insights Log, IA con Claude | Reporte recurrente sin trabajo manual | 3–4 sem |

Esfuerzos para 1 desarrollador full-stack con Claude Code; son orden de magnitud, no compromiso.

**MVP: fases 0 + 1 + 2 (≈7 semanas) = diagramas y simulaciones.** Prioridad confirmada por Carlos: crear flujos y simularlos (forecast/escenarios) sin depender de datos. La fase 3 (CRM propio) **no bloquea el MVP** y se programa cuando haga falta medir con datos reales.

### Criterios de "listo" del MVP
- Un miembro del equipo entra con su cuenta Google de DXW; alguien de fuera no puede entrar.
- El proceso comercial de DXW está mapeado de punta a punta desde la plantilla, con responsable y SLA por etapa.
- Un funnel de cliente de 15 nodos se arma en menos de 10 minutos desde una plantilla.
- El forecast reproduce el ejemplo del demo de Funnelytics: 200 USD/día × 31 días = 6.200 USD; 28 compras × 350 USD = 9.800 USD.
- Un link de solo lectura con contraseña abre el mapa sin login, y el PNG se exporta.

### Primer mapa: proceso comercial de DXW (borrador a validar)
Hipótesis de etapas, sin confirmar; hay que reemplazarlas por las etapas reales del CRM de DXW:
`Fuente (referido, LinkedIn, web, evento)` → `Lead` → `Conversación inicial` → `Diagnóstico` → `Propuesta enviada` → `Negociación` → `Cierre (ganado / perdido)` → `Onboarding` → `Implementación` → `Seguimiento / recompra`.
Cada etapa lleva responsable, SLA, herramienta y checklist. El forecast parte del volumen mensual de leads por fuente.

---

## 9. Riesgos y cuidado legal
- **No copiar** código, íconos, plantillas, textos ni marca de Funnelytics. Íconos propios (Lucide + Simple Icons, con sus licencias) y plantillas escritas por DXW.
- **Privacidad:** el tracker procesa datos de visitantes de clientes. Hacen falta política de datos, aviso de cookies, DPA por cliente y región EU si hay clientes europeos.
- **Volumen:** planear la salida a una base columnar antes de decenas de millones de hits al mes.
- **Ad blockers:** opción de servir `dxw.js` y `/t` desde un subdominio del cliente (CNAME).

## 10. Decisiones tomadas (19 nov 2026, Carlos)

| Decisión | Elección | Efecto en el diseño |
|---|---|---|
| Alcance | **Solo uso interno de DXW** | Sin portal ni login de clientes, sin Stripe ni registro abierto; los clientes reciben links de solo lectura y reportes |
| Primer caso de uso | **Proceso comercial de DXW** | La plantilla inicial es el proceso comercial; el MVP se valida con el propio equipo |
| CRM | **CRM propio de DXW** | Integración a medida (§6.5); la fase CRM va antes que el tracking web |
| Nombre | **DXW Funnel** | Se mantiene |

### Información del CRM propio (para la fase 3, no bloquea el MVP)
1. Base de datos: **Neon (Postgres)** — confirmado.
2. ¿Tiene API o puede emitir webhooks? (si no, se usa lectura directa en Neon)
3. ¿Qué pipelines y etapas usa hoy el proceso comercial?
4. ¿Guarda el origen del lead (UTM, referido, canal)?
