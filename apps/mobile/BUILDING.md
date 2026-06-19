# Building Kuest

## First-time EAS Setup
1. `npm install -g eas-cli`
2. `eas login` (use your Expo account)
3. `eas init` — creates the project in Expo dashboard, prints a projectId
4. Replace all `REPLACE_AFTER_RUNNING_eas_init` in app.json with the printed projectId
5. Replace `REPLACE_WITH_REAL_VALUE` in eas.json with actual Supabase values
   (or configure them as EAS Secrets: `eas secret:create`)

## Build Commands
- Dev build (simulator): `npm run build:dev`
- Preview (internal TestFlight): `npm run build:preview`
- Production: `npm run build:prod`

## OTA Updates (after first build is installed)
`npm run update -- "fix: description of change"`
