# Setup de la Fase 0 (Supabase + Google)

Lo que hace falta configurar una sola vez para que DXW Funnel funcione con login real. Tiempo estimado: 15–20 minutos.

## 1. Crear el proyecto en Supabase
1. En https://supabase.com, crea un proyecto (por ejemplo `dxw-funnel`) en la región más cercana (São Paulo o us-east).
2. Ve a **Project Settings → API** y copia la **Project URL** y la **Publishable key**.

## 2. Crear las tablas
1. Abre **SQL Editor → New query**.
2. Ejecuta los archivos de `supabase/migrations/` **en orden**, uno por consulta:
   1. `20261120000000_fase0_base.sql` (equipo y workspaces)
   2. `20261120010000_fase1_canvases.sql` (mapas y versiones)
   3. `20261120020000_fase1_compartir_assets.sql` (links compartidos, plantillas DXW, íconos e imágenes)
   4. `20261120030000_fase3_crm.sql` (eventos del CRM y webhook firmado; ver [05-integracion-crm.md](05-integracion-crm.md))
   5. `20261120040000_papelera.sql` (papelera de 30 días para mapas; `purge_old_canvases()` para programar la limpieza)
3. Revisa que en **Table Editor** aparezcan `app_settings`, `organizations`, `members`, `workspaces`, `canvases`, `canvas_revisions`, `custom_icons`, `share_links`, `crm_connections` y `crm_events`, cada una con RLS activo.
4. Revisa que en **Storage** exista el bucket `canvas-assets` (público, 5 MB máximo por imagen).

> **Sobre el bucket público:** las imágenes de los mapas (íconos, capturas, imágenes) deben verse también en los links para clientes, por eso el bucket es público. Los nombres de archivo son aleatorios e imposibles de adivinar, pero cualquiera con la URL exacta de una imagen puede verla. No subas imágenes con datos sensibles.

> El dominio permitido está en `app_settings.allowed_email_domain` (`doux.work`). Si cambia, actualiza esa fila y `ALLOWED_EMAIL_DOMAIN` en `.env.local`.

## 3. Activar Google como proveedor
1. En Google Cloud Console, crea un **OAuth client ID** de tipo *Web application*.
   - **Authorized redirect URI:** `https://TU-PROYECTO.supabase.co/auth/v1/callback`
2. En Supabase, ve a **Authentication → Sign In / Providers → Google**, actívalo y pega el Client ID y el Client Secret.
3. En **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` en desarrollo (después, la URL de producción).
   - **Redirect URLs:** agrega `http://localhost:3000/auth/callback` y, más adelante, `https://TU-DOMINIO/auth/callback`.

## 4. Variables de entorno
Copia `.env.example` como `.env.local` y completa los valores:
```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
ALLOWED_EMAIL_DOMAIN=doux.work
```
`.env.local` no se sube a git.

## 5. Arrancar
```
npm install
npm run dev
```
Abre http://localhost:3000 y entra con tu cuenta @doux.work.
- **La primera persona que entra queda como administrador.** Entra tú primero.
- Las siguientes entran con solo lectura; el administrador les cambia el rol en **Equipo**.

## Cómo se controla el acceso
| Capa | Qué hace |
|---|---|
| Google (`hd=doux.work`) | Sugiere solo cuentas del dominio. Es una pista, no una barrera |
| `/auth/callback` | Si el correo no es @doux.work, cierra la sesión y muestra el error |
| Trigger `handle_new_user` | Solo crea membresía para correos del dominio |
| `getCurrentMember()` | Cada página y acción verifica sesión, dominio y membresía |
| RLS en Postgres | Sin membresía no se lee ni se escribe nada, aunque alguien use la API directamente |

Refuerzo opcional: en Supabase → **Authentication → Hooks**, un *Before user created hook* puede rechazar correos fuera del dominio antes de crear el usuario.

## Probar el editor sin Supabase
En desarrollo (`npm run dev`) existen dos rutas de prueba. Guardan en el navegador (localStorage), no tocan la base de datos y en producción responden 404:
- **http://localhost:3000/dev/canvas**: el editor con la plantilla "Proceso comercial DXW". Las imágenes se guardan como data URL, hasta 280 KB.
- **http://localhost:3000/dev/shared**: ese mismo mapa como lo vería un cliente en un link de solo lectura.

## Links de solo lectura
- Se crean desde el editor con **Compartir**. Pueden tener contraseña (bcrypt en Postgres), vencimiento (7, 30 o 90 días, o nunca) y, opcionalmente, notas y checklists. Por defecto no los incluyen, porque suelen tener comentarios internos.
- El cliente abre `https://TU-DOMINIO/s/<token>` sin cuenta. La función `get_shared_canvas` valida el token, el vencimiento y la contraseña, y quita las notas cuando corresponde.
- **Pendiente:** no hay límite de intentos de contraseña. Si un link con contraseña se comparte ampliamente, conviene desactivarlo y crear uno nuevo.

## Comandos útiles
| Comando | Para qué |
|---|---|
| `npm run dev` | Desarrollo local |
| `npm run build` | Build de producción |
| `npm run typecheck` | Genera tipos de rutas y revisa TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Tests unitarios (Vitest) |
