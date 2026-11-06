# GFC Upload Engine — Frontend (Angular)

Generic, multi-workspace GIS platform for construction drawings: roads (by chainage), buildings, bridges, and underground utilities.

## Tech Stack
- Angular 21 (Standalone Components)
- Angular Material
- OpenLayers (`ol`) for interactive web GIS mapping
- TypeScript

## Prerequisites
- Node.js (v20+ / v22+ / v26+)
- npm (v10+)
- Backend API running on `http://localhost:5000/api`

## Environment Configuration
The frontend reads the backend API URL and base map tile endpoints from `src/environments/environment.ts`. An example template is provided in `src/environments/environment.example.ts`.

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  ...
};
```

> **Base Map Note**: Free public tile servers (OpenStreetMap and Esri World Imagery) have usage limits and terms, and must be replaced with a licensed or self-hosted provider (e.g. MapTiler, Mapbox, or self-hosted tile server) for production deployment.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Run Development Server**:
   ```bash
   npm start
   ```
   Open `http://localhost:4200` in your browser.

3. **Production Build**:
   ```bash
   npm run build
   ```

## Application Features
- **OpenLayers GIS Map**: Base map switcher (Street OSM / Satellite / None), scale bar, mouse coordinate display (Lon/Lat), auto-fit extent.
- **Multi-Workspace Selector**: Select from workspaces or create new project workspaces with custom EPSG and coordinate centers.
- **Dynamic GFC Drawing Upload Form**: Dynamically rendered form fields based on selected category (Road chainage, Utility depth/diameter, Building footprint).
- **Level 1 Pinning**: Manual click-to-pin placement for PDFs and drawings without native georeferencing.
- **Revision Control & Approvals**: Review queue for Reviewers and Workspace Admins with comments and audit logging.
- **3D Spatial Clash Inspector**: Visual markers and conflict inspection for utility cross-clearances.
- **Progress Dashboard**: Category completion stats, road corridor progress bar, GeoJSON feature export, and CSV clash export.
