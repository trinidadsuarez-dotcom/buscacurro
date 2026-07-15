# TrabajoLocal

Bolsa de empleo especializada en marketing digital, copywriting, redacción web, social media, producción audiovisual y animación 2D/3D. Incluye perfiles de candidato y reclutador, seguimiento de candidaturas, adaptación de CV con Gemini e importación desde fuentes públicas.

## Desarrollo local

Requiere Node.js 20 o posterior.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

La aplicación se sirve en `http://localhost:3000`. `DATABASE_URL` activa PostgreSQL; si se deja vacío se utiliza `db.json`. `GEMINI_API_KEY` solo es necesaria para las funciones de IA. En producción es obligatorio definir un `APP_ACCESS_CODE` largo y aleatorio.

## Fuentes de empleo

La sincronización diaria utiliza feeds públicos documentados de Remotive, Jobicy, We Work Remotely y Remote OK. Las ofertas conservan la atribución y el enlace original. El backend descarta puestos fuera de los nichos admitidos y bloquea feeds de dominios no autorizados.

## Verificación

```bash
npm test       # pruebas de fuentes, relevancia y seguridad
npm run lint   # comprobación TypeScript
npm run build  # cliente y servidor de producción
```
