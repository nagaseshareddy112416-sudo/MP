# Architecture & Technical Assumptions - MP-Web (Frontend)

This document tracks assumptions made in the architecture and implementation of the Angular web client.

## 1. Framework & UI Stack
- **Angular Version**: Angular 21 with standalone components, strict TypeScript, and Angular Signals.
- **Design System**: Angular Material integrated with custom CSS variables (design tokens).
- **Mapping Libraries**: OpenLayers (OL v10) for 2D mapping and CesiumJS for 3D visualization.
- **Coordinate Transformations**: Proj4js for client-side coordinate transformations and mouse coordinate display.

## 2. Storage & Sessions
- User session state (JWT token and user info) and selected workspace context are cached in `localStorage` with fallback handling for SSR / unit test environments.
- All HTTP requests automatically attach the Bearer token via `auth.interceptor.ts`. Expired tokens trigger navigation to `/login?expired=true`.
