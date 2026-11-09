# Known Limitations - MP-Web (Frontend)

The following known limitations and planned enhancements are tracked here:

1. **Large Layer Vector Rendering**:
   - Complex CAD drawings with thousands of vertices are currently rendered as client-side vector features in OpenLayers. Performance optimizations (Vector Tiles / MVT, web worker parsing) are planned in Phase 6.

2. **3D Cesium Integration**:
   - The Cesium 3D viewer is currently a basic placeholder; full 3D terrain, photogrammetry tiles, and 3D IFC models are planned for Phase 7.

3. **Drawing Deletion UI**:
   - Drawings can currently be viewed and reviewed; drawing archive/deletion options are exposed via API and will be expanded in the management UI in Phase 4.

