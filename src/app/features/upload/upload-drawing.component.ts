import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { WorkspaceService } from '../../core/services/workspace.service';
import { DrawingService } from '../../core/services/drawing.service';
import { AuthService } from '../../core/services/auth.service';
import { CategoryConfig, CategoryFieldConfig, Workspace } from '../../core/models/models';

@Component({
  selector: 'app-upload-drawing',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatProgressBarModule
  ],
  template: `
    <div class="upload-container">
      <mat-card class="upload-card">
        <mat-card-header>
          <div mat-card-avatar class="header-icon">
            <mat-icon color="primary">cloud_upload</mat-icon>
          </div>
          <mat-card-title>Upload Good For Construction (GFC) Drawing</mat-card-title>
          <mat-card-subtitle *ngIf="workspace">Workspace: {{ workspace.name }} (Default EPSG: {{ workspace.defaultEpsg }})</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div *ngIf="errorMessage" class="error-box">
            <mat-icon>error_outline</mat-icon>
            <div>
              <strong>Upload Validation Error</strong>
              <p>{{ errorMessage }}</p>
            </div>
          </div>

          <div *ngIf="successMessage" class="success-box">
            <mat-icon>check_circle</mat-icon>
            <div>
              <strong>Drawing Uploaded Successfully</strong>
              <p>{{ successMessage }}</p>
            </div>
          </div>

          <form (ngSubmit)="submitUpload()">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Project Name</mat-label>
                <input matInput [(ngModel)]="form.projectName" name="projectName" required placeholder="e.g. Main Avenue Road R1">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Category</mat-label>
                <mat-select [(ngModel)]="form.category" name="category" (selectionChange)="onCategoryChange($event.value)" required>
                  <mat-option *ngFor="let cat of uniqueCategories" [value]="cat">{{ cat }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Sub-Type</mat-label>
                <mat-select [(ngModel)]="form.subType" name="subType" required>
                  <mat-option *ngFor="let sub of availableSubTypes" [value]="sub">{{ sub }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Revision Number</mat-label>
                <input matInput [(ngModel)]="form.revisionNumber" name="revisionNumber" required placeholder="e.g. R0, R1">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="form.status" name="status">
                  <mat-option value="Design">Design</mat-option>
                  <mat-option value="Approved">Approved</mat-option>
                  <mat-option value="UnderConstruction">Under Construction</mat-option>
                  <mat-option value="Completed">Completed</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Source CRS (EPSG)</mat-label>
                <input matInput type="number" [(ngModel)]="form.sourceEpsg" name="sourceEpsg" [placeholder]="workspace?.defaultEpsg?.toString() || '32644'">
              </mat-form-field>
            </div>

            <!-- Dynamic Category-Specific Form Fields -->
            <div *ngIf="dynamicFields.length > 0" class="dynamic-section">
              <h4>{{ form.category }} Attributes</h4>
              <div class="form-grid">
                <mat-form-field *ngFor="let field of dynamicFields" appearance="outline">
                  <mat-label>{{ field.fieldLabel }}</mat-label>
                  <input matInput *ngIf="field.fieldType === 'text'" [(ngModel)]="formDynamicValues[field.fieldName]" [name]="field.fieldName" [required]="field.isRequired">
                  <input matInput type="number" *ngIf="field.fieldType === 'number'" [(ngModel)]="formDynamicValues[field.fieldName]" [name]="field.fieldName" [required]="field.isRequired">
                  <input matInput type="date" *ngIf="field.fieldType === 'date'" [(ngModel)]="formDynamicValues[field.fieldName]" [name]="field.fieldName" [required]="field.isRequired">
                </mat-form-field>
              </div>
            </div>

            <!-- Level 1 Placement (Map Pin for PDF or ungeoreferenced files) -->
            <div class="level1-section">
              <h4>Georeference Placement</h4>
              <p class="section-hint">DXF files are automatically placed using drawing coordinates. For PDFs or drawings without real coordinates, specify a pin location:</p>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Pin Longitude (°E)</mat-label>
                  <input matInput type="number" step="0.0001" [(ngModel)]="form.pinX" name="pinX" placeholder="e.g. 80.516">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Pin Latitude (°N)</mat-label>
                  <input matInput type="number" step="0.0001" [(ngModel)]="form.pinY" name="pinY" placeholder="e.g. 16.513">
                </mat-form-field>
              </div>
            </div>

            <!-- File Upload & Pre-submit Preview -->
            <div class="file-drop-zone">
              <input type="file" #fileInput (change)="onFileSelected($event)" accept=".dxf,.dwg,.pdf,.geojson,.zip" style="display:none">
              <mat-icon class="drop-icon">insert_drive_file</mat-icon>
              <div *ngIf="!selectedFile">
                <p>Select a GFC Drawing (.DXF, .DWG, .PDF, .GeoJSON)</p>
                <button mat-stroked-button type="button" (click)="fileInput.click()">Choose File</button>
              </div>
              <div *ngIf="selectedFile" class="selected-file-info">
                <strong>{{ selectedFile.name }}</strong> ({{ (selectedFile.size / 1024) | number:'1.0-0' }} KB)
                <button mat-button color="warn" type="button" (click)="selectedFile = null; previewData = null">Remove</button>
                <button mat-stroked-button color="primary" type="button" (click)="generatePreview()" [disabled]="loadingPreview">
                  {{ loadingPreview ? 'Checking...' : 'Pre-validate Geometry' }}
                </button>
              </div>
            </div>

            <!-- Preview Data Display -->
            <div *ngIf="previewData" class="preview-box">
              <mat-icon color="primary">visibility</mat-icon>
              <div>
                <strong>Geometry Pre-check Passed</strong>
                <p>Found {{ previewData.features?.length || 0 }} feature(s) in bounds [{{ previewData.bounds?.minX | number:'1.3-3' }}, {{ previewData.bounds?.minY | number:'1.3-3' }} to {{ previewData.bounds?.maxX | number:'1.3-3' }}, {{ previewData.bounds?.maxY | number:'1.3-3' }}].</p>
              </div>
            </div>

            <mat-progress-bar *ngIf="uploading" mode="indeterminate" class="upload-progress"></mat-progress-bar>

            <div class="actions">
              <button mat-raised-button color="primary" type="submit" [disabled]="!selectedFile || uploading">
                {{ uploading ? 'Uploading...' : 'Submit Drawing for Review' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .upload-container {
      padding: 32px;
      max-width: 900px;
      margin: 0 auto;
    }
    .upload-card {
      padding: 24px;
      border-radius: 12px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
      margin-top: 12px;
    }
    .dynamic-section, .level1-section {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .section-hint {
      color: #666;
      font-size: 13px;
      margin-top: -6px;
      margin-bottom: 12px;
    }
    .file-drop-zone {
      border: 2px dashed #bbdefb;
      background: #f5faff;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .drop-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #1976d2;
      margin-bottom: 8px;
    }
    .selected-file-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .error-box {
      background: #ffebee;
      color: #c62828;
      border-left: 4px solid #c62828;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
      border-radius: 4px;
    }
    .success-box {
      background: #e8f5e9;
      color: #2e7d32;
      border-left: 4px solid #2e7d32;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
      border-radius: 4px;
    }
    .preview-box {
      background: #e3f2fd;
      color: #1565c0;
      border-left: 4px solid #1565c0;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
      border-radius: 4px;
    }
    .upload-progress {
      margin-bottom: 16px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
  `]
})
export class UploadDrawingComponent implements OnInit {
  workspace: Workspace | null = null;
  categories: CategoryConfig[] = [];
  uniqueCategories: string[] = [];
  availableSubTypes: string[] = [];
  dynamicFields: CategoryFieldConfig[] = [];
  formDynamicValues: Record<string, any> = {};

  selectedFile: File | null = null;
  uploading = false;
  loadingPreview = false;
  previewData: any = null;
  errorMessage = '';
  successMessage = '';

  form = {
    projectName: '',
    category: '',
    subType: '',
    revisionNumber: 'R0',
    status: 'Design',
    sourceEpsg: 32644,
    pinX: null as number | null,
    pinY: null as number | null,
    contractor: '',
    consultant: '',
    notes: ''
  };

  constructor(
    private workspaceService: WorkspaceService,
    private drawingService: DrawingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.workspace = this.authService.activeWorkspace();
    if (this.workspace) {
      this.form.sourceEpsg = this.workspace.defaultEpsg;
      this.loadCategories(this.workspace.id);
    }
  }

  loadCategories(wsId: string): void {
    this.workspaceService.getCategories(wsId).subscribe({
      next: (list) => {
        this.categories = list;
        this.uniqueCategories = Array.from(new Set(list.map(c => c.categoryName)));
        if (this.uniqueCategories.length > 0) {
          this.form.category = this.uniqueCategories[0];
          this.onCategoryChange(this.form.category);
        }
      }
    });
  }

  onCategoryChange(categoryName: string): void {
    this.availableSubTypes = this.categories
      .filter(c => c.categoryName === categoryName)
      .map(c => c.subTypeName);

    if (this.availableSubTypes.length > 0) {
      this.form.subType = this.availableSubTypes[0];
    }

    if (this.workspace) {
      this.workspaceService.getCategoryFields(this.workspace.id, categoryName).subscribe({
        next: (fields) => {
          this.dynamicFields = fields;
          this.formDynamicValues = {};
        }
      });
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.previewData = null;
      this.errorMessage = '';
      if (!this.form.projectName) {
        this.form.projectName = file.name.replace(/\.[^/.]+$/, '');
      }
    }
  }

  generatePreview(): void {
    if (!this.selectedFile || !this.workspace) return;
    this.loadingPreview = true;
    this.errorMessage = '';

    this.drawingService.previewDrawing(this.workspace.id, this.selectedFile, this.form.sourceEpsg).subscribe({
      next: (res) => {
        this.loadingPreview = false;
        this.previewData = res;
      },
      error: (err) => {
        this.loadingPreview = false;
        this.errorMessage = err.error?.message || 'Drawing validation failed.';
      }
    });
  }

  submitUpload(): void {
    if (!this.selectedFile || !this.workspace) return;
    this.uploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('projectName', this.form.projectName);
    formData.append('category', this.form.category);
    formData.append('subType', this.form.subType);
    formData.append('revisionNumber', this.form.revisionNumber);
    formData.append('status', this.form.status);
    formData.append('sourceEpsg', this.form.sourceEpsg.toString());

    if (this.form.pinX != null && this.form.pinY != null) {
      formData.append('pinX', this.form.pinX.toString());
      formData.append('pinY', this.form.pinY.toString());
    }

    // Dynamic fields
    for (const key of Object.keys(this.formDynamicValues)) {
      if (this.formDynamicValues[key] != null) {
        formData.append(key, this.formDynamicValues[key].toString());
      }
    }

    this.drawingService.uploadDrawing(this.workspace.id, formData).subscribe({
      next: (drawing) => {
        this.uploading = false;
        this.successMessage = `Drawing '${drawing.projectName}' uploaded (Revision ${drawing.currentRevision || this.form.revisionNumber}). It will be processed in background.`;
        setTimeout(() => {
          this.router.navigate(['/revisions']);
        }, 2000);
      },
      error: (err) => {
        this.uploading = false;
        this.errorMessage = err.error?.message || 'Drawing upload failed.';
      }
    });
  }
}
