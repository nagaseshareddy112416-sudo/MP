import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DrawingService } from '../../core/services/drawing.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AuthService } from '../../core/services/auth.service';
import { Drawing, DrawingRevision, Workspace } from '../../core/models/models';

@Component({
  selector: 'app-revision-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, MatCardModule, MatTableModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatTooltipModule
  ],
  template: `
    <div class="revisions-container">
      <div class="header-row">
        <div>
          <h2>Drawings & Revision Approval Queue</h2>
          <p class="subtitle" *ngIf="workspace">Workspace: <strong>{{ workspace.name }}</strong></p>
        </div>
        <div class="header-actions">
          <a mat-raised-button color="accent" routerLink="/map">
            <mat-icon>map</mat-icon> Open Web Map
          </a>
          <button mat-stroked-button (click)="loadDrawings()">
            <mat-icon>refresh</mat-icon> Refresh
          </button>
        </div>
      </div>

      <div *ngIf="message" class="info-banner">{{ message }}</div>

      <!-- Empty State -->
      <mat-card *ngIf="drawings.length === 0" class="empty-card">
        <mat-icon class="empty-icon">layers_clear</mat-icon>
        <h3>No Drawings in Queue</h3>
        <p>No Good For Construction (GFC) drawings have been uploaded for this workspace yet.</p>
        <a mat-raised-button color="primary" routerLink="/upload">
          <mat-icon>cloud_upload</mat-icon> Upload GFC Drawing
        </a>
      </mat-card>

      <!-- Drawings Table -->
      <mat-card *ngIf="drawings && drawings.length > 0" class="content-card">
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Project Drawing</th>
                <th>Category / Sub-Type</th>
                <th>Current Rev</th>
                <th>Processing</th>
                <th>Map & Review Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of drawings" class="table-row">
                <td>
                  <div class="project-cell">
                    <strong>{{ d.projectName }}</strong>
                    <div class="file-name">{{ d.originalFileName }} ({{ d.fileType }})</div>
                  </div>
                </td>
                <td>
                  <span class="category-chip">{{ d.category }} &rsaquo; {{ d.subType }}</span>
                </td>
                <td>
                  <span class="badge-rev">{{ d.currentRevision }}</span>
                </td>
                <td>
                  <span class="status-chip" [ngClass]="getStatusClass(d.processingStatus)">
                    {{ d.processingStatus || 'Completed' }}
                  </span>
                  <div *ngIf="d.processingError" class="error-text">{{ d.processingError }}</div>
                </td>
                <td>
                  <span class="status-chip" [ngClass]="getStatusClass(d.reviewStatus)">
                    {{ getReviewStatusText(d.reviewStatus) }}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <a *ngIf="isApproved(d)" mat-raised-button color="primary" [routerLink]="['/map']" [queryParams]="{ drawingId: d.id }" matTooltip="View this drawing on the map">
                      <mat-icon>map</mat-icon> View on Map
                    </a>
                    <button *ngIf="!isApproved(d)" mat-raised-button color="accent" (click)="quickApprove(d)" matTooltip="Approve and activate this drawing on the map">
                      <mat-icon>check_circle</mat-icon> Approve to Map
                    </button>
                    <button mat-stroked-button (click)="viewRevisions(d)">
                      <mat-icon>history</mat-icon> Revisions
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>

      <!-- Revisions Detail Drawer/Modal -->
      <div *ngIf="selectedDrawing" class="modal-backdrop">
        <mat-card class="modal-card">
          <mat-card-header>
            <mat-card-title>Revisions: {{ selectedDrawing.projectName }}</mat-card-title>
            <mat-card-subtitle>{{ selectedDrawing.category }} - {{ selectedDrawing.subType }}</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div *ngIf="revisions.length === 0" class="empty-state">No revisions found for this drawing.</div>

            <div *ngFor="let rev of revisions" class="rev-row" [class.active-rev]="rev.isActive">
              <div class="rev-info">
                <span class="rev-badge">{{ rev.revisionNumber }}</span>
                <span *ngIf="rev.isActive" class="active-tag">Active on Map</span>
                <span class="status-chip" [ngClass]="getStatusClass(rev.reviewStatus)">{{ getReviewStatusText(rev.reviewStatus) }}</span>
                <div class="rev-meta">
                  Submitted by {{ rev.createdBy || 'User' }} on {{ rev.createdAt | date:'short' }} &bull; {{ rev.featureCount }} features
                </div>
                <div *ngIf="rev.reviewComments" class="review-comments">
                  <em>Note: {{ rev.reviewComments }}</em>
                </div>
              </div>

              <div class="rev-actions">
                <button *ngIf="!rev.isActive" mat-raised-button color="primary" (click)="review(rev, true)">
                  <mat-icon>check</mat-icon> Approve to Map
                </button>
                <button *ngIf="!rev.isActive" mat-button color="warn" (click)="review(rev, false)">
                  <mat-icon>close</mat-icon> Reject
                </button>
                <a *ngIf="rev.isActive" mat-raised-button color="accent" routerLink="/map">
                  <mat-icon>map</mat-icon> View on Map
                </a>
              </div>
            </div>

            <div class="modal-footer">
              <button mat-button (click)="selectedDrawing = null">Close</button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .revisions-container {
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
    .header-actions {
      display: flex;
      gap: 12px;
    }
    .subtitle {
      color: #666;
      margin-top: -6px;
    }
    .content-card {
      padding: 0;
      overflow: hidden;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
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
      color: #9e9e9e;
      margin-bottom: 12px;
    }
    .table-responsive {
      overflow-x: auto;
      width: 100%;
    }
    .custom-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .custom-table th {
      background: #f8f9fa;
      padding: 14px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #555;
      border-bottom: 2px solid #e9ecef;
    }
    .custom-table td {
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      vertical-align: middle;
    }
    .custom-table tr:hover td {
      background: #fafafa;
    }
    .drawings-table {
      width: 100%;
    }
    .project-cell {
      padding: 8px 0;
    }
    .file-name {
      font-size: 11px;
      color: #888;
      font-family: monospace;
      margin-top: 2px;
    }
    .badge-rev {
      background: #e0e0e0;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
    }
    .category-chip {
      background: #e3f2fd;
      color: #1565c0;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-chip {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      display: inline-block;
    }
    .status-chip.approved, .status-chip.completed { background: #e8f5e9; color: #2e7d32; }
    .status-chip.pending, .status-chip.pendingreview, .status-chip.queued { background: #fff8e1; color: #f57f17; }
    .status-chip.rejected, .status-chip.failed { background: #ffebee; color: #c62828; }
    .status-chip.processing { background: #e3f2fd; color: #1565c0; }
    .row-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .error-text {
      color: #c62828;
      font-size: 11px;
      margin-top: 2px;
    }
    .info-banner {
      background: #e8f5e9;
      color: #2e7d32;
      border-left: 4px solid #2e7d32;
      padding: 14px 16px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-weight: 500;
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
      max-width: 650px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 24px;
      border-radius: 12px;
    }
    .rev-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #eee;
    }
    .active-rev {
      background: #f1f8e9;
      border-radius: 8px;
    }
    .active-tag {
      background: #4caf50;
      color: white;
      font-size: 11px;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 10px;
      margin-left: 6px;
    }
    .rev-meta {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .review-comments {
      font-size: 12px;
      color: #444;
      margin-top: 4px;
    }
    .rev-actions {
      display: flex;
      gap: 8px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
  `]
})
export class RevisionHistoryComponent implements OnInit {
  workspace: Workspace | null = null;
  drawings: Drawing[] = [];
  selectedDrawing: Drawing | null = null;
  revisions: DrawingRevision[] = [];
  columns = ['project', 'category', 'revision', 'processing', 'status', 'actions'];
  message = '';

  constructor(
    private drawingService: DrawingService,
    private workspaceService: WorkspaceService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.workspace = this.authService.activeWorkspace();
    if (this.workspace) {
      this.loadDrawings();
    } else {
      this.workspaceService.getWorkspaces().subscribe({
        next: (wsList) => {
          if (wsList.length > 0) {
            this.authService.setActiveWorkspace(wsList[0]);
            this.workspace = wsList[0];
            this.loadDrawings();
          }
        }
      });
    }
  }

  loadDrawings(): void {
    if (!this.workspace) return;
    this.drawingService.getDrawings(this.workspace.id).subscribe({
      next: (data) => {
        this.drawings = data || [];
      },
      error: (err) => {
        console.error('Error loading drawings', err);
        this.message = 'Failed to load drawings. Please refresh or check connection.';
      }
    });
  }

  isApproved(d: Drawing): boolean {
    const s = String(d.reviewStatus);
    return s === 'Approved' || s === '1';
  }

  getStatusClass(val: any): string {
    const s = String(val ?? '').toLowerCase();
    if (s === '1' || s.includes('approved') || s.includes('completed')) return 'approved';
    if (s === '0' || s.includes('pending') || s.includes('queued')) return 'pending';
    if (s === '2' || s.includes('rejected') || s.includes('failed')) return 'rejected';
    return s;
  }

  getReviewStatusText(val: any): string {
    const s = String(val ?? '');
    if (s === '0' || s.toLowerCase() === 'pendingreview') return 'Pending Review';
    if (s === '1' || s.toLowerCase() === 'approved') return 'Approved (On Map)';
    if (s === '2' || s.toLowerCase() === 'rejected') return 'Rejected';
    return s;
  }

  quickApprove(drawing: Drawing): void {
    if (!this.workspace) return;
    this.drawingService.getRevisions(this.workspace.id, drawing.id).subscribe({
      next: (revs) => {
        const pendingRev = revs.find(r => !r.isActive) || revs[0];
        if (pendingRev) {
          this.drawingService.reviewRevision(this.workspace!.id, drawing.id, pendingRev.id, true, 'Approved').subscribe({
            next: (res) => {
              this.message = `Drawing '${drawing.projectName}' has been approved and is now active on the map!`;
              this.loadDrawings();
              setTimeout(() => this.message = '', 5000);
            }
          });
        }
      }
    });
  }

  viewRevisions(drawing: Drawing): void {
    this.selectedDrawing = drawing;
    if (!this.workspace) return;
    this.drawingService.getRevisions(this.workspace.id, drawing.id).subscribe({
      next: (revs) => this.revisions = revs
    });
  }

  review(revision: DrawingRevision, approve: boolean): void {
    if (!this.workspace || !this.selectedDrawing) return;
    const comments = prompt(approve ? 'Approval comments (optional):' : 'Rejection reason:') || '';
    if (!approve && !comments) return;

    this.drawingService.reviewRevision(this.workspace.id, this.selectedDrawing.id, revision.id, approve, comments).subscribe({
      next: (res) => {
        this.message = res.message;
        this.loadDrawings();
        this.viewRevisions(this.selectedDrawing!);
        setTimeout(() => this.message = '', 4000);
      }
    });
  }
}
