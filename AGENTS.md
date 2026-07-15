# Repository Guidelines

## Project Structure & Module Organization

This repository contains a React 19 frontend and Express backend in TypeScript. Frontend code lives in `src/`: reusable UI belongs in `src/components/`, shared models in `src/types.ts`, and global styles in `src/index.css`. `server.ts` defines API routes and serves the Vite client. Database access and the JSON fallback are in `server/db.ts`; `db.json` holds local data. Static files belong in `public/`, reference assets in `assets/`, and generated output in untracked `dist/`.

## Build, Test, and Development Commands

- `npm ci` installs the exact dependency versions from `package-lock.json`.
- `npm run dev` starts the Express server through `tsx` with Vite development middleware.
- `npm run lint` runs TypeScript type-checking without emitting files.
- `npm run build` builds the Vite client and bundles the server as `dist/server.cjs`.
- `npm start` runs the previously built production server.

Copy `.env.example` to `.env` and provide `GEMINI_API_KEY`. Set `DATABASE_URL` for PostgreSQL; leave it empty to use `db.json`.

## Coding Style & Naming Conventions

Use TypeScript and ES modules. Follow the existing two-space indentation, semicolons, and trailing commas in multiline expressions; preserve the surrounding file's quote style. Name React component files in PascalCase (`JobCard.tsx`), variables and functions in camelCase, and types in PascalCase. Keep shared API/UI types in `src/types.ts`. Use the `@/` alias when it improves readability. Run `npm run lint` before submitting.

## Testing Guidelines

No automated test framework or coverage threshold is currently configured. At minimum, type-check and build every change. Manually exercise affected UI flows and API endpoints with `npm run dev`. If adding tests, colocate frontend tests as `*.test.tsx` and backend tests as `*.test.ts`, and add the corresponding `npm test` script in the same change.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commit-style subjects such as `feat(jobs): add external URL support` and `refactor(filter): refine negative keywords`. Use an imperative, concise subject with an optional scope (`feat`, `fix`, `refactor`, `docs`, `test`). Pull requests should explain the problem and solution, identify configuration or data-model changes, link relevant issues, and include screenshots for visible UI changes. Report the commands used to verify the work.

## Security & Data

Never commit `.env`, API keys, database credentials, or production user data. Treat `db.json` as development-only state and exclude unrelated local mutations from commits.
