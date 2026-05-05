# API SICAR -> Firebase

Esta carpeta deja lista la integracion para sincronizar los ingresos diarios de `CARNES AMPARITO` desde MySQL/SICAR hacia la coleccion `ingresos` de Firestore.

## Funciones creadas

- `syncSicarIngresosCarnesAmparito`
  - Callable Function para dispararla desde la app autenticada.
- `sicarIngresosApi`
  - Endpoint HTTP protegido por token para integraciones externas.

## Secrets y parametros

Antes de desplegar, configura:

```bash
firebase functions:secrets:set SICAR_DB_HOST
firebase functions:secrets:set SICAR_DB_USER
firebase functions:secrets:set SICAR_DB_PASSWORD
firebase functions:secrets:set SICAR_DB_NAME
firebase functions:secrets:set SICAR_INGRESOS_QUERY
firebase functions:secrets:set SICAR_SYNC_API_TOKEN
```

Los parametros no secretos ya tienen defaults:

- `SICAR_DB_PORT = 3306`
- `SICAR_BRANCH_ID = amparito`
- `SICAR_BRANCH_NAME = CARNES AMPARITO`
- `SICAR_TIMEZONE = America/Managua`

## Query esperada

`SICAR_INGRESOS_QUERY` debe devolver por lo menos:

- una fecha por fila: `date`, `fecha`, `sale_date`, `saleDate`, `dia` o `day`
- un monto por fila: `amount`, `monto`, `total`, `ingreso` o `importe`

La plantilla soporta estos placeholders:

- `{{startDate}}`
- `{{endDate}}`
- `{{branchName}}`

Ejemplo:

```sql
SELECT
  DATE(v.fecha) AS fecha,
  SUM(v.total) AS monto
FROM ventas v
WHERE DATE(v.fecha) BETWEEN {{startDate}} AND {{endDate}}
  AND v.sucursal = {{branchName}}
GROUP BY DATE(v.fecha)
ORDER BY DATE(v.fecha);
```

## Despliegue

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## Resultado en Firestore

La sincronizacion hace `upsert` por dia en `ingresos` con ids tipo:

```text
sicar_amparito_2026-05-04
```

Campos principales:

- `date`
- `month`
- `amount`
- `branch`
- `branchName`
- `source = "sicar"`
- `sourceSystem = "SICAR"`
- `syncKey`
- `syncedAt`
- `syncedBy`

Tambien guarda bitacora en `sicar_sync_logs`.
