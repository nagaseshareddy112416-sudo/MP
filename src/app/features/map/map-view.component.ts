import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

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
import { createEmpty, extend } from 'ol/extent';
import Draw from 'ol/interaction/Draw';
import { getLength, getArea } from 'ol/sphere';
import Geometry from 'ol/geom/Geometry';

import { AuthService } from '../../core/services/auth.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { DrawingService } from '../../core/services/drawing.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';
import { DigitalTwin3dComponent } from './digital-twin-3d.component';
import { Clash, ReferenceLayer } from '../../core/models/models';

proj4.defs('EPSG:32644', '+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs');
register(proj4);

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, MatButtonModule, MatIconModule, MatButtonToggleModule,
    MatCardModule, MatTooltipModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    DigitalTwin3dComponent
  ],
  template: `
    <div class="map-wrapper">
      <!-- 2D / 3D Switch Banner -->
      <div class="dimension-toggle-banner">
        <button class="dimension-btn" [class.active]="!is3dMode" (click)="is3dMode = false">
          <mat-icon>map</mat-icon> 2D Master Plan
        </button>
        <button class="dimension-btn" [class.active]="is3dMode" (click)="is3dMode = true">
          <mat-icon>view_in_ar</mat-icon> 3D Digital Twin
        </button>
      </div>

      <!-- 3D Digital Twin Viewport (When in 3D Mode) -->
      <div *ngIf="is3dMode" class="full-3d-viewport">
        <app-digital-twin-3d></app-digital-twin-3d>
      </div>

      <!-- 2D OpenLayers Viewport & Controls (When in 2D Mode) -->
      <ng-container *ngIf="!is3dMode">
      <!-- Floating Top-Left Controls: Base Map & Measurement Tools -->
      <div class="map-overlay-panel top-left">
        <div class="gfc-card control-card">
          <div class="panel-section-title">Base Map</div>
          <mat-button-toggle-group [(ngModel)]="currentBaseMap" (change)="onBaseMapChange($event.value)" size="small">
            <mat-button-toggle value="osm">Street</mat-button-toggle>
            <mat-button-toggle value="satellite">Satellite</mat-button-toggle>
            <mat-button-toggle value="none">None</mat-button-toggle>
          </mat-button-toggle-group>

          <div class="panel-divider"></div>

          <div class="panel-section-title">GIS Measurement Tools</div>
          <div class="measure-tools-row">
            <button
              class="measure-btn"
              [class.active]="activeMeasureTool === 'distance'"
              (click)="toggleMeasure('distance')"
              matTooltip="Measure linear distance"
            >
              <mat-icon>straighten</mat-icon> Distance
            </button>
            <button
              class="measure-btn"
              [class.active]="activeMeasureTool === 'area'"
              (click)="toggleMeasure('area')"
              matTooltip="Measure polygon area"
            >
              <mat-icon>square_foot</mat-icon> Area
            </button>
            <button class="measure-btn" (click)="clearMeasurements()" matTooltip="Clear measured geometries">
              <mat-icon>clear</mat-icon> Clear
            </button>
          </div>
          <div *ngIf="lastMeasureResult" class="measure-result-pill">
            <mat-icon>info</mat-icon> {{ lastMeasureResult }}
          </div>
        </div>
      </div>

      <!-- Floating Top-Right Controls: Layers, Focus, & Compare -->
      <div class="map-overlay-panel top-right">
        <div class="gfc-card control-card layer-card">
          <div class="panel-header">
            <span>Layers & Overlays</span>
            <button mat-icon-button (click)="refreshFeatures()" matTooltip="Reload features">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>

          <div class="layer-toggles">
            <mat-checkbox [(ngModel)]="showFeatures" (change)="toggleFeatureLayer($event.checked)">
              Approved Features ({{ featureCount }})
            </mat-checkbox>
            <mat-checkbox [(ngModel)]="showClashes" (change)="toggleClashLayer($event.checked)">
              <span class="clash-label">Clashes ({{ clashCount }})</span>
            </mat-checkbox>
          </div>

          <!-- Drawing Focus / Selector -->
          <div class="drawing-select-section" *ngIf="availableDrawings.length > 0">
            <div class="sub-header">Focus Specific Drawing</div>
            <mat-form-field appearance="outline" class="full-width-field" subscriptSizing="dynamic">
              <mat-select [ngModel]="targetDrawingId" (selectionChange)="selectDrawingFilter($event.value)" placeholder="All Drawings">
                <mat-option [value]="null">All Drawings (Show All)</mat-option>
                <mat-option *ngFor="let d of availableDrawings" [value]="d.id">
                  {{ d.name }} ({{ d.featureCount }})
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Compare Mode Toggle -->
          <div class="compare-mode-section">
            <div class="sub-header">Stage / Compare Mode</div>
            <mat-button-toggle-group [(ngModel)]="compareMode" (change)="onCompareModeChange($event.value)" size="small" class="compare-toggle-group">
              <mat-button-toggle value="all">All</mat-button-toggle>
              <mat-button-toggle value="gfc">GFC Baseline</mat-button-toggle>
              <mat-button-toggle value="asbuilt">As-Built</mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          <!-- Reference Layers Section -->
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
        </div>
      </div>

      <!-- Floating Bottom-Left: Interactive GIS Map Legend -->
      <div class="map-overlay-panel bottom-left">
        <div class="gfc-card legend-card" [class.collapsed]="legendCollapsed">
          <div class="legend-header" (click)="legendCollapsed = !legendCollapsed">
            <div class="legend-title">
              <mat-icon>legend_toggle</mat-icon> Map Symbology Legend
            </div>
            <mat-icon class="collapse-icon">{{ legendCollapsed ? 'expand_less' : 'expand_more' }}</mat-icon>
          </div>

          <div class="legend-body" *ngIf="!legendCollapsed">
            <div class="legend-item">
              <span class="legend-swatch road-cl"></span>
              <span>Road Centerline (ROAD_CL)</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch road-edge"></span>
              <span>Road Edge (ROAD_EDGE)</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch water-main"></span>
              <span>Water Supply (WATER_MAIN)</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch sewer-line"></span>
              <span>Sewerage Pipe (SEWER_LINE)</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch storm-drain"></span>
              <span>Stormwater Drain (STORM_DRAIN)</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch power-cable"></span>
              <span>Power / Duct (POWER_CABLE)</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch bldg-poly"></span>
              <span>Building Footprint (BLDG_FOOTPRINT)</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch chainage-pt"></span>
              <span>Chainage Markers (CHAINAGE)</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch clash-pulse"></span>
              <span>3D Clearance Clash Marker</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Focus Drawing Floating Banner (Top Center) -->
      <div *ngIf="targetDrawingId" class="drawing-focus-banner gfc-card">
        <mat-icon class="focus-icon">filter_center_focus</mat-icon>
        <span class="focus-title">Focusing on: <strong>{{ selectedDrawingName }}</strong></span>
        <button class="gfc-btn subtle" (click)="selectDrawingFilter(null)">
          <mat-icon>zoom_out_map</mat-icon> Show All
        </button>
        <button class="gfc-btn danger" (click)="deleteCurrentDrawing()" matTooltip="Delete this drawing from database">
          <mat-icon>delete</mat-icon> Delete
        </button>
      </div>

      <!-- Map Viewport Container -->
      <div #mapContainer class="map-container"></div>

      <!-- Live Coordinates HUD (Bottom Right) -->
      <div class="coordinates-hud" *ngIf="mouseCoords">
        <span>Lon: {{ mouseCoords[0] | number:'1.5-5' }}°</span>
        <span>Lat: {{ mouseCoords[1] | number:'1.5-5' }}°</span>
        <span *ngIf="mouseUtmCoords">UTM 44N: E {{ mouseUtmCoords[0] | number:'1.0-0' }}m, N {{ mouseUtmCoords[1] | number:'1.0-0' }}m</span>
      </div>

      <!-- CAD Feature Inspector Slide-over Drawer (Right Side) -->
      <div *ngIf="selectedFeatureProps" class="feature-inspector-drawer gfc-card">
        <div class="inspector-header">
          <div class="inspector-title-group">
            <mat-icon class="ins-icon">layers</mat-icon>
            <div>
              <h3>{{ selectedFeatureProps.category }} &rsaquo; {{ selectedFeatureProps.subType }}</h3>
              <span class="ins-layer">Layer: <code>{{ selectedFeatureProps.layer }}</code></span>
            </div>
          </div>
          <button class="icon-close-btn" (click)="selectedFeatureProps = null">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="inspector-body">
          <div class="inspector-badge-row">
            <span *ngIf="selectedFeatureProps.isAsBuilt" class="gfc-badge extra">As-Built Survey</span>
            <span *ngIf="!selectedFeatureProps.isAsBuilt" class="gfc-badge tolerance">GFC Baseline</span>
            <span class="gfc-badge compliant" *ngIf="selectedFeatureProps.geometryType">{{ selectedFeatureProps.geometryType }}</span>
          </div>

          <div class="inspector-grid">
            <div class="ins-row">
              <span class="label">Project Drawing</span>
              <span class="val">{{ selectedFeatureProps.projectName }}</span>
            </div>
            <div class="ins-row" *ngIf="selectedFeatureProps.revision">
              <span class="label">Revision</span>
              <span class="val">{{ selectedFeatureProps.revision }}</span>
            </div>
            <div class="ins-row" *ngIf="selectedFeatureProps.chainage != null">
              <span class="label">Chainage</span>
              <span class="val">{{ selectedFeatureProps.chainage }} m</span>
            </div>
            <div class="ins-row" *ngIf="selectedFeatureProps.depth != null">
              <span class="label">Buried Depth</span>
              <span class="val">{{ selectedFeatureProps.depth }} m (Z)</span>
            </div>
            <div class="ins-row" *ngIf="selectedFeatureProps.diameter != null">
              <span class="label">Diameter</span>
              <span class="val">DN{{ selectedFeatureProps.diameter }}</span>
            </div>
            <div class="ins-row" *ngIf="selectedFeatureProps.material">
              <span class="label">Material</span>
              <span class="val">{{ selectedFeatureProps.material }}</span>
            </div>
          </div>

          <div class="inspector-actions" *ngIf="selectedFeatureProps.drawingId">
            <button class="gfc-btn secondary full" (click)="focusOnDrawing(selectedFeatureProps.drawingId)">
              <mat-icon>filter_center_focus</mat-icon> Focus Drawing
            </button>
            <button class="gfc-btn danger full" (click)="deleteDrawingFromMap(selectedFeatureProps.drawingId, selectedFeatureProps.projectName)">
              <mat-icon>delete</mat-icon> Delete Drawing
            </button>
          </div>
        </div>
      </div>

      <!-- Upload Reference Layer Modal -->
      <div *ngIf="showUploadRefModal" class="modal-backdrop">
        <mat-card class="modal-card">
          <mat-card-header>
            <mat-card-title>Upload Reference Layer</mat-card-title>
            <mat-card-subtitle>Official Master Plan / Boundary Overlay (.geojson, .zip, .kml)</mat-card-subtitle>
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
                    <mat-icon>attach_file</mat-icon> {{ selectedRefFile ? selectedRefFile.name : 'Select Overlay File' }}
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
      </ng-container>
    </div>
  `,
  styles: [`
    .map-wrapper {
      position: relative;
      width: 100%;
      height: calc(100vh - var(--header-height));
      overflow: hidden;
    }

    .dimension-toggle-banner {
      position: absolute;
      top: var(--space-4);
      left: 50%;
      transform: translateX(-50%);
      z-index: 30;
      display: flex;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-pill);
      padding: 4px;
      box-shadow: var(--shadow-floating);
      gap: 4px;
    }

    .dimension-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 6px 16px;
      border-radius: var(--radius-pill);
      font-size: var(--text-xs);
      font-weight: 600;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.active {
        background: var(--color-brand);
        color: #ffffff;
      }

      &:hover:not(.active) {
        background: var(--bg-surface-subtle);
        color: var(--text-primary);
      }
    }

    .full-3d-viewport {
      width: 100%;
      height: 100%;
      position: relative;
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
      top: var(--space-4);
      left: var(--space-4);
    }

    .top-right {
      top: var(--space-4);
      right: var(--space-4);
      width: 280px;
    }

    .bottom-left {
      bottom: var(--space-4);
      left: var(--space-4);
    }

    .control-card {
      padding: var(--space-3) var(--space-4);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      backdrop-filter: blur(8px);
    }

    .panel-section-title {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.5px;
      margin-bottom: var(--space-2);
    }

    .panel-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: var(--space-3) 0;
    }

    .measure-tools-row {
      display: flex;
      gap: var(--space-1);
    }

    .measure-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-primary);
      transition: all var(--transition-fast);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &:hover, &.active {
        background: var(--color-brand);
        color: #ffffff;
        border-color: var(--color-brand);
      }
    }

    .measure-result-pill {
      margin-top: var(--space-2);
      background: var(--color-brand-subtle);
      border: 1px solid var(--color-brand-border);
      border-radius: var(--radius-sm);
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-brand);
      display: flex;
      align-items: center;
      gap: 4px;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: var(--text-sm);
      color: var(--text-primary);
      margin-bottom: var(--space-2);
    }

    .layer-toggles {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .clash-label {
      color: var(--color-status-missing);
      font-weight: 600;
    }

    .sub-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin: var(--space-2) 0 var(--space-1) 0;
    }

    .full-width-field {
      width: 100%;
    }

    .compare-toggle-group {
      width: 100%;
      display: flex;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }

    .full-width-btn {
      width: 100%;
    }

    /* Legend Card */
    .legend-card {
      width: 250px;
      padding: var(--space-3);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
    }

    .legend-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }

    .legend-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--text-primary);
      text-transform: uppercase;
      letter-spacing: 0.4px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--color-brand);
      }
    }

    .legend-body {
      margin-top: var(--space-2);
      padding-top: var(--space-2);
      border-top: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 220px;
      overflow-y: auto;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 11px;
      color: var(--text-secondary);
    }

    .legend-swatch {
      width: 16px;
      height: 4px;
      border-radius: 2px;
      flex-shrink: 0;

      &.road-cl { background-color: #000000; height: 3px; }
      &.road-edge { background-color: #666666; height: 2px; }
      &.water-main { background-color: #1f77ff; height: 3px; }
      &.sewer-line { background-color: #8b4513; height: 3px; }
      &.storm-drain { background-color: #2ca02c; height: 3px; }
      &.power-cable { background-color: #e63946; height: 2px; }
      &.bldg-poly { background-color: rgba(33, 150, 243, 0.4); border: 1px solid #1976d2; height: 12px; border-radius: 3px; }
      &.chainage-pt { background-color: #ff9800; width: 8px; height: 8px; border-radius: 50%; }
      &.clash-pulse { background-color: #ff1744; width: 8px; height: 8px; border-radius: 50%; border: 1px solid #ffffff; }
    }

    /* Drawing Focus Banner */
    .drawing-focus-banner {
      position: absolute;
      top: var(--space-4);
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      background: var(--bg-surface-elevated);
      padding: var(--space-2) var(--space-4);
      display: flex;
      align-items: center;
      gap: var(--space-3);
      border-radius: var(--radius-pill);
      box-shadow: var(--shadow-floating);
      border: 1px solid var(--color-brand);
    }

    .focus-icon {
      color: var(--color-brand);
    }

    .focus-title {
      font-size: var(--text-xs);
      color: var(--text-primary);
    }

    /* Coordinates HUD */
    .coordinates-hud {
      position: absolute;
      bottom: var(--space-3);
      right: var(--space-3);
      z-index: 10;
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: var(--space-1) var(--space-3);
      font-family: var(--font-mono);
      font-size: 11px;
      display: flex;
      gap: var(--space-3);
      box-shadow: var(--shadow-sm);
    }

    /* CAD Feature Inspector Drawer */
    .feature-inspector-drawer {
      position: absolute;
      top: var(--space-4);
      right: 300px;
      width: 320px;
      max-height: calc(100vh - var(--header-height) - 40px);
      z-index: 25;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-floating);
      overflow-y: auto;
      padding: var(--space-4);
      animation: slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideInRight {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .inspector-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-3);
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--border-subtle);
    }

    .inspector-title-group {
      display: flex;
      align-items: center;
      gap: var(--space-2);

      h3 {
        margin: 0;
        font-size: var(--text-sm);
        font-weight: 700;
        color: var(--text-primary);
      }

      .ins-layer {
        font-size: 11px;
        color: var(--text-muted);
      }

      .ins-icon {
        color: var(--color-brand);
      }
    }

    .icon-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 0;
      &:hover { color: var(--text-primary); }
    }

    .inspector-badge-row {
      display: flex;
      gap: var(--space-1);
      margin-bottom: var(--space-3);
    }

    .inspector-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12px;
      margin-bottom: var(--space-4);
    }

    .ins-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px dashed var(--border-subtle);

      .label {
        color: var(--text-muted);
        font-weight: 500;
      }
      .val {
        color: var(--text-primary);
        font-weight: 600;
        font-family: var(--font-mono);
      }
    }

    .inspector-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }

    .full {
      width: 100%;
      justify-content: center;
    }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-card {
      width: 440px;
      padding: var(--space-5);
    }
  `]
})
export class MapViewComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapElement!: ElementRef;

  private map!: OlMap;
  private osmLayer!: TileLayer<OSM>;
  private satelliteLayer!: TileLayer<XYZ>;
  private featuresLayer!: VectorLayer<VectorSource>;
  private clashesLayer!: VectorLayer<VectorSource>;
  private measureLayer!: VectorLayer<VectorSource>;
  private measureDraw!: Draw;

  private featuresSource: VectorSource = new VectorSource();
  private clashesSource: VectorSource = new VectorSource();
  private measureSource: VectorSource = new VectorSource();

  currentBaseMap = 'osm';
  showFeatures = true;
  showClashes = true;
  compareMode: 'all' | 'gfc' | 'asbuilt' = 'all';
  is3dMode = false;

  featureCount = 0;
  clashCount = 0;
  mouseCoords: [number, number] | null = null;
  mouseUtmCoords: [number, number] | null = null;

  availableDrawings: Array<{ id: string; name: string; featureCount: number }> = [];
  targetDrawingId: string | null = null;
  selectedDrawingName = '';
  selectedFeatureProps: any = null;

  activeMeasureTool: 'distance' | 'area' | null = null;
  lastMeasureResult: string | null = null;
  legendCollapsed = false;

  referenceLayers: ReferenceLayer[] = [];
  showUploadRefModal = false;
  uploadingRef = false;
  selectedRefFile: File | null = null;
  refName = '';
  refColor = '#3f51b5';
  refUploadError = '';
  private refLayers = new Map<string, VectorLayer<VectorSource>>();

  constructor(
    public authService: AuthService,
    private workspaceService: WorkspaceService,
    private drawingService: DrawingService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.targetDrawingId = params['drawingId'] || null;
      if (this.map && this.featuresSource.getFeatures().length > 0) {
        this.applyDrawingFilterOrZoom();
      }
    });
  }

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

    this.osmLayer = new TileLayer({
      source: new OSM({ attributions: environment.baseMaps.osm.attribution }),
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

    this.featuresLayer = new VectorLayer({
      source: this.featuresSource,
      style: (feature) => this.getFeatureStyle(feature)
    });

    this.clashesLayer = new VectorLayer({
      source: this.clashesSource,
      style: () => new Style({
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

    this.measureLayer = new VectorLayer({
      source: this.measureSource,
      style: new Style({
        fill: new Fill({ color: 'rgba(37, 99, 235, 0.2)' }),
        stroke: new Stroke({ color: '#2563eb', width: 3, lineDash: [6, 6] }),
        image: new CircleStyle({ radius: 5, fill: new Fill({ color: '#2563eb' }) })
      })
    });

    this.map = new OlMap({
      target: this.mapElement.nativeElement,
      layers: [this.osmLayer, this.satelliteLayer, this.featuresLayer, this.clashesLayer, this.measureLayer],
      view: new View({
        center: fromLonLat([centerLon, centerLat]),
        zoom: zoom
      }),
      controls: defaultControls({ attributionOptions: { collapsible: true } }).extend([
        new ScaleLine({ units: 'metric' })
      ])
    });

    this.map.on('pointermove', (evt) => {
      const coords = toLonLat(evt.coordinate);
      this.mouseCoords = [coords[0], coords[1]];
      try {
        const utm = proj4('EPSG:4326', 'EPSG:32644', [coords[0], coords[1]]);
        this.mouseUtmCoords = [utm[0], utm[1]];
      } catch {
        this.mouseUtmCoords = null;
      }
    });

    this.map.on('click', (evt) => {
      if (this.activeMeasureTool) return;
      const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature) {
        this.selectedFeatureProps = (feature as Feature).getProperties();
      } else {
        this.selectedFeatureProps = null;
      }
    });
  }

  toggleMeasure(tool: 'distance' | 'area'): void {
    if (this.measureDraw) {
      this.map.removeInteraction(this.measureDraw);
    }

    if (this.activeMeasureTool === tool) {
      this.activeMeasureTool = null;
      return;
    }

    this.activeMeasureTool = tool;
    const type = tool === 'distance' ? 'LineString' : 'Polygon';

    this.measureDraw = new Draw({
      source: this.measureSource,
      type: type as any
    });

    this.measureDraw.on('drawend', (evt) => {
      const geom = evt.feature.getGeometry();
      if (!geom) return;

      if (tool === 'distance') {
        const length = getLength(geom, { projection: 'EPSG:3857' });
        this.lastMeasureResult = length > 1000 ? `${(length / 1000).toFixed(2)} km` : `${length.toFixed(1)} m`;
      } else {
        const area = getArea(geom, { projection: 'EPSG:3857' });
        this.lastMeasureResult = area > 10000 ? `${(area / 10000).toFixed(2)} ha` : `${area.toFixed(0)} m²`;
      }
      this.toastService.info('Measurement Computed', this.lastMeasureResult);
    });

    this.map.addInteraction(this.measureDraw);
  }

  clearMeasurements(): void {
    this.measureSource.clear();
    this.lastMeasureResult = null;
    if (this.measureDraw) {
      this.map.removeInteraction(this.measureDraw);
    }
    this.activeMeasureTool = null;
  }

  onBaseMapChange(mode: string): void {
    this.currentBaseMap = mode;
    this.osmLayer.setVisible(mode === 'osm');
    this.satelliteLayer.setVisible(mode === 'satellite');
  }

  loadWorkspaceData(): void {
    const ws = this.authService.activeWorkspace();
    if (!ws) {
      this.workspaceService.getWorkspaces().subscribe({
        next: (list) => {
          if (list.length > 0) {
            this.authService.setActiveWorkspace(list[0]);
            this.fetchFeaturesAndClashes(list[0].id);
          }
        }
      });
    } else {
      this.fetchFeaturesAndClashes(ws.id);
    }
  }

  fetchFeaturesAndClashes(workspaceId: string): void {
    this.drawingService.getFeatures(workspaceId).subscribe({
      next: (geoJsonData) => {
        this.featuresSource.clear();
        if (geoJsonData && geoJsonData.features && geoJsonData.features.length > 0) {
          const format = new GeoJSON();
          const features = format.readFeatures(geoJsonData, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
          });
          this.featuresSource.addFeatures(features);
          this.featureCount = features.length;
          this.populateAvailableDrawings(features);
          this.applyDrawingFilterOrZoom();
        } else {
          this.featureCount = 0;
          this.availableDrawings = [];
        }
      }
    });

    this.drawingService.getClashes(workspaceId).subscribe({
      next: (clashes: Clash[]) => {
        this.clashesSource.clear();
        this.clashCount = clashes.length;
        clashes.forEach(c => {
          if (c.lon != null && c.lat != null) {
            const coord = fromLonLat([c.lon, c.lat]);
            const feat = new Feature({
              geometry: new Point(coord),
              clashId: c.id,
              featureAName: `${c.featureACategory} (${c.featureASubType})`,
              featureBName: `${c.featureBCategory} (${c.featureBSubType})`,
              separationM: c.verticalGapM
            });
            this.clashesSource.addFeature(feat);
          }
        });
      }
    });

    this.drawingService.getReferenceLayers(workspaceId).subscribe({
      next: (refs: ReferenceLayer[]) => {
        this.referenceLayers = refs.map(r => ({ ...r, isVisible: true }));
        this.referenceLayers.forEach(r => this.addReferenceLayerToMap(r));
      }
    });
  }

  private populateAvailableDrawings(features: Feature[]): void {
    const map = new Map<string, { name: string; count: number }>();
    features.forEach(f => {
      const dId = f.get('drawingId');
      const pName = f.get('projectName') || 'Unnamed Drawing';
      if (dId) {
        if (!map.has(dId)) {
          map.set(dId, { name: pName, count: 0 });
        }
        map.get(dId)!.count++;
      }
    });
    this.availableDrawings = Array.from(map.entries()).map(([id, val]) => ({
      id,
      name: val.name,
      featureCount: val.count
    }));
  }

  private addReferenceLayerToMap(ref: ReferenceLayer): void {
    if (!ref.geoJsonData) return;
    try {
      const format = new GeoJSON();
      const feats = format.readFeatures(JSON.parse(ref.geoJsonData), {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });
      const src = new VectorSource({ features: feats });
      const layer = new VectorLayer({
        source: src,
        style: new Style({
          stroke: new Stroke({ color: ref.color || '#3f51b5', width: 2, lineDash: [4, 4] }),
          fill: new Fill({ color: 'rgba(63, 81, 181, 0.1)' })
        })
      });
      this.refLayers.set(ref.id, layer);
      this.map.addLayer(layer);
    } catch {
      // Ignore
    }
  }

  onRefFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedRefFile = target.files[0];
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
        this.toastService.success('Reference Layer Added', layer.name);
      },
      error: (err) => {
        this.uploadingRef = false;
        this.refUploadError = err.error?.message || 'Failed to upload reference layer.';
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
        this.toastService.info('Reference Layer Removed');
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
      this.map.getView().fit(extent, { padding: [60, 60, 60, 60], duration: 800, maxZoom: 18 });
    }
  }

  applyDrawingFilterOrZoom(): void {
    if (this.targetDrawingId) {
      const matching = this.featuresSource.getFeatures().filter(f => f.get('drawingId') === this.targetDrawingId);
      if (matching.length > 0) {
        this.selectedDrawingName = matching[0].get('projectName') || 'Selected Drawing';
        this.selectedFeatureProps = matching[0].getProperties();

        const extent = createEmpty();
        matching.forEach(f => {
          const geom = f.getGeometry();
          if (geom) extend(extent, geom.getExtent());
        });

        if (!isNaN(extent[0]) && isFinite(extent[0])) {
          this.map.getView().fit(extent, {
            padding: [100, 100, 100, 100],
            maxZoom: 18,
            duration: 900
          });
        }
        this.featuresLayer.changed();
        return;
      }
    }

    this.selectedDrawingName = '';
    this.zoomToExtent();
    this.featuresLayer.changed();
  }

  selectDrawingFilter(drawingId: string | null): void {
    this.targetDrawingId = drawingId;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: drawingId ? { drawingId } : {},
      queryParamsHandling: 'replace'
    });
    this.applyDrawingFilterOrZoom();
  }

  focusOnDrawing(drawingId: string): void {
    this.selectDrawingFilter(drawingId);
  }

  deleteCurrentDrawing(): void {
    if (this.targetDrawingId) {
      this.deleteDrawingFromMap(this.targetDrawingId, this.selectedDrawingName || 'Drawing');
    }
  }

  deleteDrawingFromMap(drawingId: string, projectName: string): void {
    const ws = this.authService.activeWorkspace();
    if (!ws || !drawingId) return;

    if (!confirm(`Are you sure you want to permanently delete drawing '${projectName}' and all its features from the database?`)) {
      return;
    }

    this.drawingService.deleteDrawing(ws.id, drawingId).subscribe({
      next: () => {
        if (this.targetDrawingId === drawingId) {
          this.targetDrawingId = null;
          this.selectedDrawingName = '';
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            queryParamsHandling: 'replace'
          });
        }
        this.selectedFeatureProps = null;
        this.toastService.success('Drawing Deleted', `'${projectName}' removed from Master Plan.`);
        this.refreshFeatures();
      },
      error: (err) => {
        this.toastService.error('Deletion Error', err.error?.message || 'Failed to delete drawing.');
      }
    });
  }

  onCompareModeChange(mode: 'all' | 'gfc' | 'asbuilt'): void {
    this.compareMode = mode;
    this.featuresLayer.changed();
  }

  refreshFeatures(): void {
    const ws = this.authService.activeWorkspace();
    if (ws) {
      this.fetchFeaturesAndClashes(ws.id);
    }
  }

  private getFeatureStyle(feature: any): Style | undefined {
    const isAsBuilt = feature.get('isAsBuilt') === true;

    if (this.compareMode === 'gfc' && isAsBuilt) return undefined;
    if (this.compareMode === 'asbuilt' && !isAsBuilt) {
      return new Style({
        stroke: new Stroke({ color: 'rgba(150, 150, 150, 0.4)', width: 1, lineDash: [4, 4] })
      });
    }

    const isTarget = !this.targetDrawingId || feature.get('drawingId') === this.targetDrawingId;
    if (this.targetDrawingId && !isTarget) {
      return new Style({
        stroke: new Stroke({ color: 'rgba(180, 180, 180, 0.25)', width: 1 }),
        fill: new Fill({ color: 'rgba(220, 220, 220, 0.08)' })
      });
    }

    if (isAsBuilt) {
      const status = String(feature.get('complianceStatus') || '').toLowerCase();
      let abColor = '#7b1fa2';
      if (status.includes('compliant')) abColor = '#10b981';
      else if (status.includes('tolerance')) abColor = '#f59e0b';
      else if (status.includes('deviation')) abColor = '#ef4444';

      return new Style({
        stroke: new Stroke({ color: abColor, width: this.targetDrawingId ? 5 : 4 }),
        image: new CircleStyle({
          radius: this.targetDrawingId ? 9 : 7,
          fill: new Fill({ color: abColor }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      });
    }

    const layer = feature.get('layer') || '';
    let color = '#333333';
    let width = this.targetDrawingId ? 4 : 2;

    if (layer === 'ROAD_CL') { color = '#000000'; width = this.targetDrawingId ? 5 : 3; }
    else if (layer === 'ROAD_EDGE') { color = '#666666'; width = this.targetDrawingId ? 3 : 2; }
    else if (layer === 'WATER_MAIN') { color = '#1f77ff'; width = this.targetDrawingId ? 5 : 3; }
    else if (layer === 'SEWER_LINE') { color = '#8b4513'; width = this.targetDrawingId ? 5 : 3; }
    else if (layer === 'STORM_DRAIN') { color = '#2ca02c'; width = this.targetDrawingId ? 5 : 3; }
    else if (layer === 'POWER_CABLE') { color = '#e63946'; width = this.targetDrawingId ? 4 : 2; }
    else if (layer === 'BLDG_FOOTPRINT') {
      const isFocused = this.targetDrawingId && isTarget;
      return new Style({
        fill: new Fill({ color: isFocused ? 'rgba(37, 99, 235, 0.5)' : 'rgba(37, 99, 235, 0.3)' }),
        stroke: new Stroke({ color: isFocused ? '#1d4ed8' : '#2563eb', width: isFocused ? 4 : 2.5 })
      });
    } else if (layer === 'CHAINAGE') {
      return new Style({
        image: new CircleStyle({
          radius: this.targetDrawingId ? 7 : 5,
          fill: new Fill({ color: '#ff9800' }),
          stroke: new Stroke({ color: '#ffffff', width: 1.5 })
        })
      });
    }

    return new Style({
      stroke: new Stroke({ color, width })
    });
  }
}
