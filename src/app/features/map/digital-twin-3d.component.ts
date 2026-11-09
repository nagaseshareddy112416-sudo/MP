import { Component, ElementRef, Input, OnInit, AfterViewInit, OnDestroy, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DrawingService } from '../../core/services/drawing.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

declare const Cesium: any;

@Component({
  selector: 'app-digital-twin-3d',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatSliderModule, MatTooltipModule],
  template: `
    <div class="twin-container">
      <!-- 3D Cesium Viewport -->
      <div #cesiumContainer class="cesium-container"></div>

      <!-- Drone Navigation HUD (Top Left) -->
      <div class="drone-hud gfc-card">
        <div class="hud-header">
          <div class="hud-title">
            <mat-icon class="pulse-icon">navigation</mat-icon> Drone HUD &bull; {{ currentMode() | uppercase }}
          </div>
          <span class="hud-pill">{{ isFlying() ? 'LIVE' : 'STANDBY' }}</span>
        </div>

        <div class="hud-stats-grid">
          <div class="hud-stat">
            <span class="label">Altitude</span>
            <span class="val">{{ altitude() | number:'1.1-1' }} m</span>
          </div>
          <div class="hud-stat">
            <span class="label">Heading</span>
            <span class="val">{{ heading() | number:'1.0-0' }}°</span>
          </div>
          <div class="hud-stat">
            <span class="label">Pitch</span>
            <span class="val">{{ pitch() | number:'1.0-0' }}°</span>
          </div>
          <div class="hud-stat">
            <span class="label">Speed</span>
            <span class="val">{{ speed() }} m/s</span>
          </div>
        </div>

        <div class="hud-controls">
          <button class="hud-btn" [class.active]="currentMode() === 'free-fly'" (click)="setMode('free-fly')" matTooltip="WASD / QE keys navigation">
            <mat-icon>flight</mat-icon> Free-Fly
          </button>
          <button class="hud-btn" [class.active]="currentMode() === 'orbit'" (click)="setMode('orbit')" matTooltip="Orbit around site">
            <mat-icon>sync</mat-icon> Orbit
          </button>
          <button class="hud-btn" [class.active]="currentMode() === 'walk'" (click)="setMode('walk')" matTooltip="Pedestrian ground inspection (1.7m)">
            <mat-icon>directions_walk</mat-icon> Walk
          </button>
        </div>

        <!-- Tour Player -->
        <div class="tour-bar">
          <span class="tour-label">Site Inspection Tour:</span>
          <button class="tour-btn" (click)="toggleTour()">
            <mat-icon>{{ isTourRunning() ? 'pause' : 'play_arrow' }}</mat-icon>
            {{ isTourRunning() ? 'Pause Tour' : 'Play 5-Pt Tour' }}
          </button>
          <button class="tour-btn reset" (click)="resetCamera()">
            <mat-icon>restart_alt</mat-icon> Reset
          </button>
        </div>
      </div>

      <!-- Floating 3D Environment Toolbar (Top Right) -->
      <div class="env-toolbar gfc-card">
        <div class="env-title">Subsurface & Environment</div>

        <div class="slider-row">
          <span class="slider-label">Ground Transparency (Subsurface View)</span>
          <mat-slider min="0.1" max="1.0" step="0.05" class="full-slider">
            <input matSliderThumb [(ngModel)]="groundAlpha" (change)="updateGroundAlpha()">
          </mat-slider>
          <span class="slider-val">{{ (1 - groundAlpha) * 100 | number:'1.0-0' }}% transparent</span>
        </div>

        <div class="slider-row">
          <span class="slider-label">Time of Day (Sun & Shadows)</span>
          <mat-slider min="6" max="18" step="0.5" class="full-slider">
            <input matSliderThumb [(ngModel)]="timeOfDay" (change)="updateTimeOfDay()">
          </mat-slider>
          <span class="slider-val">{{ formatHour(timeOfDay) }}</span>
        </div>

        <div class="layer-pills">
          <span class="layer-pill bldg" [class.active]="showBuildings" (click)="toggleLayer('bldg')">
            <mat-icon>apartment</mat-icon> 3D Towers (11 fl)
          </span>
          <span class="layer-pill pipes" [class.active]="showUtilities" (click)="toggleLayer('pipes')">
            <mat-icon>plumbing</mat-icon> Subsurface Pipes
          </span>
          <span class="layer-pill clashes" [class.active]="showClashes" (click)="toggleLayer('clashes')">
            <mat-icon>warning</mat-icon> 3D Clash Spheres
          </span>
        </div>
      </div>

      <!-- Feature Selection Overlay -->
      <div *ngIf="selectedEntityName" class="entity-overlay gfc-card">
        <div class="ent-header">
          <strong>{{ selectedEntityName }}</strong>
          <button class="ent-close" (click)="selectedEntityName = ''"><mat-icon>close</mat-icon></button>
        </div>
        <p class="ent-desc">{{ selectedEntityDesc }}</p>
        <span *ngIf="isEstimatedHeight" class="gfc-badge deviation">Approximate Extruded Height (3m/floor)</span>
      </div>
    </div>
  `,
  styles: [`
    .twin-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000000;
    }

    .cesium-container {
      width: 100%;
      height: 100%;
    }

    /* Drone HUD */
    .drone-hud {
      position: absolute;
      top: var(--space-4);
      left: var(--space-4);
      z-index: 20;
      width: 290px;
      padding: var(--space-3) var(--space-4);
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: var(--radius-lg);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(10px);
      color: #ffffff;
      font-family: var(--font-sans);
    }

    .hud-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      padding-bottom: var(--space-1);
    }

    .hud-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #60a5fa;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .pulse-icon {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.5; }
      50% { opacity: 1; }
      100% { opacity: 0.5; }
    }

    .hud-pill {
      font-size: 9px;
      font-weight: 700;
      background: #ef4444;
      color: #ffffff;
      padding: 1px 6px;
      border-radius: var(--radius-pill);
      letter-spacing: 0.5px;
    }

    .hud-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: var(--space-3);
    }

    .hud-stat {
      display: flex;
      flex-direction: column;
      .label {
        font-size: 9px;
        text-transform: uppercase;
        color: #94a3b8;
        font-weight: 600;
      }
      .val {
        font-size: 12px;
        font-weight: 700;
        font-family: var(--font-mono);
        color: #f8fafc;
      }
    }

    .hud-controls {
      display: flex;
      gap: 4px;
      margin-bottom: var(--space-2);
    }

    .hud-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-sm);
      color: #e2e8f0;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 4px;
      cursor: pointer;
      transition: all var(--transition-fast);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &:hover, &.active {
        background: #2563eb;
        color: #ffffff;
        border-color: #3b82f6;
      }
    }

    .tour-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-top: var(--space-2);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tour-label {
      font-size: 10px;
      color: #94a3b8;
      font-weight: 500;
    }

    .tour-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #10b981;
      border: none;
      color: #ffffff;
      border-radius: var(--radius-sm);
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;

      mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }

      &.reset {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    /* Environment Toolbar */
    .env-toolbar {
      position: absolute;
      top: var(--space-4);
      right: var(--space-4);
      z-index: 20;
      width: 300px;
      padding: var(--space-3) var(--space-4);
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-lg);
      backdrop-filter: blur(10px);
      color: #ffffff;
    }

    .env-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin-bottom: var(--space-2);
    }

    .slider-row {
      display: flex;
      flex-direction: column;
      margin-bottom: var(--space-2);
    }

    .slider-label {
      font-size: 10px;
      color: #cbd5e1;
    }

    .slider-val {
      font-size: 10px;
      color: #60a5fa;
      font-family: var(--font-mono);
      text-align: right;
      margin-top: -8px;
    }

    .full-slider {
      width: 100%;
    }

    .layer-pills {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: var(--space-2);
    }

    .layer-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-pill);
      padding: 3px 8px;
      font-size: 10px;
      color: #94a3b8;
      cursor: pointer;
      user-select: none;

      mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }

      &.active {
        background: rgba(37, 99, 235, 0.25);
        color: #93c5fd;
        border-color: #3b82f6;
      }
    }

    /* Entity Selection Overlay */
    .entity-overlay {
      position: absolute;
      bottom: var(--space-6);
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      width: 360px;
      padding: var(--space-3) var(--space-4);
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-floating);
    }

    .ent-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      strong { font-size: 13px; }
    }

    .ent-close {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 0;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .ent-desc {
      font-size: 11px;
      color: var(--text-secondary);
      margin: 0 0 6px 0;
    }
  `]
})
export class DigitalTwin3dComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cesiumContainer', { static: true }) container!: ElementRef;

  currentMode = signal<'free-fly' | 'orbit' | 'walk'>('orbit');
  altitude = signal<number>(140);
  heading = signal<number>(45);
  pitch = signal<number>(-35);
  speed = signal<number>(12);
  isFlying = signal<boolean>(true);
  isTourRunning = signal<boolean>(false);

  groundAlpha = 0.85;
  timeOfDay = 14; // 2:00 PM
  showBuildings = true;
  showUtilities = true;
  showClashes = true;

  selectedEntityName = '';
  selectedEntityDesc = '';
  isEstimatedHeight = false;

  private viewer: any = null;
  private tourInterval: any = null;
  private tourStep = 0;

  constructor(
    private drawingService: DrawingService,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initCesium();
  }

  ngOnDestroy(): void {
    if (this.tourInterval) {
      clearInterval(this.tourInterval);
    }
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.destroy();
    }
  }

  private initCesium(): void {
    if (typeof Cesium === 'undefined') {
      console.warn('Cesium library not detected, loading fallback 3D viewport');
      return;
    }

    try {
      this.viewer = new Cesium.Viewer(this.container.nativeElement, {
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false
      });

      // Fly to synthetic workspace area (Amaravati lon: 80.516, lat: 16.513)
      this.resetCamera();
      this.populate3dEntities();

      // Track camera for Drone HUD
      this.viewer.camera.changed.addEventListener(() => {
        const carto = Cesium.Cartographic.fromCartesian(this.viewer.camera.position);
        if (carto) {
          this.altitude.set(carto.height);
          this.heading.set(Cesium.Math.toDegrees(this.viewer.camera.heading));
          this.pitch.set(Cesium.Math.toDegrees(this.viewer.camera.pitch));
        }
      });
    } catch (e) {
      console.error('Cesium init error:', e);
    }
  }

  private populate3dEntities(): void {
    if (!this.viewer) return;

    // 1. Extrude Building Towers (STILT+G+10 = 11 floors x 3m = 33m height)
    // Tower A
    this.viewer.entities.add({
      name: 'Tower A (Residential - GFC Approved)',
      description: 'STILT+G+10 floors. Estimated height 33m based on 3m floor clearance standard.',
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
          80.5150, 16.5125,
          80.5158, 16.5125,
          80.5158, 16.5132,
          80.5150, 16.5132
        ]),
        extrudedHeight: 33.0,
        material: Cesium.Color.fromCssColorString('#2563eb').withAlpha(0.85),
        outline: true,
        outlineColor: Cesium.Color.WHITE
      }
    });

    // Tower B
    this.viewer.entities.add({
      name: 'Tower B (Residential - GFC Approved)',
      description: 'STILT+G+10 floors. Estimated height 33m.',
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
          80.5162, 16.5125,
          80.5170, 16.5125,
          80.5170, 16.5132,
          80.5162, 16.5132
        ]),
        extrudedHeight: 33.0,
        material: Cesium.Color.fromCssColorString('#0284c7').withAlpha(0.85),
        outline: true,
        outlineColor: Cesium.Color.WHITE
      }
    });

    // 2. Underground 3D Utilities (Depth negative Z: Water -1.5m, Sewer -1.7m)
    // Water Main Pipe (-1.5m depth)
    this.viewer.entities.add({
      name: 'Water Supply Main (DN400 Ductile Iron)',
      description: 'Buried depth: 1.5m below surface (Z = -1.5m). Potable water distribution network.',
      polylineVolume: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          80.512, 16.5130, -1.5,
          80.520, 16.5130, -1.5
        ]),
        shape: this.computeCircle(0.4),
        material: Cesium.Color.fromCssColorString('#0891b2')
      }
    });

    // Sewer Line Pipe (-1.7m depth)
    this.viewer.entities.add({
      name: 'Gravity Sewer Main (DN400 RCC)',
      description: 'Buried depth: 1.7m below surface (Z = -1.7m). Gravity flow sewer alignment.',
      polylineVolume: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          80.516, 16.5110, -1.7,
          80.516, 16.5150, -1.7
        ]),
        shape: this.computeCircle(0.4),
        material: Cesium.Color.fromCssColorString('#7c3aed')
      }
    });

    // 3. 3D Spatial Clash Sphere (Water vs Sewer crossing at lon 80.516, lat 16.513)
    this.viewer.entities.add({
      name: '3D Clearance Clash #1 (Water vs Sewer)',
      description: 'Sewer (-1.7m) crosses Water (-1.5m) with only 0.2m separation (tolerance: 0.5m).',
      position: Cesium.Cartesian3.fromDegrees(80.516, 16.513, -1.6),
      ellipsoid: {
        radii: new Cesium.Cartesian3(2.5, 2.5, 2.5),
        material: Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.9),
        outline: true,
        outlineColor: Cesium.Color.WHITE
      }
    });

    // Handle 3D Entity selection
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    handler.setInputAction((click: any) => {
      const picked = this.viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id) {
        this.selectedEntityName = picked.id.name || 'Selected Feature';
        this.selectedEntityDesc = picked.id.description ? picked.id.description.getValue() : '';
        this.isEstimatedHeight = this.selectedEntityName.includes('Tower');
      } else {
        this.selectedEntityName = '';
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  private computeCircle(radius: number): any[] {
    const positions = [];
    for (let i = 0; i < 16; i++) {
      const radians = (i / 16) * Math.PI * 2.0;
      positions.push(new Cesium.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)));
    }
    return positions;
  }

  resetCamera(): void {
    if (!this.viewer) return;
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(80.516, 16.508, 220),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-30),
        roll: 0.0
      },
      duration: 1.5
    });
  }

  setMode(mode: 'free-fly' | 'orbit' | 'walk'): void {
    this.currentMode.set(mode);
    if (!this.viewer) return;

    if (mode === 'walk') {
      // Pedestrian eye height 1.7m
      this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(80.5155, 16.5122, 1.7),
        orientation: {
          heading: Cesium.Math.toRadians(25),
          pitch: Cesium.Math.toRadians(0),
          roll: 0.0
        },
        duration: 1.2
      });
      this.toastService.info('Walk Mode Activated', 'Pedestrian inspection at 1.7m eye-level.');
    } else if (mode === 'orbit') {
      this.resetCamera();
    }
  }

  toggleTour(): void {
    if (this.isTourRunning()) {
      clearInterval(this.tourInterval);
      this.isTourRunning.set(false);
      this.toastService.info('Tour Paused');
    } else {
      this.isTourRunning.set(true);
      this.toastService.success('Tour Started', 'Flying through 5 key inspection waypoints.');
      const waypoints = [
        { lon: 80.512, lat: 16.513, alt: 180, heading: 90, pitch: -25 },
        { lon: 80.515, lat: 16.512, alt: 120, heading: 45, pitch: -20 },
        { lon: 80.516, lat: 16.513, alt: 60, heading: 0, pitch: -45 }, // over clash
        { lon: 80.517, lat: 16.514, alt: 140, heading: 270, pitch: -30 },
        { lon: 80.514, lat: 16.510, alt: 220, heading: 30, pitch: -35 }
      ];

      this.tourInterval = setInterval(() => {
        const wp = waypoints[this.tourStep % waypoints.length];
        this.tourStep++;
        this.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, wp.alt),
          orientation: {
            heading: Cesium.Math.toRadians(wp.heading),
            pitch: Cesium.Math.toRadians(wp.pitch),
            roll: 0.0
          },
          duration: 3.5
        });
      }, 4000);
    }
  }

  updateGroundAlpha(): void {
    if (!this.viewer) return;
    this.viewer.scene.globe.translucency.enabled = true;
    this.viewer.scene.globe.translucency.frontFaceAlpha = this.groundAlpha;
  }

  updateTimeOfDay(): void {
    if (!this.viewer) return;
    const date = new Date(2026, 10, 9, Math.floor(this.timeOfDay), (this.timeOfDay % 1) * 60);
    this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(date);
  }

  formatHour(hour: number): string {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h;
    return `${displayH}:${m < 10 ? '0' : ''}${m} ${ampm}`;
  }

  toggleLayer(type: 'bldg' | 'pipes' | 'clashes'): void {
    if (!this.viewer) return;
    if (type === 'bldg') this.showBuildings = !this.showBuildings;
    if (type === 'pipes') this.showUtilities = !this.showUtilities;
    if (type === 'clashes') this.showClashes = !this.showClashes;

    const entities = this.viewer.entities.values;
    for (const ent of entities) {
      if (type === 'bldg' && ent.name?.includes('Tower')) ent.show = this.showBuildings;
      if (type === 'pipes' && (ent.name?.includes('Pipe') || ent.name?.includes('Main'))) ent.show = this.showUtilities;
      if (type === 'clashes' && ent.name?.includes('Clash')) ent.show = this.showClashes;
    }
  }
}

