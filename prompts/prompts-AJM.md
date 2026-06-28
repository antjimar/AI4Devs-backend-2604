# Prompts — Endpoints del Kanban de candidatos (LTI)

**Autor:** Antonio Jiménez Martínez (AJM)
**Asistente:** Claude Code
**Ejercicio:** AI4Devs — Módulo de Backend — Endpoints de LTI

> **Cómo trabajé:** por fases, con un punto de revisión antes de cada paso
> importante. Primero contexto en solo lectura, luego una propuesta que validé yo
> antes de tocar una línea de código, y después la implementación. Me apoyé en la IA
> para escribir el código, pero las decisiones de diseño (qué aplicación se actualiza,
> cómo se calcula la media, hasta dónde llega la entrega) las tomé yo. Estos son los
> prompts que usé, en orden y un poco destilados — no el volcado literal del chat.

---

## Fase 0 — Contexto (solo lectura)

```text
Estamos en el ejercicio de backend del máster: hay que crear dos endpoints para
manejar la lista de candidatos de una posición en una vista tipo Kanban
(GET /positions/:id/candidates y PUT /candidates/:id/stage). Antes de tocar nada,
explora el código del backend en solo lectura.

Necesito que entiendas:
- Cómo está montada la arquitectura (rutas, controllers, services, modelos).
- El schema de Prisma: qué relación hay entre Position, Application, Candidate,
  InterviewStep e Interview, y dónde vive el score.
- Qué endpoints existen ya y cómo se montan en index.ts.

Todavía no implementes nada. Solo dime cómo está el terreno.
```

**Por qué:** parto del estado real del repo, no de suposiciones. El punto clave es
entender que `Application` es la tabla que une posición + candidato + step, y que el
`score` cuelga de cada `Interview` — todo el ejercicio gira alrededor de eso.

---

## Fase 1 — Decisiones de diseño antes de implementar

```text
Antes de escribir código, cerremos las decisiones donde el enunciado es ambiguo.
Dame tu recomendación en cada una, no un menú de opciones:

1. PUT /candidates/:id/stage: un candidato puede tener varias aplicaciones. ¿Qué
   aplicación movemos de etapa? Yo lo veo con positionId en el body, para
   identificar la aplicación exacta sin ambigüedad.
2. GET /positions/:id/candidates: la "puntuación media del candidato", ¿es la media
   de las entrevistas de ESA aplicación (la de esta posición) o la global del
   candidato? Para una vista Kanban por posición, lo lógico es la de esa aplicación.
3. Alcance: el enunciado pide los 2 endpoints + el fichero de prompts. ¿Hasta dónde
   llevamos la entrega para que tenga calidad sin meter ruido?

Propón una propuesta completa (ficheros a tocar, forma de las respuestas, qué NO
vamos a hacer) y la reviso antes de que implementes nada.
```

**Por qué:** esta fase es la que de verdad puntúa. El enunciado deja huecos y lo que
se valora es el criterio para rellenarlos. Cerré: `positionId` en el body, media por
aplicación, y alcance = 2 endpoints + tests + Swagger, sin tocar schema ni meter
frontend.

---

## Fase 2 — Implementación de los endpoints

```text
Con las decisiones cerradas, implementa los dos endpoints respetando la
arquitectura por capas que ya hay (routes → controllers → services). Usa Prisma
directo en los services nuevos (el patrón de modelos-clase con findOne no encaja
para un findMany con includes).

GET /positions/:id/candidates
- Service positionService.getCandidatesByPosition(positionId).
- Valida que la posición existe (404 si no) y que el id es numérico (400).
- Por cada aplicación de la posición devuelve: candidateId, applicationId, nombre
  completo, currentInterviewStep { id, name } y averageScore (media de los score de
  las interviews de esa aplicación, ignorando los null; null si no hay ninguno).

PUT /candidates/:id/stage
- Body: { positionId, currentInterviewStep }.
- Service applicationService.updateCandidateStage(candidateId, positionId, stepId).
- Validaciones: id y campos numéricos (400); candidato existe (404); existe la
  aplicación de ese candidato+posición (404); el nuevo step pertenece al flujo de
  entrevistas de esa posición (400). Si todo va bien, actualiza currentInterviewStep.

Restricciones:
- No cambies el contrato de los endpoints existentes.
- No añadas dependencias nuevas.
- No toques el schema de Prisma ni las migraciones.
- Mantén el estilo y el formato del código que ya hay.
```

**Por qué:** doy el patrón exacto, los nombres, las validaciones y las fronteras que
no se tocan. Cuanto más explícito el prompt, menos sorpresas en el diff. La validación
de que el step pertenece al flujo de la posición es mía: evita mover a un candidato a
una etapa que no existe en su proceso.

---

## Fase 3 — Tests

```text
Añade tests con Jest (que ya está configurado con ts-jest). No metas supertest ni
ninguna dependencia nueva: testea los services mockeando @prisma/client, que es donde
vive la lógica.

Cubre:
- GET: posición inexistente (error), cálculo correcto de la media, que ignora los
  scores null, averageScore null cuando no hay scores, y lista vacía sin aplicaciones.
- PUT: 404 candidato inexistente, 404 sin aplicación, 400 step fuera del flujo, y el
  camino feliz (que llama a update con los datos correctos).

Corre los tests y el build (tsc --noEmit) y déjalos en verde.
```

**Por qué:** el material del máster insiste en que la red de tests es lo que te deja
delegar sin miedo. Mockear Prisma me da tests rápidos y aislados sin levantar la BD, y
sin ensuciar el package.json con dependencias nuevas.

---

## Fase 4 — Documentación Swagger

```text
El repo ya trae swagger-jsdoc y swagger-ui-express en dependencies pero no están
montados. Documenta los dos endpoints nuevos con anotaciones JSDoc en las rutas y
monta swagger-ui en /api-docs usando esas librerías que ya están (sin añadir nada).
Si faltan los @types, resuélvelo con un declare module local en vez de instalar
@types nuevos.
```

**Por qué:** aprovecho lo que el repo ya tiene en vez de sumar dependencias. El
`declare module` local evita meter dos devDependencies de tipos solo para que compile,
que es justo el tipo de ruido que el material de refactor marca como bandera roja.

---

## Fase 5 — Verificación end-to-end contra la base de datos

```text
Antes de dar por buena la entrega, levanta el entorno real y prueba los endpoints
de verdad, no solo con tests:

- Levanta Postgres con docker-compose, aplica las migraciones y carga el seed.
- Arranca el servidor y lanza curls contra los dos endpoints cubriendo el camino
  feliz y los errores (200, 400, 404).
- Para el PUT, comprueba además en la base de datos que el cambio se ha
  persistido de verdad (no solo que la respuesta sea 200).

Enséñame las respuestas y compáralas con lo que esperabas.
```

**Por qué:** los tests con Prisma mockeado validan la lógica, pero no que la consulta
real funcione contra Postgres. El material insiste en hacer una prueba del happy path
además de los tests; comprobar que el PUT persiste en la base de datos cierra el ciclo
y me da confianza de que el contrato responde como digo.

---

## Nota de transparencia sobre el proceso

- Flujo por fases con revisión previa a cada paso: no pasé a implementar sin cerrar
  antes las decisiones de diseño, y revisé el diff completo antes de plantear el commit.
- Entrega acotada por **foco**: se ciñe a lo pedido (2 endpoints + prompts), con tests
  y Swagger como apoyo de calidad, y deja fuera frontend, cambios de schema y
  dependencias nuevas.
- Verifiqué los endpoints end-to-end contra un Postgres real (no solo con tests):
  lancé curls del happy path y de los casos de error, y confirmé en la base de datos
  que el PUT persiste el cambio de etapa.
- Un detalle técnico que salió en los tests: con `target: es5`, extender `Error` rompe
  `instanceof`; lo arreglé con `Object.setPrototypeOf` en el constructor del error de
  dominio, que además era un bug real (el controller usa `instanceof` para elegir el
  código HTTP).
- **Deuda consciente acotada al alcance:** la actualización de etapa va en una
  transacción (Unit of Work) por seguridad; en cambio dejé sin tocar el patrón del
  repo base de instanciar `PrismaClient` en cada módulo (lo correcto sería una única
  instancia inyectada, pero cambiarlo tocaría una decena de ficheros del repo base y
  se sale de lo que pide el ejercicio).
