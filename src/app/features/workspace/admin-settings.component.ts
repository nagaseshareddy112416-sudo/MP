import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AuthService } from '../../core/services/auth.service';
import { Workspace, CadLayerMapping, CategoryConfig, CategoryFieldConfig } from '../../core/models/models';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTabsModule, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule
  ],
  template: `
    <div class="settings-container">
      <h2>Workspace Settings & Configurations</h2>
      <p class="subtitle" *ngIf="workspace">Managing: <strong>{{ workspace.name }}</strong> ({{ workspace.code }})</p>

      <mat-tab-group>
        <!-- 1. Workspace General Settings -->
        <mat-tab label="General Settings">
          <mat-card class="tab-card" *ngIf="workspace">
            <mat-card-content>
              <form (ngSubmit)="saveWorkspaceSettings()">
                <div class="form-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>Workspace Name</mat-label>
                    <input matInput [(ngModel)]="workspace.name" name="name" required>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Default Projected EPSG</mat-label>
                    <input matInput type="number" [(ngModel)]="workspace.defaultEpsg" name="defaultEpsg" required>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Center Longitude (°E)</mat-label>
                    <input matInput type="number" step="0.001" [(ngModel)]="workspace.centerLon" name="centerLon" required>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Center Latitude (°N)</mat-label>
                    <input matInput type="number" step="0.001" [(ngModel)]="workspace.centerLat" name="centerLat" required>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Default Zoom Level</mat-label>
                    <input matInput type="number" [(ngModel)]="workspace.defaultZoom" name="defaultZoom" required>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Clash Vertical Clearance Tolerance (m)</mat-label>
                    <input matInput type="number" step="0.1" [(ngModel)]="workspace.clashVerticalToleranceM" name="clashVerticalToleranceM" required>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Far from Data Warning Distance (m)</mat-label>
                    <input matInput type="number" [(ngModel)]="workspace.farFromExistingDataWarningM" name="farFromExistingDataWarningM" required>
                  </mat-form-field>
                </div>

                <div class="actions-row">
                  <button mat-raised-button color="primary" type="submit">Save Workspace Settings</button>
                  <span *ngIf="saveSuccess" class="success-msg">Settings saved successfully!</span>
                </div>
              </form>
            </mat-card-content>
          </mat-card>
        </mat-tab>

        <!-- 2. CAD Layer Mapping Table -->
        <mat-tab label="CAD Layer Mappings">
          <mat-card class="tab-card">
            <mat-card-header class="table-header">
              <div>
                <mat-card-title>DXF/DWG Layer Classification</mat-card-title>
                <mat-card-subtitle>Maps CAD drawing layers to categories, sub-types, and colors</mat-card-subtitle>
              </div>
              <div class="table-actions">
                <input type="file" #csvFileInput (change)="onCsvFileSelected($event)" accept=".csv" style="display:none">
                <button mat-stroked-button (click)="csvFileInput.click()">
                  <mat-icon>upload_file</mat-icon> Import CSV
                </button>
                <button mat-raised-button color="primary" (click)="showAddMappingRow = !showAddMappingRow">
                  <mat-icon>add</mat-icon> Add Mapping
                </button>
              </div>
            </mat-card-header>

            <mat-card-content>
              <div *ngIf="csvMsg" class="success-banner">{{ csvMsg }}</div>

              <!-- Inline Add Mapping Form -->
              <div *ngIf="showAddMappingRow" class="inline-add-box">
                <h4>Add Layer Mapping</h4>
                <div class="add-row-inputs">
                  <mat-form-field appearance="outline">
                    <mat-label>CAD Layer Name</mat-label>
                    <input matInput [(ngModel)]="newMapping.cadLayer" placeholder="e.g. WATER_MAIN">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Category</mat-label>
                    <input matInput [(ngModel)]="newMapping.category" placeholder="e.g. Utility">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sub-Type</mat-label>
                    <input matInput [(ngModel)]="newMapping.subType" placeholder="e.g. Water">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Geometry</mat-label>
                    <mat-select [(ngModel)]="newMapping.geometryType">
                      <mat-option value="line">Line</mat-option>
                      <mat-option value="point">Point</mat-option>
                      <mat-option value="polygon">Polygon</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Color Hex</mat-label>
                    <input matInput [(ngModel)]="newMapping.color" placeholder="#1f77ff">
                  </mat-form-field>
                </div>
                <div class="add-row-actions">
                  <button mat-button (click)="showAddMappingRow = false">Cancel</button>
                  <button mat-raised-button color="primary" (click)="saveNewMapping()">Save Mapping</button>
                </div>
              </div>

              <!-- Mappings Table -->
              <table mat-table [dataSource]="mappings" class="mat-elevation-z1 mappings-table">
                <ng-container mat-columnDef="cadLayer">
                  <th mat-header-cell *matHeaderCellDef> CAD Layer </th>
                  <td mat-cell *matCellDef="let m"> <code>{{ m.cadLayer }}</code> </td>
                </ng-container>

                <ng-container mat-columnDef="category">
                  <th mat-header-cell *matHeaderCellDef> Category </th>
                  <td mat-cell *matCellDef="let m"> {{ m.category }} </td>
                </ng-container>

                <ng-container mat-columnDef="subType">
                  <th mat-header-cell *matHeaderCellDef> Sub-Type </th>
                  <td mat-cell *matCellDef="let m"> {{ m.subType }} </td>
                </ng-container>

                <ng-container mat-columnDef="geometryType">
                  <th mat-header-cell *matHeaderCellDef> Geometry </th>
                  <td mat-cell *matCellDef="let m"> {{ m.geometryType }} </td>
                </ng-container>

                <ng-container mat-columnDef="color">
                  <th mat-header-cell *matHeaderCellDef> Color </th>
                  <td mat-cell *matCellDef="let m">
                    <span class="color-badge" [style.background]="m.color"></span> {{ m.color }}
                  </td>
                </ng-container>

                <ng-container mat-columnDef="actions">
                  <th mat-header-cell *matHeaderCellDef> Actions </th>
                  <td mat-cell *matCellDef="let m">
                    <button mat-icon-button color="warn" (click)="deleteMapping(m.id)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </mat-card-content>
          </mat-card>
        </mat-tab>

        <!-- 3. Categories & Sub-Types -->
        <mat-tab label="Categories & Dynamic Fields">
          <mat-card class="tab-card">
            <mat-card-content>
              <h3>Configured Feature Categories</h3>
              <div class="category-list">
                <mat-card *ngFor="let cat of categories" class="cat-pill">
                  <mat-icon>{{ cat.iconName }}</mat-icon>
                  <span>{{ cat.categoryName }} &rsaquo; {{ cat.subTypeName }}</span>
                  <span class="color-badge" [style.background]="cat.colorHex"></span>
                </mat-card>
              </div>
            </mat-card-content>
          </mat-card>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .subtitle {
      color: #666;
      margin-top: -8px;
      margin-bottom: 20px;
    }
    .tab-card {
      margin-top: 16px;
      padding: 20px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .actions-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .success-msg {
      color: #2e7d32;
      font-weight: 500;
    }
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .table-actions {
      display: flex;
      gap: 10px;
    }
    .mappings-table {
      width: 100%;
    }
    .color-badge {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: 3px;
      margin-right: 6px;
      vertical-align: middle;
      border: 1px solid rgba(0,0,0,0.2);
    }
    .inline-add-box {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid #e0e0e0;
    }
    .add-row-inputs {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }
    .add-row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }
    .success-banner {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .category-list {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
    }
    .cat-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 20px;
    }
  `]
})
export class AdminSettingsComponent implements OnInit {
  workspace: Workspace | null = null;
  mappings: CadLayerMapping[] = [];
  categories: CategoryConfig[] = [];
  displayedColumns = ['cadLayer', 'category', 'subType', 'geometryType', 'color', 'actions'];

  saveSuccess = false;
  csvMsg = '';
  showAddMappingRow = false;

  newMapping: CadLayerMapping = {
    cadLayer: '',
    category: '',
    subType: '',
    geometryType: 'line',
    color: '#000000'
  };

  constructor(
    private workspaceService: WorkspaceService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.workspace = this.authService.activeWorkspace();
    if (this.workspace) {
      this.loadMappings(this.workspace.id);
      this.loadCategories(this.workspace.id);
    }
  }

  loadMappings(wsId: string): void {
    this.workspaceService.getLayerMappings(wsId).subscribe({
      next: (data) => this.mappings = data
    });
  }

  loadCategories(wsId: string): void {
    this.workspaceService.getCategories(wsId).subscribe({
      next: (data) => this.categories = data
    });
  }

  saveWorkspaceSettings(): void {
    if (!this.workspace) return;
    this.workspaceService.updateWorkspace(this.workspace.id, this.workspace).subscribe({
      next: () => {
        this.saveSuccess = true;
        this.authService.setActiveWorkspace(this.workspace!);
        setTimeout(() => this.saveSuccess = false, 3000);
      }
    });
  }

  saveNewMapping(): void {
    if (!this.workspace || !this.newMapping.cadLayer) return;
    this.workspaceService.createLayerMapping(this.workspace.id, this.newMapping).subscribe({
      next: (created) => {
        this.mappings = [...this.mappings, created];
        this.showAddMappingRow = false;
        this.newMapping = { cadLayer: '', category: '', subType: '', geometryType: 'line', color: '#000000' };
      }
    });
  }

  deleteMapping(id?: string): void {
    if (!this.workspace || !id) return;
    this.workspaceService.deleteLayerMapping(this.workspace.id, id).subscribe({
      next: () => {
        this.mappings = this.mappings.filter(m => m.id !== id);
      }
    });
  }

  onCsvFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && this.workspace) {
      this.workspaceService.importLayerMappingCsv(this.workspace.id, file).subscribe({
        next: (res) => {
          this.csvMsg = res.message || 'CSV imported successfully!';
          this.loadMappings(this.workspace!.id);
          setTimeout(() => this.csvMsg = '', 5000);
        }
      });
    }
  }
}

