import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DrawingService } from '../../core/services/drawing.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardStats, Workspace } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressBarModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dashboard-container">
      <div class="header-row">
        <div>
          <h2>Construction Progress Dashboard</h2>
          <p class="subtitle" *ngIf="workspace">Workspace: {{ workspace.name }}</p>
        </div>
        <div class="actions">
          <a mat-stroked-button [href]="exportGeoJsonUrl" target="_blank">
            <mat-icon>public</mat-icon> Export Features (GeoJSON)
          </a>
          <a mat-stroked-button [href]="exportCsvUrl" target="_blank">
            <mat-icon>table_chart</mat-icon> Export Clashes (CSV)
          </a>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid" *ngIf="stats">
        <mat-card class="kpi-card">
          <div class="kpi-value">{{ stats.totalDrawings }}</div>
          <div class="kpi-label">Drawings Ingested</div>
        </mat-card>

        <mat-card class="kpi-card">
          <div class="kpi-value">{{ stats.totalFeatures }}</div>
          <div class="kpi-label">Active Features on Map</div>
        </mat-card>

        <mat-card class="kpi-card" [class.alert-card]="stats.openClashes > 0">
          <div class="kpi-value">{{ stats.openClashes }}</div>
          <div class="kpi-label">Open 3D Clashes</div>
        </mat-card>

        <mat-card class="kpi-card">
          <div class="kpi-value">{{ stats.statusCounts['Approved'] || 0 }}</div>
          <div class="kpi-label">Approved Drawings</div>
        </mat-card>
      </div>

      <!-- Road Chainage Progress Section -->
      <mat-card class="section-card" *ngIf="stats && stats.roadProgress.length > 0">
        <mat-card-header>
          <mat-card-title>Road Chainage Construction Progress</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div *ngFor="let road of stats.roadProgress" class="road-item">
            <div class="road-header">
              <strong>{{ road.roadName }}</strong>
              <span>{{ road.completedLengthM | number:'1.0-0' }} m / {{ road.totalLengthM | number:'1.0-0' }} m ({{ road.percentComplete }}%) &bull; <em>{{ road.status }}</em></span>
            </div>
            <mat-progress-bar mode="determinate" [value]="road.percentComplete" class="progress-bar"></mat-progress-bar>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Category Breakdown -->
      <div class="two-col-grid" *ngIf="stats">
        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title>Features by Category</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngFor="let cat of getObjectEntries(stats.categoryCounts)" class="stat-row">
              <span>{{ cat.key }}</span>
              <span class="badge">{{ cat.val }} features</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title>Recent Uploads</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngFor="let upload of stats.recentUploads" class="recent-upload-row">
              <div>
                <strong>{{ upload.projectName }}</strong>
                <div class="meta">{{ upload.category }} &rsaquo; {{ upload.subType }} (Rev {{ upload.currentRevision }})</div>
              </div>
              <span class="status-tag">{{ upload.status }}</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 32px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .subtitle {
      color: #666;
      margin-top: -6px;
    }
    .actions {
      display: flex;
      gap: 12px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      padding: 20px;
      text-align: center;
    }
    .kpi-value {
      font-size: 36px;
      font-weight: 700;
      color: #1976d2;
    }
    .kpi-label {
      font-size: 13px;
      color: #666;
      margin-top: 4px;
      text-transform: uppercase;
      font-weight: 500;
    }
    .alert-card .kpi-value {
      color: #d32f2f;
    }
    .section-card {
      margin-bottom: 24px;
      padding: 20px;
    }
    .road-item {
      margin-bottom: 16px;
    }
    .road-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 13px;
    }
    .progress-bar {
      height: 10px;
      border-radius: 5px;
    }
    .two-col-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 20px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 12px;
    }
    .recent-upload-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .meta {
      font-size: 12px;
      color: #666;
    }
    .status-tag {
      background: #f5f5f5;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  workspace: Workspace | null = null;
  stats: DashboardStats | null = null;
  exportGeoJsonUrl = '';
  exportCsvUrl = '';

  constructor(
    private drawingService: DrawingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.workspace = this.authService.activeWorkspace();
    if (this.workspace) {
      this.exportGeoJsonUrl = this.drawingService.exportGeoJsonUrl(this.workspace.id);
      this.exportCsvUrl = this.drawingService.exportClashesCsvUrl(this.workspace.id);
      this.loadDashboard();
    }
  }

  loadDashboard(): void {
    if (!this.workspace) return;
    this.drawingService.getDashboardStats(this.workspace.id).subscribe({
      next: (data) => this.stats = data
    });
  }

  getObjectEntries(obj: Record<string, number>): { key: string; val: number }[] {
    return Object.keys(obj || {}).map(k => ({ key: k, val: obj[k] }));
  }
}
