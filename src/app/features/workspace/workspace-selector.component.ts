import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AuthService } from '../../core/services/auth.service';
import { Workspace } from '../../core/models/models';

@Component({
  selector: 'app-workspace-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="workspace-page">
      <div class="header-row">
        <div>
          <h2>Workspaces & Projects</h2>
          <p class="subtitle">Select a project map to view or manage construction drawings</p>
        </div>
        <button mat-raised-button color="primary" (click)="showCreateModal = true">
          <mat-icon>add</mat-icon> New Workspace
        </button>
      </div>

      <div class="workspace-grid">
        <mat-card *ngFor="let ws of workspaces" class="workspace-card" (click)="selectWorkspace(ws)">
          <mat-card-header>
            <div mat-card-avatar class="ws-avatar">
              <mat-icon>business</mat-icon>
            </div>
            <mat-card-title>{{ ws.name }}</mat-card-title>
            <mat-card-subtitle>Code: {{ ws.code }} | EPSG: {{ ws.defaultEpsg }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p><strong>Center:</strong> {{ ws.centerLon | number:'1.3-3' }}°E, {{ ws.centerLat | number:'1.3-3' }}°N</p>
            <p><strong>Default Zoom:</strong> {{ ws.defaultZoom }}</p>
            <p><strong>Clash Tolerance:</strong> {{ ws.clashVerticalToleranceM }} m</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary">Open Map</button>
            <button mat-button (click)="$event.stopPropagation(); router.navigate(['/admin/settings'])">Settings</button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Simple Create Workspace Modal -->
      <div *ngIf="showCreateModal" class="modal-backdrop">
        <mat-card class="modal-card">
          <mat-card-header>
            <mat-card-title>Create New Workspace</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form (ngSubmit)="createNewWorkspace()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Workspace Name</mat-label>
                <input matInput [(ngModel)]="newWs.name" name="name" required placeholder="e.g. Amaravati Smart City">
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Workspace Code</mat-label>
                <input matInput [(ngModel)]="newWs.code" name="code" required placeholder="e.g. AMV-01">
              </mat-form-field>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Default EPSG</mat-label>
                  <input matInput type="number" [(ngModel)]="newWs.defaultEpsg" name="defaultEpsg">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Default Zoom</mat-label>
                  <input matInput type="number" [(ngModel)]="newWs.defaultZoom" name="defaultZoom">
                </mat-form-field>
              </div>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Center Longitude</mat-label>
                  <input matInput type="number" step="0.001" [(ngModel)]="newWs.centerLon" name="centerLon">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Center Latitude</mat-label>
                  <input matInput type="number" step="0.001" [(ngModel)]="newWs.centerLat" name="centerLat">
                </mat-form-field>
              </div>
              <div class="actions">
                <button mat-button type="button" (click)="showCreateModal = false">Cancel</button>
                <button mat-raised-button color="primary" type="submit">Create Workspace</button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .workspace-page {
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
      margin-top: -8px;
    }
    .workspace-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .workspace-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .workspace-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.12);
    }
    .ws-avatar {
      background: #e3f2fd;
      color: #1976d2;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
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
      max-width: 480px;
      padding: 20px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }
    .form-row {
      display: flex;
      gap: 16px;
    }
    .form-row mat-form-field {
      flex: 1;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
  `]
})
export class WorkspaceSelectorComponent implements OnInit {
  workspaces: Workspace[] = [];
  showCreateModal = false;

  newWs: Partial<Workspace> = {
    name: '',
    code: '',
    defaultEpsg: 32644,
    displayEpsg: 4326,
    centerLon: 80.516,
    centerLat: 16.513,
    defaultZoom: 14,
    clashVerticalToleranceM: 0.5,
    farFromExistingDataWarningM: 5000
  };

  constructor(
    private workspaceService: WorkspaceService,
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.workspaceService.getWorkspaces().subscribe({
      next: (list) => {
        this.workspaces = list;
      }
    });
  }

  selectWorkspace(ws: Workspace): void {
    this.authService.setActiveWorkspace(ws);
    this.router.navigate(['/map']);
  }

  createNewWorkspace(): void {
    if (!this.newWs.name || !this.newWs.code) return;
    this.workspaceService.createWorkspace(this.newWs).subscribe({
      next: (ws) => {
        this.showCreateModal = false;
        this.workspaces.push(ws);
        this.selectWorkspace(ws);
      }
    });
  }
}

