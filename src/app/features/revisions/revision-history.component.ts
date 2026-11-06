import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DrawingService } from '../../core/services/drawing.service';
import { AuthService } from '../../core/services/auth.service';
import { Drawing, DrawingRevision, Workspace } from '../../core/models/models';

@Component({
  selector: 'app-revision-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatTableModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatDialogModule, MatFormFieldModule, MatInputModule
  ],
  template: `
    <div class="revisions-container">
      <div class="header-row">
        <div>
          <h2>Drawings & Revision Approval Queue</h2>
          <p class="subtitle" *ngIf="workspace">Workspace: {{ workspace.name }}</p>
        </div>
        <button mat-stroked-button (click)="loadDrawings()">
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      </div>

      <div *ngIf="message" class="info-banner">{{ message }}</div>

      <mat-card class="content-card">
        <table mat-table [dataSource]="drawings" class="drawings-table">
          <ng-container mat-columnDef="project">
            <th mat-header-cell *matHeaderCellDef> Project Drawing </th>
            <td mat-cell *matCellDef="let d">
              <strong>{{ d.projectName }}</strong>
              <div class="file-name">{{ d.originalFileName }} ({{ d.fileType }})</div>
            </td>
          </ng-container>

          <ng-container mat-columnDef="category">
            <th mat-header-cell *matHeaderCellDef> Category / Sub-Type </th>
            <td mat-cell *matCellDef="let d">
              <span class="category-chip">{{ d.category }} &rsaquo; {{ d.subType }}</span>
            </td>
          </ng-container>

          <ng-container mat-columnDef="revision">
            <th mat-header-cell *matHeaderCellDef> Current Rev </th>
            <td mat-cell *matCellDef="let d">
              <span class="badge-rev">{{ d.currentRevision }}</span>
            </td>
          </ng-container>

          <ng-container mat-columnDef="processing">
            <th mat-header-cell *matHeaderCellDef> Processing </th>
            <td mat-cell *matCellDef="let d">
              <span class="status-chip" [ngClass]="d.processingStatus?.toLowerCase()">
                {{ d.processingStatus }}
              </span>
              <div *ngIf="d.processingError" class="error-text">{{ d.processingError }}</div>
            </td>
          </ng-container>

          <ng-container mat-columnDef="status">
            <th mat-header-cell *matHeaderCellDef> Review Status </th>
            <td mat-cell *matCellDef="let d">
              <span class="status-chip" [ngClass]="d.reviewStatus?.toLowerCase()">
                {{ d.reviewStatus }}
              </span>
            </td>
          </ng-container>

          <ng-container mat-columnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let d">
              <button mat-button color="primary" (click)="viewRevisions(d)">
                <mat-icon>history</mat-icon> Revisions
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
      </mat-card>

      <!-- Revisions Detail Drawer/Modal -->
      <div *ngIf="selectedDrawing" class="modal-backdrop">
        <mat-card class="modal-card">
          <mat-card-header>
            <mat-card-title>Revisions: {{ selectedDrawing.projectName }}</mat-card-title>
            <mat-card-subtitle>{{ selectedDrawing.category }} - {{ selectedDrawing.subType }}</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div *ngIf="revisions.length === 0" class="empty-state">No revisions loaded.</div>

            <div *ngFor="let rev of revisions" class="rev-row" [class.active-rev]="rev.isActive">
              <div class="rev-info">
                <span class="rev-badge">{{ rev.revisionNumber }}</span>
                <span *ngIf="rev.isActive" class="active-tag">Active on Map</span>
                <span class="status-chip" [ngClass]="rev.reviewStatus.toLowerCase()">{{ rev.reviewStatus }}</span>
                <div class="rev-meta">
                  Submitted by {{ rev.createdBy }} on {{ rev.createdAt | date:'short' }} &bull; {{ rev.featureCount }} features
                </div>
                <div *ngIf="rev.reviewComments" class="review-comments">
                  <em>Note: {{ rev.reviewComments }}</em>
                </div>
              </div>

              <div class="rev-actions" *ngIf="rev.reviewStatus === 'Pending'">
                <button mat-raised-button color="primary" (click)="review(rev, true)">Approve</button>
                <button mat-button color="warn" (click)="review(rev, false)">Reject</button>
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
    .subtitle {
      color: #666;
      margin-top: -6px;
    }
    .content-card {
      padding: 0;
      overflow: hidden;
    }
    .drawings-table {
      width: 100%;
    }
    .file-name {
      font-size: 11px;
      color: #888;
      font-family: monospace;
    }
    .badge-rev {
      background: #e0e0e0;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
    }
    .status-chip {
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-chip.approved, .status-chip.completed { background: #e8f5e9; color: #2e7d32; }
    .status-chip.pending, .status-chip.queued { background: #fff8e1; color: #f57f17; }
    .status-chip.rejected, .status-chip.failed { background: #ffebee; color: #c62828; }
    .status-chip.processing { background: #e3f2fd; color: #1565c0; }
    .error-text {
      color: #c62828;
      font-size: 11px;
      margin-top: 2px;
    }
    .info-banner {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
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
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 20px;
    }
    .rev-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    .active-rev {
      background: #f1f8e9;
      border-radius: 6px;
    }
    .active-tag {
      background: #4caf50;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 8px;
    }
    .rev-meta {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .review-comments {
      font-size: 12px;
      color: #555;
      margin-top: 4px;
    }
    .rev-actions {
      display: flex;
      gap: 8px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
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
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.workspace = this.authService.activeWorkspace();
    if (this.workspace) {
      this.loadDrawings();
    }
  }

  loadDrawings(): void {
    if (!this.workspace) return;
    this.drawingService.getDrawings(this.workspace.id).subscribe({
      next: (data) => this.drawings = data
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
