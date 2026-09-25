# ProscOut

Hábitos del día, la semana, el mes y el año, con alimentación y plan de comidas. La base es SQLite: un solo archivo, sin servidor de base de datos aparte.

Elige según dónde la vayas a usar.

| | En tu máquina | Docker | Kubernetes |
|---|---|---|---|
| Para qué | Probar y desarrollar | Un contenedor que se lleva a otro equipo | Un clúster, con el archivo de la base guardado en un volumen |
| Comando | `npm run dev` | `docker build` y `docker run` | `kubectl apply -f k8s/proscout.yaml` |
| Datos | `prisma/dev.db` | El volumen `/data` | El PVC `proscout-data` |

La aplicación escucha en el puerto **3000**. Hace falta `DATABASE_URL`, `AUTH_SECRET` (una cadena larga y aleatoria) y, si entras por un nombre o una IP que no es localhost, `AUTH_TRUST_HOST=true`.

## En local

Hace falta Node 24.

```bash
npm ci
npx prisma migrate dev
npm run dev
```

Abre http://localhost:3000. El archivo de la base es `prisma/dev.db` (lo marca `DATABASE_URL` en `.env`).

`npm run build` y después `npm start` levantan la versión ya compilada, la misma que usa el contenedor.

## Docker

La imagen construye la aplicación, aplica las migraciones al arrancar y, si la base está vacía, carga las frases y los alimentos de BEDCA. Los productos de supermercado y sus precios no entran en ese primer volcado: viven en la base que ya tengas, o se generan con `scripts/mercados.py` y `scripts/precios.py`.

```bash
docker build -t proscout:local .
docker run --rm -p 3000:3000 \
  -e AUTH_SECRET="cambia-esto-por-un-secreto-largo" \
  -v proscout-data:/data \
  proscout:local
```

La base queda en `/data/proscout.db`, dentro del volumen `proscout-data`. Si borras el contenedor y conservas el volumen, las cuentas y los planes siguen ahí.

Para entrar desde otro dispositivo de la red, publica el puerto y usa la IP de la máquina. `AUTH_TRUST_HOST` ya va activo en la imagen.

## Kubernetes

El manifiesto `k8s/proscout.yaml` crea el namespace `proscout`, el secreto de `AUTH_SECRET`, un volumen de 1 Gi, un despliegue de una réplica y un Service en el puerto 80 que apunta al 3000 del contenedor.

SQLite solo admite un escritor. Por eso hay **una réplica** y el volumen es `ReadWriteOnce`. No subas el número de réplicas sin cambiar de base de datos.

1. Construye la imagen con el nombre que espera el manifiesto: `docker build -t proscout:local .`
2. Si el clúster no es el de tu máquina, súbela al registro y cambia el campo `image`.
3. Cambia `AUTH_SECRET` en el Secret antes de aplicar. No dejes el valor de ejemplo.
4. Aplica:

```bash
kubectl apply -f k8s/proscout.yaml
kubectl -n proscout port-forward svc/proscout 3000:80
```

Abre http://localhost:3000. La sonda de arranque mira `/login`.

El archivo de la base está en el volumen, en `/data/proscout.db`. Mientras el PVC exista, los datos sobreviven a un reinicio del pod.
