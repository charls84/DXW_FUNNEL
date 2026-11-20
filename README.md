# DXW Funnel

Herramienta interna de DOUX.WORK para mapear y simular procesos y embudos, los propios y los de clientes.

- **Stack:** Next.js 16 (App Router, Cache Components) · Supabase (Postgres, Auth con Google, RLS) · React Flow 13 · Tailwind 4 · Vitest
- **Estado:**
  - Fase 0 lista: login del equipo, workspaces, roles.
  - Fase 1 lista: editor de mapas con plantillas (base y propias de DXW), autoguardado, deshacer/rehacer, versiones, PNG, imágenes, íconos propios, capturas de páginas, tags y links de solo lectura con contraseña.
  - Fuera de la Fase 1: la captura **automática** de páginas desde su URL. Requiere elegir un servicio externo de screenshots o un worker propio.
- **Probar sin base de datos:** `npm run dev` y abrir http://localhost:3000/dev/canvas (editor) y http://localhost:3000/dev/shared (vista del cliente)

## Documentación
| Documento | Contenido |
|---|---|
| [docs/01-reingenieria-funnelytics.md](docs/01-reingenieria-funnelytics.md) | Arquitectura, datos y tracking de Funnelytics |
| [docs/02-diseno-dxw-funnel.md](docs/02-diseno-dxw-funnel.md) | Diseño de DXW Funnel, modelo de datos y roadmap |
| [docs/03-funcionalidades-y-manual.md](docs/03-funcionalidades-y-manual.md) | Recorrido funcional de Funnelytics y su manual oficial |
| [docs/04-setup-fase-0.md](docs/04-setup-fase-0.md) | Cómo configurar Supabase y Google para correr la app |

## Arranque rápido
```
npm install
cp .env.example .env.local   # completa los valores (ver docs/04)
npm run dev
```

## Estructura
```
src/
  proxy.ts                  refresca la sesión y redirige a /login
  app/login                 pantalla de entrada con Google
  app/auth/callback         intercambia el código OAuth y valida el dominio
  app/(app)/                zona autenticada: workspaces, mapas, configuración, equipo
  app/(editor)/canvas/[id]  editor de mapas a pantalla completa
  app/canvas-actions.ts     crear, guardar (con control de versión), versiones, tags, plantillas, links, íconos
  app/share-actions.ts      lectura pública de links compartidos (get_shared_canvas)
  app/s/[token]             vista de solo lectura para clientes (con contraseña opcional)
  app/dev/canvas            editor de prueba sin base de datos (solo desarrollo)
  components/canvas/        editor React Flow: nodos, líneas, panel de elementos, inspector
  lib/canvas/               catálogo de elementos, plantillas DXW y validación del documento
  lib/auth.ts               getCurrentMember(): sesión + dominio + membresía
  lib/permissions.ts        qué puede hacer cada rol
supabase/migrations/        esquema SQL con RLS
```
