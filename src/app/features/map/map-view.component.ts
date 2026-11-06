import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { ScaleLine, defaults as defaultControls } from 'ol/control';
import { Style, Stroke, Fill, Circle as CircleStyle, Text } from 'ol/style';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';

import { AuthService } from '../../core/services/auth.service';
import { DrawingService } from '../../core/services/drawing.service';
import { environment } from '../../../environments/environment';
import { Clash, ReferenceLayer } from '../../core/models/models';

// Register UTM Zone 44N projection for OpenLayers
proj4.defs('EPSG:32644', '+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs');
register(proj4);

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule, MatButtonToggleModule,
    MatCardModule, MatTooltipModule, MatCheckboxModule, MatFormFieldModule, MatInputModule
  ],
  template: `
    <div class="map-wrapper">
      <!-- Floating Top-Left Controls: Base Map Switcher -->
      <div class="map-overlay-panel top-left">
        <mat-card class="control-card">
          <div class="base-switcher-label">Base Map</div>
          <mat-button-toggle-group [(ngModel)]="currentBaseMap" (change)="onBaseMapChange($event.value)" size="small">
            <mat-button-toggle value="osm">Street</mat-button-toggle>
            <mat-button-toggle value="satellite">Satellite</mat-button-toggle>
            <mat-button-toggle value="none">None</mat-button-toggle>
          </mat-button-toggle-group>
        </mat-card>
      </div>

      <!-- Floating Top-Right Controls: Layer Toggles & Action Buttons -->
      <div class="map-overlay-panel top-right">
        <mat-card class="control-card">
          <div class="panel-header">
            <span>Layers & Overlays</span>
            <button mat-icon-button (click)="refreshFeatures()" matTooltip="Reload features">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
          <div class="layer-toggles">
            <mat-checkbox [(ngModel)]="showFeatures" (change)="toggleFeatureLayer($event.checked)">
              Approved Drawings ({{ featureCount }})
            </mat-checkbox>
            <mat-checkbox [(ngModel)]="showClashes" (change)="toggleClashLayer($event.checked)">
              <span class="clash-label">Clashes ({{ clashCount }})</span>
            </mat-checkbox>
          </div>

          <div *ngIf="referenceLayers.length > 0" class="ref-layers-section">
            <div class="sub-header">Reference Layers</div>
            <div *ngFor="let ref of referenceLayers" class="ref-item-row">
              <mat-checkbox [(ngModel)]="ref.isVisible" (change)="toggleReferenceLayer(ref)">
                {{ ref.name }}
              </mat-checkbox>
              <button mat-icon-button color="warn" (click)="deleteReferenceLayer(ref.id)" class="mini-btn" title="Delete reference layer">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          </div>

          <div class="action-buttons">
            <button mat-stroked-button (click)="showUploadRefModal = true" class="full-width-btn" *ngIf="authService.isWorkspaceAdmin()">
              <mat-icon>add_to_photos</mat-icon> Add Reference Layer
            </button>
            <button mat-stroked-button (click)="zoomToExtent()" matTooltip="Zoom to all project data" class="full-width-btn">
              <mat-icon>zoom_out_map</mat-icon> Fit Extent
            </button>
          </div>
        </mat-card>
      </div>

      <!-- Map Div -->
      <div #mapContainer class="map-container"></div>

      <!-- Mouse Coordinate Inspector (Bottom Center/Right) -->
      <div class="coordinates-hud" *ngIf="mouseCoords">
        <span>Lon: {{ mouseCoords[0] | number:'1.5-5' }}°</span>
        <span>Lat: {{ mouseCoords[1] | number:'1.5-5' }}°</span>
        <span *ngIf="mouseUtmCoords">UTM 44N: E {{ mouseUtmCoords[0] | number:'1.0-0' }}m, N {{ mouseUtmCoords[1] | number:'1.0-0' }}m</span>
      </div>

      <!-- Reference Layer Upload Modal -->
      <div *ngIf="showUploadRefModal" class="modal-backdrop">
        <mat-card class="modal-card">
          <mat-card-header>
            <mat-card-title>Upload Reference Layer</mat-card-title>
            <mat-card-subtitle>Official Master Plan / Boundary Overlay (GeoJSON, Shapefile .zip, KML)</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="refUploadError" class="error-text">{{ refUploadError }}</div>
            <form (ngSubmit)="submitReferenceLayer()">
              <div class="form-inputs">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Layer Name</mat-label>
                  <input matInput [(ngModel)]="refName" name="refName" required placeholder="e.g. Master Plan 2030">
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Overlay Color</mat-label>
                  <input matInput [(ngModel)]="refColor" name="refColor" placeholder="#3f51b5">
                </mat-form-field>

                <div class="file-picker">
                  <input type="file" #refFileInput (change)="onRefFileSelected($event)" accept=".geojson,.json,.zip,.kml" style="display:none">
                  <button mat-stroked-button type="button" (click)="refFileInput.click()">
                    <mat-icon>attach_file</mat-icon> {{ selectedRefFile ? selectedRefFile.name : 'Select File (.geojson, .zip, .kml)' }}
                  </button>
                </div>
              </div>

              <div class="modal-actions">
                <button mat-button type="button" (click)="showUploadRefModal = false">Cancel</button>
                <button mat-raised-button color="primary" type="submit" [disabled]="!selectedRefFile || uploadingRef">
                  {{ uploadingRef ? 'Uploading & Parsing...' : 'Upload & Display' }}
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Selected Feature Detail Popup -->
      <div *ngIf="selectedFeatureProps" class="feature-popup mat-elevation-z4">
        <div class="popup-header">
          <strong>{{ selectedFeatureProps.category }} - {{ selectedFeatureProps.subType }}</strong>
          <button mat-icon-button (click)="selectedFeatureProps = null">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="popup-body">
          <p><strong>Project:</strong> {{ selectedFeatureProps.projectName }}</p>
          <p><strong>Layer:</strong> <code>{{ selectedFeatureProps.layer }}</code></p>
          <p *ngIf="selectedFeatureProps.chainage != null"><strong>Chainage:</strong> {{ selectedFeatureProps.chainage }} m</p>
          <p *ngIf="selectedFeatureProps.depth != null"><strong>Depth:</strong> {{ selectedFeatureProps.depth }} m</p>
          <p *ngIf="selectedFeatureProps.diameter != null"><strong>Diameter:</strong> DN{{ selectedFeatureProps.diameter }}</p>
          <p *ngIf="selectedFeatureProps.material"><strong>Material:</strong> {{ selectedFeatureProps.material }}</p>
          <p><strong>Revision:</strong> {{ selectedFeatureProps.revision }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-wrapper {
      position: relative;
      width: 100%;
      height: calc(100vh - 64px);
    }
    .map-container {
      width: 100%;
      height: 100%;
    }
    .map-overlay-panel {
      position: absolute;
      z-index: 10;
    }
    .top-left {
      top: 16px;
      left: 16px;
    }
    .top-right {
      top: 16px;
      right: 16px;
      width: 260px;
    }
    .control-card {
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 8px;
    }
    .base-switcher-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: #666;
      margin-bottom: 6px;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .layer-toggles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .clash-label {
      color: #d32f2f;
      font-weight: 500;
    }
    .ref-layers-section {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #eee;
    }
    .sub-header {
      font-size: 12px;
      color: #777;
      margin-bottom: 4px;
    }
    .ref-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 2px 0;
    }
    .mini-btn {
      width: 28px;
      height: 28px;
      line-height: 28px;
    }
    .full-width-btn {
      width: 100%;
      margin-top: 6px;
    }
    .action-buttons {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-card {
      width: 100%;
      max-width: 450px;
      padding: 20px;
    }
    .file-picker {
      margin: 12px 0;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    .error-text {
      color: #c62828;
      font-size: 13px;
      margin-bottom: 12px;
    }
    .coordinates-hud {
      position: absolute;
      bottom: 24px;
      left: 16px;
      background: rgba(0, 0, 0, 0.75);
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      display: flex;
      gap: 16px;
      z-index: 10;
      pointer-events: none;
    }
    .feature-popup {
      position: absolute;
      bottom: 60px;
      left: 16px;
      width: 300px;
      background: white;
      border-radius: 8px;
      padding: 12px;
      z-index: 20;
    }
    .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #eee;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .popup-body p {
      margin: 4px 0;
      font-size: 13px;
    }
  `]
})
export class MapViewComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapElement!: ElementRef;

  map!: OlMap;
  osmLayer!: TileLayer<OSM>;
  satelliteLayer!: TileLayer<XYZ>;
  featuresLayer!: VectorLayer<VectorSource>;
  featuresSource = new VectorSource();
  clashesLayer!: VectorLayer<VectorSource>;
  clashesSource = new VectorSource();
  refLayers: Map<string, VectorLayer<VectorSource>> = new Map();

  currentBaseMap = 'osm';
  showFeatures = true;
  showClashes = true;
  featureCount = 0;
  clashCount = 0;
  mouseCoords: [number, number] | null = null;
  mouseUtmCoords: [number, number] | null = null;
  selectedFeatureProps: any = null;
  referenceLayers: ReferenceLayer[] = [];

  showUploadRefModal = false;
  refName = '';
  refColor = '#3f51b5';
  selectedRefFile: File | null = null;
  uploadingRef = false;
  refUploadError = '';

  constructor(
    public authService: AuthService,
    private drawingService: DrawingService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
    this.loadWorkspaceData();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.setTarget(undefined);
    }
  }

  private initMap(): void {
    const ws = this.authService.activeWorkspace();
    const centerLon = ws?.centerLon ?? environment.defaultWorkspace.centerLon;
    const centerLat = ws?.centerLat ?? environment.defaultWorkspace.centerLat;
    const zoom = ws?.defaultZoom ?? environment.defaultWorkspace.zoom;

    // 1. Base Map Layers
    this.osmLayer = new TileLayer({
      source: new OSM({
        attributions: environment.baseMaps.osm.attribution
      }),
      visible: true
    });

    this.satelliteLayer = new TileLayer({
      source: new XYZ({
        url: environment.baseMaps.satellite.url,
        attributions: environment.baseMaps.satellite.attribution,
        maxZoom: 19
      }),
      visible: false
    });

    // 2. Extracted Features Vector Layer
    this.featuresLayer = new VectorLayer({
      source: this.featuresSource,
      style: (feature) => this.getFeatureStyle(feature)
    });

    // 3. Clashes Vector Layer
    this.clashesLayer = new VectorLayer({
      source: this.clashesSource,
      style: (feature) => new Style({
        image: new CircleStyle({
          radius: 9,
          fill: new Fill({ color: '#ff1744' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        }),
        text: new Text({
          text: '⚠ CLASH',
          offsetY: -16,
          fill: new Fill({ color: '#d50000' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
          font: 'bold 11px sans-serif'
        })
      })
    });

    // 4. Initialize Map
    this.map = new OlMap({
      target: this.mapElement.nativeElement,
      layers: [this.osmLayer, this.satelliteLayer, this.featuresLayer, this.clashesLayer],
      view: new View({
        center: fromLonLat([centerLon, centerLat]),
        zoom: zoom
      }),
      controls: defaultControls({
        attributionOptions: { collapsible: true }
      }).extend([
        new ScaleLine({ units: 'metric' })
      ])
    });

    // Track mouse coordinate movement
    this.map.on('pointermove', (evt) => {
      const coords = toLonLat(evt.coordinate);
      this.mouseCoords = [coords[0], coords[1]];
      try {
        const utm = proj4('EPSG:4326', 'EPSG:32644', [coords[0], coords[1]]);
        this.mouseUtmCoords = [utm[0], utm[1]];
      } catch (e) {
        this.mouseUtmCoords = null;
      }
    });

    // Handle clicks for feature popup
    this.map.on('click', (evt) => {
      const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature) {
        this.selectedFeatureProps = feature.getProperties();
      } else {
        this.selectedFeatureProps = null;
      }
    });
  }

  onBaseMapChange(mode: string): void {
    this.currentBaseMap = mode;
    this.osmLayer.setVisible(mode === 'osm');
    this.satelliteLayer.setVisible(mode === 'satellite');
  }

  loadWorkspaceData(): void {
    const ws = this.authService.activeWorkspace();
    if (!ws) return;

    this.refreshFeatures();
    this.loadClashes();
    this.loadReferenceLayers();
  }

  refreshFeatures(): void {
    const ws = this.authService.activeWorkspace();
    if (!ws) return;

    this.drawingService.getFeatures(ws.id).subscribe({
      next: (geoJson) => {
        this.featuresSource.clear();
        if (geoJson && geoJson.features) {
          const format = new GeoJSON();
          const olFeatures = format.readFeatures(geoJson, {
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
          });
          this.featuresSource.addFeatures(olFeatures);
          this.featureCount = olFeatures.length;

          if (olFeatures.length > 0) {
            this.zoomToExtent();
          }
        }
      }
    });
  }

  loadClashes(): void {
    const ws = this.authService.activeWorkspace();
    if (!ws) return;

    this.drawingService.getClashes(ws.id).subscribe({
      next: (clashes) => {
        this.clashesSource.clear();
        const openClashes = clashes.filter(c => c.status === 0 || c.status === 'Open');
        this.clashCount = openClashes.length;

        for (const c of openClashes) {
          const feat = new Feature({
            geometry: new Point(fromLonLat([c.lon, c.lat])),
            clashId: c.id,
            verticalGap: c.verticalGapM,
            notes: c.notes
          });
          this.clashesSource.addFeature(feat);
        }
      },
      error: () => {}
    });
  }

  loadReferenceLayers(): void {
    const ws = this.authService.activeWorkspace();
    if (!ws) return;

    this.drawingService.getReferenceLayers(ws.id).subscribe({
      next: (layers) => {
        this.referenceLayers = layers;
        for (const layer of layers) {
          if (layer.geoJsonData && layer.isVisible) {
            this.addReferenceLayerToMap(layer);
          }
        }
      }
    });
  }

  private addReferenceLayerToMap(ref: ReferenceLayer): void {
    try {
      const parsed = JSON.parse(ref.geoJsonData || '{}');
      const format = new GeoJSON();
      const features = format.readFeatures(parsed, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326'
      });

      const source = new VectorSource({ features });
      const vector = new VectorLayer({
        source,
        style: new Style({
          stroke: new Stroke({ color: ref.color || '#3f51b5', width: 2, lineDash: [4, 4] }),
          fill: new Fill({ color: 'rgba(63, 81, 181, 0.1)' })
        })
      });

      this.refLayers.set(ref.id, vector);
      this.map.addLayer(vector);
    } catch (e) {
      console.warn('Could not parse reference layer GeoJSON', e);
    }
  }

  onRefFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedRefFile = file;
      if (!this.refName) {
        this.refName = file.name.replace(/\.[^/.]+$/, '');
      }
    }
  }

  submitReferenceLayer(): void {
    const ws = this.authService.activeWorkspace();
    if (!ws || !this.selectedRefFile) return;

    this.uploadingRef = true;
    this.refUploadError = '';

    this.drawingService.uploadReferenceLayer(ws.id, this.refName, this.refColor, this.selectedRefFile).subscribe({
      next: (layer) => {
        this.uploadingRef = false;
        this.showUploadRefModal = false;
        this.selectedRefFile = null;
        this.refName = '';
        this.referenceLayers.push(layer);
        if (layer.geoJsonData) {
          this.addReferenceLayerToMap(layer);
        }
      },
      error: (err) => {
        this.uploadingRef = false;
        this.refUploadError = err.error?.message || 'Failed to upload and parse reference layer.';
      }
    });
  }

  deleteReferenceLayer(id: string): void {
    const ws = this.authService.activeWorkspace();
    if (!ws) return;

    this.drawingService.deleteReferenceLayer(ws.id, id).subscribe({
      next: () => {
        const layer = this.refLayers.get(id);
        if (layer) {
          this.map.removeLayer(layer);
          this.refLayers.delete(id);
        }
        this.referenceLayers = this.referenceLayers.filter(r => r.id !== id);
      }
    });
  }

  toggleReferenceLayer(ref: ReferenceLayer): void {
    const layer = this.refLayers.get(ref.id);
    if (layer) {
      layer.setVisible(ref.isVisible);
    } else if (ref.isVisible) {
      this.addReferenceLayerToMap(ref);
    }
  }

  toggleFeatureLayer(visible: boolean): void {
    this.featuresLayer.setVisible(visible);
  }

  toggleClashLayer(visible: boolean): void {
    this.clashesLayer.setVisible(visible);
  }

  zoomToExtent(): void {
    const extent = this.featuresSource.getExtent();
    if (extent && !isNaN(extent[0]) && isFinite(extent[0])) {
      this.map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 800, maxZoom: 18 });
    }
  }

  private getFeatureStyle(feature: any): Style {
    const cat = feature.get('category') || '';
    const layer = feature.get('layer') || '';

    let color = '#333333';
    let width = 2;

    if (layer === 'ROAD_CL') { color = '#000000'; width = 3; }
    else if (layer === 'ROAD_EDGE') { color = '#666666'; width = 2; }
    else if (layer === 'WATER_MAIN') { color = '#1f77ff'; width = 3; }
    else if (layer === 'SEWER_LINE') { color = '#8b4513'; width = 3; }
    else if (layer === 'STORM_DRAIN') { color = '#2ca02c'; width = 3; }
    else if (layer === 'POWER_CABLE') { color = '#e63946'; width = 2; }
    else if (layer === 'BLDG_FOOTPRINT') {
      return new Style({
        fill: new Fill({ color: 'rgba(108, 117, 125, 0.4)' }),
        stroke: new Stroke({ color: '#6c757d', width: 2 })
      });
    } else if (layer === 'CHAINAGE') {
      return new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: '#ff9800' }),
          stroke: new Stroke({ color: '#ffffff', width: 1 })
        })
      });
    }

    return new Style({
      stroke: new Stroke({ color, width })
    });
  }
}


