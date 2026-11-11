# PRISALYFront

## Arranque local con la API real

Dos terminales (en Git Bash: `cmd //c <archivo>.cmd`):

1. `PRISALY-Backend\iniciar-backend.cmd`: API en http://localhost:8080/api (no crea datos; usuarios de prueba locales en `bruno/scripts/m1-bruno-seed-local.sql`).
2. `PRISALY-Front\iniciar-frontend.cmd`: interfaz en http://localhost:4200.

La URL de la API está en `src/environments/environment.ts`. Todas las rutas del backend están en `src/app/core/api/catalog.ts` y todas las peticiones pasan por `ApiClient` (`src/app/core/api/api-client.service.ts`). El token del personal se guarda solo en memoria y nunca se envía a las rutas de estudiante.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
