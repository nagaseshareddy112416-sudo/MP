import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DrawingService } from '../../core/services/drawing.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Workspace, Drawing, ComplianceResult, ComplianceSummary,
  Deviation, ReviewDeviationRequest
} from '../../core/models/models';

@Component({
  selector: 'app-compliance',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatProgressBarModule, MatTooltipModule
  ],
  template: `
    <div class="compliance-container">
      <div class="header-row">
        <div>
          <h2>Drawing Stages & As-Built Compliance</h2>
          <p class="subtitle" *ngIf="workspace">Workspace: <strong>{{ workspace.name }}</strong></p>
        </div>
        <div class="header-actions">
          <a mat-raised-button color="accent" routerLink="/map">
            <mat-icon>map</mat-icon> Open Web Map (Compare Mode)
          </a>
          <button mat-stroked-button (click)="refreshAll()">
            <mat-icon>refresh</mat-icon> Refresh
          </button>
        </div>
      </div>

      <!-- Non-survey Warning if active -->
      <div *ngIf="hasNonSurveyWarning" class="warning-banner">
        <mat-icon>warning</mat-icon>
        <div>
          <strong>Coordinate Source Warning:</strong> This as-built drawing was ingested with coordinates from a non-survey source
          (<em>{{ activeResultSource }}</em>). Non-survey as-builts require secondary on-site verification before engineering signoff.
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid" *ngIf="summary">
        <mat-card class="kpi-card" [class.kpi-good]="summary.compliancePercentage >= 90">
          <div class="kpi-label">Compliance Rate</div>
          <div class="kpi-value">{{ summary.compliancePercentage }}%</div>
          <mat-progress-bar mode="determinate" [value]="summary.compliancePercentage"></mat-progress-bar>
          <div class="kpi-sub">{{ summary.compliantCount + summary.withinToleranceCount }} passing / {{ summary.totalFeatures }} features</div>
        </mat-card>

        <mat-card class="kpi-card">
          <div class="kpi-label">Classification Breakdown</div>
          <div class="breakdown-chips">
            <span class="chip-status chip-compliant" matTooltip="Identical or zero deviation">🟢 {{ summary.compliantCount }} Compliant</span>
            <span class="chip-status chip-tolerance" matTooltip="Within tolerance limit">🟡 {{ summary.withinToleranceCount }} In Tol</span>
            <span class="chip-status chip-deviation" matTooltip="Exceeds tolerance limit">🔴 {{ summary.deviationCount }} Deviation</span>
            <span class="chip-status chip-missing" matTooltip="GFC feature omitted">⚪ {{ summary.missingCount }} Missing</span>
            <span class="chip-status chip-extra" matTooltip="Unplanned as-built feature">🟣 {{ summary.extraCount }} Extra</span>
          </div>
        </mat-card>

        <mat-card class="kpi-card" [class.kpi-warn]="summary.openDeviationsCount > 0">
          <div class="kpi-label">Open Deviations</div>
          <div class="kpi-value text-warn">{{ summary.openDeviationsCount }}</div>
          <div class="kpi-sub">{{ summary.acceptedDeviationsCount }} accepted with engineering reason</div>
        </mat-card>
      </div>

      <!-- As-Built Drawing Evaluation Selector -->
      <mat-card class="eval-card">
        <div class="eval-row">
          <mat-form-field appearance="outline" class="drawing-select">
            <mat-label>Select As-Built Drawing to Evaluate</mat-label>
            <mat-select [(ngModel)]="selectedDrawingId" (selectionChange)="onDrawingSelected($event.value)">
              <mat-option *ngFor="let d of asBuiltDrawings" [value]="d.id">
                {{ d.projectName }} (Rev {{ d.currentRevision }} - {{ d.category }})
              </mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-raised-button color="primary" [disabled]="!selectedDrawingId || evaluating" (click)="evaluateSelected()">
            <mat-icon>play_arrow</mat-icon> {{ evaluating ? 'Evaluating...' : 'Run Compliance Engine' }}
          </button>

          <div class="export-group" *ngIf="selectedDrawingId && results.length > 0">
            <a mat-stroked-button [href]="csvExportUrl" target="_blank">
              <mat-icon>download</mat-icon> Export CSV
            </a>
            <a mat-stroked-button [href]="geoJsonExportUrl" target="_blank">
              <mat-icon>layers</mat-icon> Export GeoJSON
            </a>
          </div>
        </div>
      </mat-card>

      <!-- Empty State -->
      <mat-card *ngIf="results.length === 0" class="empty-card">
        <mat-icon class="empty-icon">verified_user</mat-icon>
        <h3>No Compliance Results Available</h3>
        <p *ngIf="asBuiltDrawings.length === 0">
          No As-Built drawings have been uploaded for this workspace yet. Upload drawings with stage "As-Built" in the Upload section.
        </p>
        <p *ngIf="asBuiltDrawings.length > 0">
          Select an As-Built drawing above and click <strong>"Run Compliance Engine"</strong> to evaluate against its baseline GFC design.
        </p>
      </mat-card>

      <!-- Compliance Results & Deviations Table -->
      <mat-card *ngIf="results.length > 0" class="table-card">
        <div class="table-header">
          <h3>Evaluated Feature Results ({{ results.length }})</h3>
        </div>

        <table mat-table [dataSource]="results" class="compliance-table">
          <ng-container mat-columnDef="category">
            <th mat-header-cell *matHeaderCellDef> Category / Sub-Type </th>
            <td mat-cell *matCellDef="let r">
              <strong>{{ r.category }}</strong> &rsaquo; {{ r.subType }}
              <div *ngIf="r.chainageStart != null" class="cell-sub">Chainage: {{ r.chainageStart | number:'1.1-1' }} m</div>
            </td>
          </ng-container>

          <ng-container mat-columnDef="status">
            <th mat-header-cell *matHeaderCellDef> Classification </th>
            <td mat-cell *matCellDef="let r">
              <span class="chip-status" [ngClass]="getStatusClass(r.status)">
                {{ r.status }}
              </span>
            </td>
          </ng-container>

          <ng-container mat-columnDef="deviations">
            <th mat-header-cell *matHeaderCellDef> Measured Deviations </th>
            <td mat-cell *matCellDef="let r">
              <div class="dev-metrics">
                <div><span>Horiz:</span> <strong>{{ r.horizontalDeviationM | number:'1.2-2' }} m</strong></div>
                <div><span>Vert:</span> <strong>{{ r.verticalDeviationM | number:'1.2-2' }} m</strong></div>
                <div *ngIf="r.lengthDeviationM > 0"><span>Length:</span> <strong>{{ r.lengthDeviationM | number:'1.2-2' }} m</strong></div>
              </div>
            </td>
          </ng-container>

          <ng-container mat-columnDef="decision">
            <th mat-header-cell *matHeaderCellDef> Review Decision </th>
            <td mat-cell *matCellDef="let r">
              <div *ngIf="r.deviations && r.deviations.length > 0">
                <span class="decision-badge" [ngClass]="getDecisionClass(r.deviations[0].decision)">
                  {{ r.deviations[0].decision || 'Pending' }}
                </span>
                <div *ngIf="r.deviations[0].reason" class="decision-reason">
                  "{{ r.deviations[0].reason }}"
                </div>
              </div>
              <span *ngIf="!r.deviations || r.deviations.length === 0" class="text-muted">N/A (Compliant)</span>
            </td>
          </ng-container>

          <ng-container mat-columnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let r">
              <button *ngIf="r.deviations && r.deviations.length > 0" mat-stroked-button color="primary" (click)="openReviewModal(r)">
                <mat-icon>gavel</mat-icon> Review Decision
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
      </mat-card>

      <!-- Review Decision Dialog -->
      <div *ngIf="reviewingItem" class="modal-backdrop">
        <mat-card class="modal-card">
          <mat-card-header>
            <mat-card-title>Review As-Built Deviation</mat-card-title>
            <mat-card-subtitle>{{ reviewingItem.category }} - {{ reviewingItem.subType }}</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div class="metrics-summary">
              <div><strong>Horizontal Deviation:</strong> {{ reviewingItem.horizontalDeviationM | number:'1.2-2' }} m</div>
              <div><strong>Vertical Deviation:</strong> {{ reviewingItem.verticalDeviationM | number:'1.2-2' }} m</div>
              <div><strong>Classification:</strong> <span class="chip-status" [ngClass]="getStatusClass(reviewingItem.status)">{{ reviewingItem.status }}</span></div>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Engineering Decision</mat-label>
              <mat-select [(ngModel)]="reviewForm.decision" required>
                <mat-option value="Accepted">Accepted (Accept deviation into record)</mat-option>
                <mat-option value="Rectify">Rectify (Raise rework/rectification request)</mat-option>
                <mat-option value="Rejected">Rejected (Do not accept)</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mandatory Engineering Reason / Justification</mat-label>
              <textarea matInput [(ngModel)]="reviewForm.reason" rows="3" required placeholder="e.g. Approved by Lead Civil Engineer due to site rock outcrop obstacle."></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Additional Notes / Comments (Optional)</mat-label>
              <input matInput [(ngModel)]="reviewForm.comment" placeholder="Any additional site instructions">
            </mat-form-field>

            <div *ngIf="reviewError" class="error-banner">{{ reviewError }}</div>

            <div class="modal-actions">
              <button mat-button (click)="reviewingItem = null">Cancel</button>
              <button mat-raised-button color="primary" [disabled]="!reviewForm.reason" (click)="submitReview()">
                <mat-icon>check</mat-icon> Save Decision & Audit Log
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .compliance-container {
      padding: 32px;
      max-width: 1300px;
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
    .header-actions {
      display: flex;
      gap: 12px;
    }
    .warning-banner {
      background: #fff8e1;
      color: #b78103;
      border: 1px solid #ffe082;
      border-radius: 8px;
      padding: 14px 18px;
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .kpi-card {
      padding: 20px;
      border-radius: 12px;
    }
    .kpi-good {
      border-left: 5px solid #2e7d32;
    }
    .kpi-warn {
      border-left: 5px solid #f57f17;
    }
    .kpi-label {
      font-size: 13px;
      color: #666;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .kpi-value {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .kpi-sub {
      font-size: 12px;
      color: #888;
      margin-top: 6px;
    }
    .text-warn {
      color: #e65100;
    }
    .breakdown-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .chip-status {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 12px;
      text-transform: uppercase;
      display: inline-block;
    }
    .chip-compliant { background: #e8f5e9; color: #2e7d32; }
    .chip-tolerance { background: #fff8e1; color: #b78103; }
    .chip-deviation { background: #ffebee; color: #c62828; }
    .chip-missing { background: #eeeeee; color: #616161; }
    .chip-extra { background: #f3e5f5; color: #7b1fa2; }

    .eval-card {
      padding: 20px;
      margin-bottom: 24px;
      border-radius: 12px;
    }
    .eval-row {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    .drawing-select {
      flex: 1;
      min-width: 300px;
    }
    .export-group {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }
    .table-card {
      padding: 0;
      border-radius: 12px;
      overflow: hidden;
    }
    .table-header {
      padding: 16px 24px;
      border-bottom: 1px solid #eee;
    }
    .compliance-table {
      width: 100%;
    }
    .cell-sub {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .dev-metrics {
      display: flex;
      gap: 12px;
      font-size: 12px;
    }
    .dev-metrics span {
      color: #888;
    }
    .decision-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 10px;
      text-transform: uppercase;
    }
    .dec-accepted { background: #e8f5e9; color: #2e7d32; }
    .dec-pending { background: #fff8e1; color: #b78103; }
    .dec-rectify { background: #ffe0b2; color: #e65100; }
    .dec-rejected { background: #ffebee; color: #c62828; }
    .decision-reason {
      font-size: 11px;
      color: #555;
      margin-top: 4px;
      font-style: italic;
    }
    .empty-card {
      padding: 48px;
      text-align: center;
      border-radius: 12px;
    }
    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #bbb;
      margin-bottom: 12px;
    }
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .modal-card {
      width: 520px;
      max-width: 90vw;
      padding: 24px;
      border-radius: 12px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 12px;
    }
    .metrics-summary {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 16px;
    }
    .error-banner {
      background: #ffebee;
      color: #c62828;
      padding: 8px 12px;
      border-radius: 6px;
      margin-top: 8px;
    }
  `]
})
export class ComplianceComponent implements OnInit {
  workspace: Workspace | null = null;
  summary: ComplianceSummary | null = null;
  asBuiltDrawings: Drawing[] = [];
  selectedDrawingId: string | null = null;
  results: ComplianceResult[] = [];
  evaluating = false;
  hasNonSurveyWarning = false;
  activeResultSource = '';

  columns = ['category', 'status', 'deviations', 'decision', 'actions'];

  reviewingItem: ComplianceResult | null = null;
  reviewForm: ReviewDeviationRequest = {
    decision: 'Accepted',
    reason: '',
    comment: ''
  };
  reviewError = '';

  constructor(
    private drawingService: DrawingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.workspace = this.authService.activeWorkspace();
    if (this.workspace) {
      this.refreshAll();
    }
  }

  refreshAll(): void {
    if (!this.workspace) return;
    const wsId = this.workspace.id;

    this.drawingService.getComplianceSummary(wsId).subscribe({
      next: (sum) => this.summary = sum
    });

    this.drawingService.getDrawings(wsId).subscribe({
      next: (drawings) => {
        this.asBuiltDrawings = drawings.filter(d => 
          d.stageName?.toLowerCase().includes('as-built') ||
          d.projectName.toUpperCase().includes('ASBUILT')
        );
        if (this.asBuiltDrawings.length > 0 && !this.selectedDrawingId) {
          this.selectedDrawingId = this.asBuiltDrawings[0].id;
          this.loadResults(this.selectedDrawingId);
        }
      }
    });
  }

  onDrawingSelected(drawingId: string): void {
    this.selectedDrawingId = drawingId;
    this.loadResults(drawingId);
  }

  loadResults(drawingId: string): void {
    if (!this.workspace) return;
    this.drawingService.getComplianceResults(this.workspace.id, drawingId).subscribe({
      next: (res) => {
        this.results = res;
        this.updateWarningState();
      }
    });
  }

  evaluateSelected(): void {
    if (!this.workspace || !this.selectedDrawingId) return;
    this.evaluating = true;
    this.drawingService.evaluateCompliance(this.workspace.id, this.selectedDrawingId).subscribe({
      next: (res) => {
        this.evaluating = false;
        this.results = res;
        this.updateWarningState();
        this.refreshAll();
      },
      error: () => {
        this.evaluating = false;
      }
    });
  }

  updateWarningState(): void {
    if (this.results.length > 0) {
      this.hasNonSurveyWarning = !!this.results[0].hasNonSurveyWarning;
      this.activeResultSource = this.results[0].sourceOfCoordinates || 'Unknown';
    } else {
      this.hasNonSurveyWarning = false;
    }
  }

  openReviewModal(item: ComplianceResult): void {
    this.reviewingItem = item;
    this.reviewError = '';
    const latestDev = item.deviations[0];
    this.reviewForm = {
      decision: (latestDev.decision as any) === 'Pending' ? 'Accepted' : (latestDev.decision as any) || 'Accepted',
      reason: latestDev.reason || '',
      comment: latestDev.comment || ''
    };
  }

  submitReview(): void {
    if (!this.workspace || !this.reviewingItem || !this.reviewingItem.deviations[0]) return;
    if (!this.reviewForm.reason?.trim()) {
      this.reviewError = 'Mandatory engineering reason must be provided.';
      return;
    }

    const devId = this.reviewingItem.deviations[0].id;
    this.drawingService.reviewDeviation(this.workspace.id, devId, this.reviewForm).subscribe({
      next: () => {
        this.reviewingItem = null;
        if (this.selectedDrawingId) {
          this.loadResults(this.selectedDrawingId);
        }
        this.refreshAll();
      },
      error: (err) => {
        this.reviewError = err.error?.message || 'Failed to save review decision.';
      }
    });
  }

  get csvExportUrl(): string {
    if (!this.workspace || !this.selectedDrawingId) return '#';
    return this.drawingService.exportComplianceCsvUrl(this.workspace.id, this.selectedDrawingId);
  }

  get geoJsonExportUrl(): string {
    if (!this.workspace || !this.selectedDrawingId) return '#';
    return this.drawingService.exportComplianceGeoJsonUrl(this.workspace.id, this.selectedDrawingId);
  }

  getStatusClass(status: string): string {
    const s = String(status).toLowerCase();
    if (s.includes('compliant')) return 'chip-compliant';
    if (s.includes('tolerance')) return 'chip-tolerance';
    if (s.includes('deviation')) return 'chip-deviation';
    if (s.includes('missing')) return 'chip-missing';
    if (s.includes('extra')) return 'chip-extra';
    return '';
  }

  getDecisionClass(dec: string): string {
    const d = String(dec).toLowerCase();
    if (d === 'accepted') return 'dec-accepted';
    if (d === 'rectify') return 'dec-rectify';
    if (d === 'rejected') return 'dec-rejected';
    return 'dec-pending';
  }
}
