import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';

import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import { ScaleLine, MousePosition, defaults as defaultControls } from 'ol/control';
import { createStringXY } from 'ol/coordinate';
import { Style, Stroke, Fill, Circle as CircleStyle, Text } from 'ol/style';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';

import { AuthService } from '../../core/services/auth.service';
import { DrawingService } from '../../core/services/drawing.service';
import { environment } from '../../../environments/environment';
import { Clash, ReferenceLayer } from '../../core/models/models';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule, MatButtonToggleModule,
    MatCardModule, MatTooltipModule, MatCheckboxModule
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
            <div *ngFor="let ref of referenceLayers">
              <mat-checkbox [(ngModel)]="ref.isVisible" (change)="toggleReferenceLayer(ref)">
                {{ ref.name }}
              </mat-checkbox>
            </div>
          </div>

          <div class="action-buttons">
            <button mat-stroked-button (click)="zoomToExtent()" matTooltip="Zoom to all project data">
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
    .action-buttons {
      margin-top: 12px;
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
  selectedFeatureProps: any = null;
  referenceLayers: ReferenceLayer[] = [];

  constructor(
    private authService: AuthService,
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


