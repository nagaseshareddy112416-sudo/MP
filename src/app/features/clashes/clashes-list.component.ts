import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { DrawingService } from '../../core/services/drawing.service';
import { AuthService } from '../../core/services/auth.service';
import { Clash, Workspace } from '../../core/models/models';

@Component({
  selector: 'app-clashes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatSelectModule],
  template: `
    <div class="clashes-container">
      <div class="header-row">
        <div>
          <h2>3D Spatial Clashes & Conflicts</h2>
          <p class="subtitle" *ngIf="workspace">Workspace: {{ workspace.name }} &bull; Vertical tolerance: {{ workspace.clashVerticalToleranceM }} m</p>
        </div>
        <div class="actions">
          <a mat-stroked-button [href]="exportCsvUrl" target="_blank">
            <mat-icon>download</mat-icon> Export CSV
          </a>
          <button mat-stroked-button (click)="loadClashes()">
            <mat-icon>refresh</mat-icon> Refresh
          </button>
        </div>
      </div>

      <mat-card class="content-card">
        <div *ngIf="clashes.length === 0" class="empty-state">
          <mat-icon class="check-icon">verified</mat-icon>
          <h3>No Clashes Detected!</h3>
          <p>All utilities and structures meet the required 3D vertical clearance tolerance.</p>
        </div>

        <table *ngIf="clashes.length > 0" mat-table [dataSource]="clashes" class="clashes-table">
          <ng-container mat-columnDef="features">
            <th mat-header-cell *matHeaderCellDef> Conflict Elements </th>
            <td mat-cell *matCellDef="let c">
              <div class="feature-pair">
                <span class="feat-badge">{{ c.featureACategory }} ({{ c.featureASubType }}) [Depth: {{ c.featureADepth }}m]</span>
                <span class="vs">vs</span>
                <span class="feat-badge">{{ c.featureBCategory }} ({{ c.featureBSubType }}) [Depth: {{ c.featureBDepth }}m]</span>
              </div>
              <div class="conflict-notes">{{ c.notes }}</div>
            </td>
          </ng-container>

          <ng-container mat-columnDef="location">
            <th mat-header-cell *matHeaderCellDef> Coordinates </th>
            <td mat-cell *matCellDef="let c">
              <code>{{ c.lon | number:'1.5-5' }}°E, {{ c.lat | number:'1.5-5' }}°N</code>
            </td>
          </ng-container>

          <ng-container mat-columnDef="gap">
            <th mat-header-cell *matHeaderCellDef> Vertical Gap </th>
            <td mat-cell *matCellDef="let c">
              <span class="gap-badge">{{ c.verticalGapM }} m</span>
            </td>
          </ng-container>

          <ng-container mat-columnDef="status">
            <th mat-header-cell *matHeaderCellDef> Status </th>
            <td mat-cell *matCellDef="let c">
              <mat-select [value]="c.status" (selectionChange)="updateStatus(c, $event.value)" class="status-select">
                <mat-option [value]="0">Open</mat-option>
                <mat-option [value]="1">Resolved</mat-option>
                <mat-option [value]="2">Ignored</mat-option>
              </mat-select>
            </td>
          </ng-container>

          <ng-container mat-columnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Map </th>
            <td mat-cell *matCellDef="let c">
              <button mat-icon-button color="primary" (click)="zoomToClash(c)" title="View on map">
                <mat-icon>place</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
      </mat-card>
    </div>
  `,
  styles: [`
    .clashes-container {
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
    .content-card {
      padding: 0;
      overflow: hidden;
    }
    .clashes-table {
      width: 100%;
    }
    .feature-pair {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .feat-badge {
      background: #f5f5f5;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 13px;
    }
    .vs {
      color: #d32f2f;
      font-weight: 700;
    }
    .conflict-notes {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .gap-badge {
      background: #ffebee;
      color: #c62828;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .status-select {
      width: 110px;
    }
    .empty-state {
      padding: 64px 24px;
      text-align: center;
      color: #666;
    }
    .check-icon {
      font-size: 56px;
      height: 56px;
      width: 56px;
      color: #2e7d32;
      margin-bottom: 12px;
    }
  `]
})
export class ClashesListComponent implements OnInit {
  workspace: Workspace | null = null;
  clashes: Clash[] = [];
  columns = ['features', 'location', 'gap', 'status', 'actions'];
  exportCsvUrl = '';

  constructor(
    private drawingService: DrawingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.workspace = this.authService.activeWorkspace();
    if (this.workspace) {
      this.exportCsvUrl = this.drawingService.exportClashesCsvUrl(this.workspace.id);
      this.loadClashes();
    }
  }

  loadClashes(): void {
    if (!this.workspace) return;
    this.drawingService.getClashes(this.workspace.id).subscribe({
      next: (data) => this.clashes = data
    });
  }

  updateStatus(clash: Clash, status: number): void {
    if (!this.workspace) return;
    this.drawingService.updateClashStatus(this.workspace.id, clash.id, status).subscribe({
      next: () => {
        clash.status = status;
      }
    });
  }

  zoomToClash(clash: Clash): void {
    this.router.navigate(['/map']);
  }
}

