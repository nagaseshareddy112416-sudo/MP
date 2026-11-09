# Changelog - MP-Web (Frontend)

All notable changes to the frontend Angular application will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-11-09 - Phase 3: Drawing and Upload Experience
### Added
- Redesigned Universal 4-Step GFC Upload Wizard (`UploadDrawingComponent`):
  - **Step 1: File Selection & Validation**: Drag-and-drop zone with MIME and extension checking (DXF, DWG, GeoJSON, PDF), file size inspection against 100MB threshold.
  - **Step 2: Drawing Information & Discipline**: Automatic category & sub-type detection from filenames, project naming, lifecycle stages (Concept to As-Built), and non-survey coordinate warnings.
  - **Step 3: Georeference & Spatial Pre-Validation**: Real-time pre-check against backend preview endpoint, detecting coordinate bounds, verifying projected CRS (EPSG:32644), checking for local grid (0,0) or far-away coordinates, and summarizing mapped CAD layers.
  - **Step 4: Quality Review & Submission**: Structured validation audit before submission, quality gates confirmation, Hangfire job queuing, and toast notifications.
- Enhanced Revision Approval Queue (`RevisionHistoryComponent`):
  - Prominent drawing deletion and purging with confirmation dialog to permanently remove drawings, revision history, extracted features, and clashes.
  - Quick-approval action to instantly activate drawings on the Master Plan.
  - Status indicators powered by Phase 2 design token badges.

### Verified
- `npx ng test --watch=false` passed 3 of 3 unit tests.
- `npx ng build --configuration production` succeeded with 0 errors and 0 warnings.
- `dotnet test` passed 23 of 23 unit & integration tests.

## [0.3.0] - 2026-11-09 - Phase 2: Premium Design System
### Added
- Complete Design Tokens (`src/styles/design-tokens.scss`) defining 4/8px spacing grid, typography scale (Inter, JetBrains Mono), border radii, elevation shadows, and engineering status colors (Compliant, Tolerance, Deviation, Missing, Extra, Clash).
- Theme Service (`ThemeService`) with reactive signal state for Light and Dark modes, system preference detection (`prefers-color-scheme`), and persistent storage.
- Global Command Palette (`CommandPaletteComponent`) triggered via `Ctrl+K` or header search, supporting keyboard navigation across all views, theme switching, and actions.
- Floating Toast Notification Stack (`ToastService` & `ToastContainerComponent`) with animated status alerts.
- Living Design System Showcase page (`/design-system`) demonstrating tokens, status badges, metric cards, buttons, category styling, and skeleton loaders.
- Modern application header with enterprise branding, workspace quick switcher pill, command trigger, theme toggle, and user profile menu.

### Verified
- `npx ng test --watch=false` passed 3 of 3 unit tests.
- `npx ng build --configuration production` succeeded with 0 errors and 0 warnings.

## [0.2.0] - 2026-11-09 - Phase 1: Stabilization
### Added
- Multi-stage production `Dockerfile` with Node.js 20 build and Nginx Alpine runtime.
- Nginx configuration (`nginx.conf`) supporting SPA routing (`try_files $uri /index.html`).
- GitHub Actions CI workflow in `.github/workflows/ci.yml` with automated test and production build checks.
- `src/environments/environment.example.ts` configuration template.
- Root documentation: `CHANGELOG.md`, `assumptions.md`, and `KNOWN_LIMITATIONS.md`.

### Fixed
- Fixed Vitest unit test runner initialization by correcting test target in `src/app/app.spec.ts` to `AppComponent` with router and HTTP testing providers.
- Fixed SSR/Node test environment `localStorage` crashes by implementing defensive storage checks in `auth.service.ts`.
- Fixed Windows drive letter casing issue during Vitest execution.
- Added 401 Unauthorized handling in `auth.interceptor.ts` to smoothly redirect expired sessions to the login view with return URL.

### Verified
- `npx ng test --watch=false` passed 1 of 1 test suites (100% pass).
- `npx ng build --configuration production` succeeded with bundle budget checks.

