# Integración del CRM de DXW con DXW Funnel

**Para:** quien mantiene el CRM propio de DXW (corre en Neon).
**Qué hace:** el CRM envía un evento cada vez que algo cambia en un contacto o deal. DXW Funnel lo guarda y lo usa para mostrar, en cada mapa, cuántos contactos pasan por cada etapa, cuánto tardan y si cumplen el SLA, y compararlo con la simulación.

DXW Funnel **no necesita acceso a la base de Neon**. Solo recibe eventos.

## 1. Obtener la URL y el secreto
En DXW Funnel → workspace → **CRM** → *Crear conexión del CRM* (solo administradores). Copia:
- **URL del webhook:** `https://TU-DOMINIO/api/crm/ingest/<clave>`
- **Secreto:** guárdalo como variable de entorno del CRM (`DXW_FUNNEL_SECRET`). Nunca en el código ni en el navegador.

## 2. Enviar eventos
`POST <URL>` con `Content-Type: application/json` y el header `X-DXW-Signature: sha256=<hex>`, donde `<hex>` es el HMAC-SHA256 del **cuerpo exacto** con el secreto.

```json
{
  "events": [
    {
      "id": "evt_10234",
      "type": "stage_changed",
      "occurred_at": "2026-11-20T15:04:05Z",
      "contact": { "id": "c_881", "email": "ana@cliente.com", "source": "LinkedIn" },
      "pipeline": "Ventas",
      "stage": "Diagnóstico",
      "owner": "Comercial"
    }
  ]
}
```
También se acepta un solo evento sin el envoltorio `events`. Máximo 500 eventos y 1 MB por envío.

| Campo | Obligatorio | Notas |
|---|---|---|
| `id` | Sí | Único por evento. Si se reenvía, no se duplica |
| `type` | Sí | `lead_created`, `stage_changed`, `appointment`, `deal_won`, `deal_lost`, `payment` |
| `occurred_at` | Sí | ISO 8601 con zona horaria. No más de 1 día en el futuro |
| `contact.id` (o `contact_id`) | Sí | Id del contacto en el CRM. Es el que une los eventos de una misma persona |
| `contact.email` (o `contact_email`) | No | Se guarda **solo su hash SHA-256**, para unir con la web en la fase 4 |
| `contact.source` (o `source`) | No | Origen del lead: LinkedIn, Referido, Sitio web… |
| `pipeline` | No | Nombre del pipeline |
| `stage` | Solo en `stage_changed` | Nombre de la etapa a la que llega el contacto |
| `value`, `currency` | No | En `deal_won` y `payment` suman a ingresos |
| `owner` | No | Responsable |

### Cuándo enviar cada tipo
- **`lead_created`**: cuando entra un contacto nuevo. Incluye `source`.
- **`stage_changed`**: cada vez que un deal o contacto **llega** a una etapa del pipeline.
- **`appointment`**: cita o reunión agendada.
- **`deal_won` / `deal_lost`**: cierre del deal (con `value` en el ganado).
- **`payment`**: pago recibido (recompras, cuotas).

### Ejemplo en Node.js
```js
import crypto from "node:crypto";

const body = JSON.stringify({ events });
const signature = "sha256=" + crypto.createHmac("sha256", process.env.DXW_FUNNEL_SECRET).update(body).digest("hex");

const res = await fetch(process.env.DXW_FUNNEL_WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-DXW-Signature": signature },
  body, // el mismo texto que se firmó
});
```

### Respuestas
| Código | Significado | Qué hacer |
|---|---|---|
| 200 | `{ accepted, duplicates, rejected, errors }` | Revisa `errors` si `rejected > 0` |
| 400 | El cuerpo no es JSON | Corrige el formato |
| 401 | Falta la firma o no coincide | Firma el cuerpo exacto con el secreto vigente |
| 404 | Clave inválida o conexión desconectada | Revisa la URL |
| 413 | Más de 500 eventos o más de 1 MB | Envía lotes más pequeños |
| 5xx | Error temporal | Reintenta con espera; los `id` evitan duplicados |

## 3. Histórico
Para cargar meses anteriores: CRM → **Importar histórico (CSV)**, con las columnas `id, type, occurred_at, contact_id, contact_email, source, pipeline, stage, value, currency, owner`. Hay una plantilla descargable. Una consulta en Neon para exportar cambios de etapa podría ser:

```sql
-- Ajusta nombres de tablas y columnas a tu esquema.
select h.id as id, 'stage_changed' as type, h.changed_at as occurred_at, d.contact_id,
       c.email as contact_email, c.source, p.name as pipeline, s.name as stage,
       null as value, null as currency, u.name as owner
from deal_stage_history h
join deals d on d.id = h.deal_id
join contacts c on c.id = d.contact_id
join pipelines p on p.id = d.pipeline_id
join stages s on s.id = h.stage_id
left join users u on u.id = d.owner_id;
```

## 4. En el mapa
1. Selecciona un paso → **Datos reales (CRM)** → elige el evento (por ejemplo, *Llega a una etapa* y la etapa *Diagnóstico*).
2. Barra superior → **Simulación** activa → cambia la vista a **Real** o **Comparar**.
3. El período es el mismo horizonte de la simulación (últimos N días).

**Cómo se calcula:**
- **Personas de un paso:** contactos distintos con al menos un evento que cumple la regla en el período.
- **Tasa de una línea A → B:** contactos que llegaron a A y después a B, divididos entre los contactos de A. Ambos pasos deben estar conectados al CRM; una línea que pasa por un paso sin conexión (por ejemplo, una decisión) muestra "Sin datos".
- **Tiempo en el paso:** desde que el contacto llega hasta el siguiente paso conectado.
- **Fuera de SLA:** quienes superaron el SLA del paso, avanzaran o no.

## Seguridad
- La firma se verifica dentro de Postgres (`ingest_crm_events`). La app no usa claves de servicio.
- Si el secreto se filtra: CRM → **Rotar secreto** y actualiza la variable en el CRM.
- Pendiente: no hay límite de solicitudes por minuto en el webhook. Si se expone a mucho tráfico, conviene agregarlo en el proxy o en Vercel.
