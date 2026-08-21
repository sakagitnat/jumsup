# Jumsup architecture

## Source ownership

| Directory | Responsibility | Must not contain |
| --- | --- | --- |
| `src/app/` | Application orchestration, routing, event coordination | Question banks, database credentials |
| `src/components/` | Reusable presentation components | Supabase calls, feature policy |
| `src/features/<feature>/` | Screens and behavior owned by one feature | Unrelated feature behavior |
| `src/data/vocabulary/` | Bundled vocabulary fixtures | UI and persistence logic |
| `src/data/practice/` | Original practice-question packs | UI and persistence logic |
| `src/lib/` | Shared client services and pure utilities | Page markup |
| `src/styles/base/` | Shared tokens, layout, and components | Feature-only overrides |
| `src/styles/features/` | Styles owned by a feature | Global theme variables |
| `src/styles/themes/` | Light/dark theme overrides | Feature behavior |
| `functions/api/` | Server endpoints grouped by domain | Browser-only code |
| `functions/_lib/` | Server-only security and provider clients | UI code |
| `supabase/migrations/` | Ordered database changes | Application JavaScript |

## Dependency direction

`main -> app -> features/components -> lib/data`

Server functions and browser source are separate boundaries. Browser modules must
never import `functions/_lib`, service-role credentials, or Stripe secrets.

## Adding a feature

1. Create `src/features/<feature>/` with its renderer and feature-local helpers.
2. Add fixtures under `src/data/<domain>/` only when offline demo data is needed.
3. Put shared API calls in `src/lib/`; put privileged operations in `functions/api/<domain>/`.
4. Add feature CSS in `src/styles/features/<feature>.css` and import it from `src/styles/index.css`.
5. Register the route/action in `src/app/createApp.js`.
6. Run `npm run check` and `npm run build`.

## Compatibility facades

`src/data/defaultData.js` and `src/styles.css` intentionally remain small entry
points so older imports continue to work. They should not accumulate implementation.
