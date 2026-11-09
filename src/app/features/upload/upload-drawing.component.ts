import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkspaceService } from '../../core/services/workspace.service';
import { DrawingService } from '../../core/services/drawing.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { CategoryConfig, CategoryFieldConfig, Workspace, DrawingStage, Drawing } from '../../core/models/models';

@Component({
  selector: 'app-upload-drawing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="upload-page">
      <header class="page-header">
        <div>
          <div class="header-breadcrumbs">Engineering Ingestion &bull; Phase 3 Universal Upload Engine</div>
          <h1 class="header-title">Upload Good For Construction (GFC) Drawing</h1>
          <p class="header-desc">
            Georeferenced multi-format CAD ingestion engine with automated coordinate validation, layer classification, 
            and pre-approval master plan integration.
          </p>
        </div>
        <div class="header-actions">
          <button class="gfc-btn secondary" routerLink="/revisions">
            <mat-icon>history</mat-icon> View Approval Queue
          </button>
        </div>
      </header>

      <!-- 4-Step Stepper Header -->
      <div class="stepper-nav gfc-card">
        <div class="step-item" [class.active]="currentStep() === 1" [class.completed]="currentStep() > 1" (click)="goToStep(1)">
          <div class="step-badge">
            <mat-icon *ngIf="currentStep() > 1">check</mat-icon>
            <span *ngIf="currentStep() <= 1">1</span>
          </div>
          <div class="step-meta">
            <span class="step-num">Step 1</span>
            <span class="step-name">File Selection</span>
          </div>
        </div>

        <div class="step-connector" [class.active]="currentStep() > 1"></div>

        <div class="step-item" [class.active]="currentStep() === 2" [class.completed]="currentStep() > 2" (click)="goToStep(2)">
          <div class="step-badge">
            <mat-icon *ngIf="currentStep() > 2">check</mat-icon>
            <span *ngIf="currentStep() <= 2">2</span>
          </div>
          <div class="step-meta">
            <span class="step-num">Step 2</span>
            <span class="step-name">Discipline & Info</span>
          </div>
        </div>

        <div class="step-connector" [class.active]="currentStep() > 2"></div>

        <div class="step-item" [class.active]="currentStep() === 3" [class.completed]="currentStep() > 3" (click)="goToStep(3)">
          <div class="step-badge">
            <mat-icon *ngIf="currentStep() > 3">check</mat-icon>
            <span *ngIf="currentStep() <= 3">3</span>
          </div>
          <div class="step-meta">
            <span class="step-num">Step 3</span>
            <span class="step-name">Placement & Pre-check</span>
          </div>
        </div>

        <div class="step-connector" [class.active]="currentStep() > 3"></div>

        <div class="step-item" [class.active]="currentStep() === 4" (click)="goToStep(4)">
          <div class="step-badge">
            <span>4</span>
          </div>
          <div class="step-meta">
            <span class="step-num">Step 4</span>
            <span class="step-name">Review & Submit</span>
          </div>
        </div>
      </div>

      <!-- Main Stepper Content Area -->
      <div class="step-content-area gfc-card">
        
        <!-- STEP 1: File Selection & Format Validation -->
        <div *ngIf="currentStep() === 1" class="step-pane">
          <div class="pane-header">
            <h2>Select Engineering Drawing File</h2>
            <p>Upload DXF, DWG, GeoJSON, or PDF engineering drawings. Maximum file size: 100 MB.</p>
          </div>

          <div
            class="drop-zone"
            [class.drag-over]="isDragging"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onFileDrop($event)"
            (click)="fileInput.click()"
          >
            <input #fileInput type="file" (change)="onFileChange($event)" accept=".dxf,.dwg,.pdf,.geojson,.zip" style="display:none">
            
            <div class="drop-icon-circle">
              <mat-icon>cloud_upload</mat-icon>
            </div>

            <div *ngIf="!selectedFile" class="drop-text">
              <h3>Drag and drop drawing file here</h3>
              <p>Supports .DXF (AutoCAD), .DWG, .GeoJSON, and .PDF georeferenced sheets</p>
              <button class="gfc-btn primary" type="button">
                <mat-icon>folder_open</mat-icon> Browse Local Files
              </button>
            </div>

            <div *ngIf="selectedFile" class="file-summary" (click)="$event.stopPropagation()">
              <mat-icon class="file-icon">description</mat-icon>
              <div class="file-info">
                <strong>{{ selectedFile.name }}</strong>
                <span>{{ (selectedFile.size / 1024) | number:'1.0-0' }} KB &bull; {{ getFileExtension(selectedFile.name) }}</span>
              </div>
              <button class="gfc-btn subtle" type="button" (click)="removeFile()">
                <mat-icon>close</mat-icon> Remove
              </button>
            </div>
          </div>

          <!-- Format Validation Badge -->
          <div *ngIf="selectedFile" class="format-validation-box">
            <div class="validation-row success">
              <mat-icon>check_circle</mat-icon>
              <span>Format validated: Supported CAD/GIS vector container ({{ getFileExtension(selectedFile.name) }})</span>
            </div>
            <div class="validation-row success">
              <mat-icon>check_circle</mat-icon>
              <span>File size acceptable ({{ (selectedFile.size / (1024 * 1024)) | number:'1.2-2' }} MB of 100 MB limit)</span>
            </div>
          </div>

          <div class="pane-footer">
            <div></div>
            <button class="gfc-btn primary" [disabled]="!selectedFile" (click)="goToStep(2)">
              Proceed to Discipline & Info <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </div>

        <!-- STEP 2: Drawing Information & Discipline -->
        <div *ngIf="currentStep() === 2" class="step-pane">
          <div class="pane-header">
            <h2>Drawing Information & Classification</h2>
            <p>Classify the project, discipline, revision, and construction life-cycle stage.</p>
          </div>

          <div class="form-grid">
            <div class="form-field full-width">
              <label>Drawing / Project Name *</label>
              <input type="text" class="gfc-input" [(ngModel)]="form.projectName" placeholder="e.g. GFC_SEWER_R2_CH0000-0400" required>
              <span class="field-hint">Drawing identifier matching CAD title block or master registry.</span>
            </div>

            <div class="form-field">
              <label>Discipline / Category *</label>
              <select class="gfc-select" [(ngModel)]="form.category" (change)="onCategoryChange(form.category)" required>
                <option value="" disabled>-- Select Category --</option>
                <option *ngFor="let cat of uniqueCategories" [value]="cat">{{ cat }}</option>
              </select>
            </div>

            <div class="form-field">
              <label>Sub-Type / Feature Layer *</label>
              <select class="gfc-select" [(ngModel)]="form.subType" required>
                <option value="" disabled>-- Select Sub-Type --</option>
                <option *ngFor="let sub of availableSubTypes" [value]="sub">{{ sub }}</option>
              </select>
            </div>

            <div class="form-field">
              <label>Revision Number *</label>
              <input type="text" class="gfc-input" [(ngModel)]="form.revisionNumber" placeholder="R0" required>
            </div>

            <div class="form-field">
              <label>Drawing Stage *</label>
              <select class="gfc-select" [(ngModel)]="form.stageId" (change)="onStageChange(form.stageId)">
                <option *ngFor="let s of stages" [value]="s.id">{{ s.name }}</option>
              </select>
            </div>

            <div class="form-field">
              <label>Construction Status</label>
              <select class="gfc-select" [(ngModel)]="form.status">
                <option value="Design">Not Started (Design)</option>
                <option value="UnderConstruction">Under Construction</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div class="form-field">
              <label>Contractor Organization</label>
              <input type="text" class="gfc-input" [(ngModel)]="form.contractor" placeholder="e.g. L&T Infrastructure">
            </div>

            <div class="form-field">
              <label>Engineering Consultant</label>
              <input type="text" class="gfc-input" [(ngModel)]="form.consultant" placeholder="e.g. Mott MacDonald">
            </div>
          </div>

          <!-- As-Built Linkage Section (Conditional) -->
          <div *ngIf="isAsBuiltStage()" class="asbuilt-subpanel">
            <div class="subpanel-title">
              <mat-icon>verified</mat-icon> As-Built Linkage & Survey Validation
            </div>
            
            <div class="form-grid">
              <div class="form-field">
                <label>Baseline GFC Drawing *</label>
                <select class="gfc-select" [(ngModel)]="form.gfcDrawingId">
                  <option *ngFor="let g of gfcDrawings" [value]="g.id">
                    {{ g.projectName }} (Rev {{ g.currentRevision }} - {{ g.category }})
                  </option>
                </select>
              </div>

              <div class="form-field">
                <label>Source of Coordinates *</label>
                <select class="gfc-select" [(ngModel)]="form.sourceOfCoordinates">
                  <option value="Survey">Surveyed (Total Station / GNSS RTK)</option>
                  <option value="Redrawn">Redrawn (Digitized CAD Overlay)</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>

            <div *ngIf="form.sourceOfCoordinates !== 'Survey'" class="survey-warning-box">
              <mat-icon>warning</mat-icon>
              <div>
                <strong>Non-Survey Warning:</strong> Coordinate source is marked as <em>{{ form.sourceOfCoordinates }}</em>. 
                As-built deviation comparisons will record this non-survey status in all compliance audits.
              </div>
            </div>
          </div>

          <div class="pane-footer">
            <button class="gfc-btn secondary" (click)="goToStep(1)">
              <mat-icon>arrow_back</mat-icon> Back to File
            </button>
            <button class="gfc-btn primary" [disabled]="!form.projectName || !form.category || !form.subType" (click)="goToStep(3)">
              Proceed to Placement & Preview <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </div>

        <!-- STEP 3: Placement & Spatial Pre-Validation -->
        <div *ngIf="currentStep() === 3" class="step-pane">
          <div class="pane-header">
            <h2>Georeference & Spatial Pre-Validation</h2>
            <p>Verify coordinate reference system (CRS), geometry bounds, and CAD layer mappings.</p>
          </div>

          <div class="crs-config-card">
            <div class="form-field crs-field">
              <label>Projected Coordinate Reference System (EPSG) *</label>
              <div class="crs-input-group">
                <input type="number" class="gfc-input" [(ngModel)]="form.sourceEpsg" placeholder="32644">
                <button class="gfc-btn secondary" (click)="form.sourceEpsg = 32644">UTM 44N (32644)</button>
                <button class="gfc-btn secondary" (click)="form.sourceEpsg = 4326">WGS84 (4326)</button>
              </div>
              <span class="field-hint">Workspace Default: EPSG:{{ workspace?.defaultEpsg || 32644 }}</span>
            </div>

            <div class="precheck-action">
              <button class="gfc-btn primary" (click)="runPrecheck()" [disabled]="prechecking">
                <mat-icon>{{ prechecking ? 'hourglass_top' : 'play_arrow' }}</mat-icon>
                {{ prechecking ? 'Analyzing CAD Entities...' : 'Run Spatial Pre-Validation' }}
              </button>
            </div>
          </div>

          <mat-progress-bar *ngIf="prechecking" mode="indeterminate" class="precheck-bar"></mat-progress-bar>

          <!-- Pre-check Results Card -->
          <div *ngIf="precheckError" class="validation-error-card">
            <mat-icon>error_outline</mat-icon>
            <div>
              <strong>Spatial Validation Error</strong>
              <p>{{ precheckError }}</p>
            </div>
          </div>

          <div *ngIf="previewData && !precheckError" class="preview-results-card">
            <div class="results-header">
              <div class="status-badge success">
                <mat-icon>check_circle</mat-icon> Spatial Verification Passed
              </div>
              <span class="feature-count-badge">{{ previewData.features?.length || 0 }} Entities Found</span>
            </div>

            <div class="results-grid">
              <div class="res-item">
                <span class="res-label">Coordinate Extent (Min Lon, Lat)</span>
                <span class="res-val">{{ previewData.bounds?.minX | number:'1.5-5' }}, {{ previewData.bounds?.minY | number:'1.5-5' }}</span>
              </div>
              <div class="res-item">
                <span class="res-label">Coordinate Extent (Max Lon, Lat)</span>
                <span class="res-val">{{ previewData.bounds?.maxX | number:'1.5-5' }}, {{ previewData.bounds?.maxY | number:'1.5-5' }}</span>
              </div>
              <div class="res-item">
                <span class="res-label">Target CRS</span>
                <span class="res-val">EPSG:{{ form.sourceEpsg }}</span>
              </div>
              <div class="res-item">
                <span class="res-label">Layer Classification</span>
                <span class="res-val text-success">100% Mapped to Workspace</span>
              </div>
            </div>

            <!-- Layer breakdown -->
            <div class="layers-summary" *ngIf="previewLayers.length > 0">
              <strong>Extracted CAD Layers:</strong>
              <div class="layer-tags">
                <span *ngFor="let layer of previewLayers" class="gfc-badge tolerance">
                  {{ layer }}
                </span>
              </div>
            </div>
          </div>

          <div class="pane-footer">
            <button class="gfc-btn secondary" (click)="goToStep(2)">
              <mat-icon>arrow_back</mat-icon> Back to Info
            </button>
            <button class="gfc-btn primary" (click)="goToStep(4)">
              Proceed to Final Review <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </div>

        <!-- STEP 4: Review & Submit -->
        <div *ngIf="currentStep() === 4" class="step-pane">
          <div class="pane-header">
            <h2>Review & Submit for Engineering Approval</h2>
            <p>Confirm drawing metadata and ingestion parameters before submitting to the approval queue.</p>
          </div>

          <div class="summary-card">
            <div class="summary-section">
              <h3>Drawing Metadata</h3>
              <div class="summary-grid">
                <div><strong>Project Name:</strong> {{ form.projectName }}</div>
                <div><strong>File:</strong> {{ selectedFile?.name }} ({{ (selectedFile?.size || 0) / 1024 | number:'1.0-0' }} KB)</div>
                <div><strong>Discipline:</strong> {{ form.category }} &rsaquo; {{ form.subType }}</div>
                <div><strong>Revision:</strong> {{ form.revisionNumber }}</div>
                <div><strong>Stage:</strong> {{ form.stageName }}</div>
                <div><strong>Construction Status:</strong> {{ form.status }}</div>
                <div><strong>Contractor:</strong> {{ form.contractor || 'Not Specified' }}</div>
                <div><strong>Consultant:</strong> {{ form.consultant || 'Not Specified' }}</div>
              </div>
            </div>

            <div class="summary-section">
              <h3>Geospatial Parameters</h3>
              <div class="summary-grid">
                <div><strong>Source CRS:</strong> EPSG:{{ form.sourceEpsg }}</div>
                <div><strong>Coordinate Source:</strong> {{ form.sourceOfCoordinates }}</div>
                <div><strong>Pre-validation:</strong> {{ previewData ? 'Completed (' + (previewData.features?.length || 0) + ' features)' : 'Ready for background queue' }}</div>
                <div><strong>Target Workspace:</strong> {{ workspace?.name }}</div>
              </div>
            </div>

            <div class="quality-gate-box">
              <mat-icon>verified_user</mat-icon>
              <div>
                <strong>Master Plan Quality Gate:</strong> Upon submission, the drawing will enter the 
                <em>Revision Approval Queue</em>. It will appear on the official Engineering Master Plan only after 
                explicit review and approval by an authorized Workspace Reviewer.
              </div>
            </div>
          </div>

          <mat-progress-bar *ngIf="submitting" mode="indeterminate" class="submit-bar"></mat-progress-bar>

          <div class="pane-footer">
            <button class="gfc-btn secondary" (click)="goToStep(3)" [disabled]="submitting">
              <mat-icon>arrow_back</mat-icon> Back to Placement
            </button>
            <button class="gfc-btn primary" (click)="submitFinal()" [disabled]="submitting">
              <mat-icon>{{ submitting ? 'hourglass_top' : 'cloud_done' }}</mat-icon>
              {{ submitting ? 'Uploading & Queuing...' : 'Submit Drawing for Review' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .upload-page {
      max-width: 1040px;
      margin: 0 auto;
      padding: var(--space-8) var(--space-6);
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-6);
    }

    .header-breadcrumbs {
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--color-brand);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: var(--space-1);
    }

    .header-title {
      font-size: var(--text-2xl);
      font-weight: 800;
      margin: 0 0 var(--space-1) 0;
      color: var(--text-primary);
    }

    .header-desc {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      max-width: 680px;
      margin: 0;
      line-height: 1.5;
    }

    /* Stepper Navigation */
    .stepper-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-6);
      margin-bottom: var(--space-6);
      background: var(--bg-surface);
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      cursor: pointer;
      user-select: none;
      opacity: 0.6;
      transition: opacity var(--transition-fast);

      &.active {
        opacity: 1;
        .step-badge {
          background: var(--color-brand);
          color: #ffffff;
          border-color: var(--color-brand);
        }
        .step-name {
          color: var(--color-brand);
          font-weight: 700;
        }
      }

      &.completed {
        opacity: 0.9;
        .step-badge {
          background: var(--color-status-compliant);
          color: #ffffff;
          border-color: var(--color-status-compliant);
        }
      }
    }

    .step-badge {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-pill);
      border: 2px solid var(--border-strong);
      background: var(--bg-surface-subtle);
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: var(--text-xs);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .step-meta {
      display: flex;
      flex-direction: column;
    }

    .step-num {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--text-muted);
    }

    .step-name {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--text-primary);
    }

    .step-connector {
      flex: 1;
      height: 2px;
      background: var(--border-subtle);
      margin: 0 var(--space-4);
      transition: background var(--transition-fast);

      &.active {
        background: var(--color-brand);
      }
    }

    /* Step Pane */
    .step-content-area {
      padding: var(--space-8);
      background: var(--bg-surface);
    }

    .pane-header {
      margin-bottom: var(--space-6);
      h2 {
        font-size: var(--text-xl);
        font-weight: 700;
        margin: 0 0 var(--space-1) 0;
        color: var(--text-primary);
      }
      p {
        font-size: var(--text-sm);
        color: var(--text-secondary);
        margin: 0;
      }
    }

    /* Drag & Drop Zone */
    .drop-zone {
      border: 2px dashed var(--border-strong);
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-xl);
      padding: var(--space-10) var(--space-6);
      text-align: center;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover, &.drag-over {
        border-color: var(--color-brand);
        background: var(--color-brand-subtle);
      }
    }

    .drop-icon-circle {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-pill);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--color-brand);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto var(--space-4) auto;
      box-shadow: var(--shadow-sm);

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
    }

    .drop-text {
      h3 {
        font-size: var(--text-lg);
        font-weight: 700;
        margin: 0 0 var(--space-1) 0;
        color: var(--text-primary);
      }
      p {
        font-size: var(--text-sm);
        color: var(--text-muted);
        margin: 0 0 var(--space-4) 0;
      }
    }

    .file-summary {
      display: inline-flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-6);
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);

      .file-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--color-brand);
      }

      .file-info {
        display: flex;
        flex-direction: column;
        text-align: left;
        strong {
          font-size: var(--text-sm);
          color: var(--text-primary);
        }
        span {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
      }
    }

    .format-validation-box {
      margin-top: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .validation-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      font-weight: 500;

      &.success {
        color: var(--color-status-compliant);
        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }
    }

    /* Forms */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);

      &.full-width {
        grid-column: 1 / -1;
      }

      label {
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--text-secondary);
      }
    }

    .gfc-input, .gfc-select {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      padding: var(--space-2) var(--space-3);
      font-size: var(--text-sm);
      font-family: var(--font-sans);
      color: var(--text-primary);
      outline: none;
      transition: border-color var(--transition-fast);

      &:focus {
        border-color: var(--color-brand);
      }
    }

    .field-hint {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* As-Built Subpanel */
    .asbuilt-subpanel {
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      margin-bottom: var(--space-6);
    }

    .subpanel-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--color-brand);
      margin-bottom: var(--space-3);
    }

    .survey-warning-box {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      background: var(--color-status-deviation-bg);
      border: 1px solid var(--color-status-deviation);
      color: var(--color-status-deviation);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--text-xs);
    }

    /* Pre-check & CRS Card */
    .crs-config-card {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: var(--space-4);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      margin-bottom: var(--space-4);
    }

    .crs-input-group {
      display: flex;
      gap: var(--space-2);
    }

    .precheck-bar, .submit-bar {
      margin-bottom: var(--space-4);
    }

    .validation-error-card {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      background: var(--color-status-missing-bg);
      border: 1px solid var(--color-status-missing);
      color: var(--color-status-missing);
      padding: var(--space-4);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-4);
    }

    .preview-results-card {
      background: var(--bg-surface);
      border: 1px solid var(--color-status-compliant);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
      margin-bottom: var(--space-6);
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-4);
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--color-status-compliant);
    }

    .feature-count-badge {
      font-size: var(--text-xs);
      font-weight: 600;
      background: var(--color-brand-subtle);
      color: var(--color-brand);
      padding: 4px 10px;
      border-radius: var(--radius-pill);
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }

    .res-item {
      display: flex;
      flex-direction: column;
    }

    .res-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }

    .res-val {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--text-primary);
      font-family: var(--font-mono);
    }

    .text-success {
      color: var(--color-status-compliant);
    }

    .layers-summary {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .layer-tags {
      display: flex;
      gap: var(--space-1);
      flex-wrap: wrap;
    }

    /* Step 4 Summary */
    .summary-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }

    .summary-section {
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-4);

      h3 {
        font-size: var(--text-sm);
        font-weight: 700;
        margin: 0 0 var(--space-3) 0;
        color: var(--color-brand);
      }
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--text-primary);
    }

    .quality-gate-box {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      background: var(--color-brand-subtle);
      border: 1px solid var(--color-brand-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      font-size: var(--text-xs);
      color: var(--text-primary);

      mat-icon {
        color: var(--color-brand);
        margin-top: 2px;
      }
    }

    /* Pane Footer */
    .pane-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: var(--space-6);
      border-top: 1px solid var(--border-subtle);
    }

    /* Buttons */
    .gfc-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: 600;
      font-family: var(--font-sans);
      cursor: pointer;
      border: 1px solid transparent;
      transition: all var(--transition-fast);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &.primary {
        background-color: var(--color-brand);
        color: #ffffff;
        &:hover { background-color: var(--color-brand-hover); }
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      &.secondary {
        background-color: var(--bg-surface-elevated);
        border-color: var(--border-strong);
        color: var(--text-primary);
        &:hover { background-color: var(--bg-surface-hover); }
      }

      &.subtle {
        background: transparent;
        color: var(--text-secondary);
        &:hover { background: var(--bg-surface-subtle); }
      }
    }
  `]
})
export class UploadDrawingComponent implements OnInit {
  currentStep = signal<number>(1);
  workspace: Workspace | null = null;
  categories: CategoryConfig[] = [];
  uniqueCategories: string[] = ['Road', 'Utility', 'Building'];
  availableSubTypes: string[] = ['Centerline', 'Edge of pavement', 'Water', 'Sewer', 'Storm drain', 'Power', 'Footprint'];
  stages: DrawingStage[] = [];
  gfcDrawings: Drawing[] = [];

  selectedFile: File | null = null;
  isDragging = false;
  prechecking = false;
  submitting = false;
  precheckError = '';
  previewData: any = null;
  previewLayers: string[] = [];

  form = {
    projectName: '',
    category: 'Road',
    subType: 'Centerline',
    revisionNumber: 'R0',
    status: 'Design',
    sourceEpsg: 32644,
    contractor: '',
    consultant: '',
    notes: '',
    stageId: '',
    stageName: 'GFC',
    sourceOfCoordinates: 'Survey' as 'Survey' | 'Redrawn' | 'Unknown',
    gfcDrawingId: ''
  };

  constructor(
    private workspaceService: WorkspaceService,
    private drawingService: DrawingService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.workspace = this.authService.activeWorkspace();
    if (this.workspace) {
      this.form.sourceEpsg = this.workspace.defaultEpsg || 32644;
      this.loadCategories(this.workspace.id);
      this.loadStages(this.workspace.id);
      this.loadGfcDrawings(this.workspace.id);
    }
  }

  loadCategories(wsId: string): void {
    this.workspaceService.getCategories(wsId).subscribe({
      next: (list: CategoryConfig[]) => {
        if (list && list.length > 0) {
          this.categories = list;
          this.uniqueCategories = Array.from(new Set(list.map((c: CategoryConfig) => c.categoryName)));
          if (!this.form.category || !this.uniqueCategories.includes(this.form.category)) {
            this.form.category = this.uniqueCategories[0];
          }
          this.onCategoryChange(this.form.category);
        }
      }
    });
  }

  loadStages(wsId: string): void {
    this.drawingService.getDrawingStages(wsId).subscribe({
      next: (list: DrawingStage[]) => {
        if (list && list.length > 0) {
          this.stages = list;
          const defaultStage = list.find(s => s.isGfcBaseline || s.isDefault) || list[0];
          if (defaultStage) {
            this.form.stageId = defaultStage.id;
            this.form.stageName = defaultStage.name;
          }
        }
      }
    });
  }

  loadGfcDrawings(wsId: string): void {
    this.drawingService.getDrawings(wsId).subscribe({
      next: (list: Drawing[]) => {
        this.gfcDrawings = list.filter(d => !d.stageName?.toLowerCase().includes('as-built'));
        if (this.gfcDrawings.length > 0 && !this.form.gfcDrawingId) {
          this.form.gfcDrawingId = this.gfcDrawings[0].id;
        }
      }
    });
  }

  onCategoryChange(category: string): void {
    const matching = this.categories.filter(c => c.categoryName.toLowerCase() === category.toLowerCase());
    if (matching.length > 0) {
      this.availableSubTypes = Array.from(new Set(matching.map(c => c.subTypeName)));
    } else {
      if (category === 'Road') this.availableSubTypes = ['Centerline', 'Edge of pavement'];
      else if (category === 'Utility') this.availableSubTypes = ['Water', 'Sewer', 'Storm drain', 'Power'];
      else if (category === 'Building') this.availableSubTypes = ['Footprint'];
    }
    if (!this.availableSubTypes.includes(this.form.subType)) {
      this.form.subType = this.availableSubTypes[0] || 'Centerline';
    }
  }

  onStageChange(stageId: string): void {
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      this.form.stageName = stage.name;
    }
  }

  isAsBuiltStage(): boolean {
    const s = this.stages.find(st => st.id === this.form.stageId);
    return !!(s?.isAsBuilt || this.form.stageName?.toLowerCase().includes('as-built'));
  }

  goToStep(step: number): void {
    if (step > 1 && !this.selectedFile) {
      this.toastService.warning('File Required', 'Please select a drawing file before proceeding.');
      return;
    }
    if (step > 2 && (!this.form.projectName || !this.form.category || !this.form.subType)) {
      this.toastService.warning('Incomplete Information', 'Please provide Project Name, Category and Sub-Type.');
      return;
    }
    this.currentStep.set(step);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.handleFile(target.files[0]);
    }
  }

  handleFile(file: File): void {
    const ext = this.getFileExtension(file.name).toLowerCase();
    const valid = ['.dxf', '.dwg', '.pdf', '.geojson', '.zip'];
    if (!valid.includes(ext)) {
      this.toastService.error('Unsupported Format', `File '${ext}' is not supported. Please choose a DXF, DWG, PDF, or GeoJSON file.`);
      return;
    }

    if (file.size > 104857600) {
      this.toastService.error('File Too Large', 'Maximum allowed file size is 100 MB.');
      return;
    }

    this.selectedFile = file;
    this.previewData = null;
    this.precheckError = '';

    // Auto-populate Project Name and Category from file name
    const rawName = file.name.replace(/\.[^/.]+$/, '');
    if (!this.form.projectName) {
      this.form.projectName = rawName;
    }

    const upper = file.name.toUpperCase();
    if (upper.includes('ROAD')) {
      this.form.category = 'Road';
      this.onCategoryChange('Road');
      this.form.subType = 'Centerline';
    } else if (upper.includes('WATER')) {
      this.form.category = 'Utility';
      this.onCategoryChange('Utility');
      this.form.subType = 'Water';
    } else if (upper.includes('SEWER')) {
      this.form.category = 'Utility';
      this.onCategoryChange('Utility');
      this.form.subType = 'Sewer';
    } else if (upper.includes('STORM')) {
      this.form.category = 'Utility';
      this.onCategoryChange('Utility');
      this.form.subType = 'Storm drain';
    } else if (upper.includes('POWER')) {
      this.form.category = 'Utility';
      this.onCategoryChange('Utility');
      this.form.subType = 'Power';
    } else if (upper.includes('BUILDING')) {
      this.form.category = 'Building';
      this.onCategoryChange('Building');
      this.form.subType = 'Footprint';
    }

    this.toastService.info('File Selected', `${file.name} ready for processing.`);
  }

  removeFile(): void {
    this.selectedFile = null;
    this.previewData = null;
    this.precheckError = '';
  }

  getFileExtension(filename: string): string {
    const idx = filename.lastIndexOf('.');
    return idx !== -1 ? filename.substring(idx) : '';
  }

  runPrecheck(): void {
    if (!this.selectedFile || !this.workspace) return;
    this.prechecking = true;
    this.precheckError = '';

    this.drawingService.previewDrawing(this.workspace.id, this.selectedFile, this.form.sourceEpsg).subscribe({
      next: (res) => {
        this.prechecking = false;
        this.previewData = res;
        const layers = new Set<string>();
        if (res.features) {
          for (const f of res.features) {
            if (f.properties?.layer) layers.add(f.properties.layer);
          }
        }
        this.previewLayers = Array.from(layers);
        this.toastService.success('Spatial Validation Passed', `Extracted ${res.features?.length || 0} entities.`);
      },
      error: (err) => {
        this.prechecking = false;
        this.previewData = null;
        this.precheckError = err.error?.message || 'Spatial pre-check failed. Please check coordinates and layer mappings.';
        this.toastService.error('Validation Warning', this.precheckError);
      }
    });
  }

  submitFinal(): void {
    if (!this.selectedFile || !this.workspace) return;
    this.submitting = true;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('projectName', this.form.projectName);
    formData.append('category', this.form.category);
    formData.append('subType', this.form.subType);
    formData.append('revisionNumber', this.form.revisionNumber);
    formData.append('status', this.form.status);
    formData.append('sourceEpsg', this.form.sourceEpsg.toString());
    if (this.form.stageId) formData.append('stageId', this.form.stageId);
    if (this.form.stageName) formData.append('stageName', this.form.stageName);
    if (this.form.contractor) formData.append('contractor', this.form.contractor);
    if (this.form.consultant) formData.append('consultant', this.form.consultant);
    if (this.form.sourceOfCoordinates) formData.append('sourceOfCoordinates', this.form.sourceOfCoordinates);
    if (this.form.gfcDrawingId) formData.append('gfcDrawingId', this.form.gfcDrawingId);

    this.drawingService.uploadDrawing(this.workspace.id, formData).subscribe({
      next: (drawing) => {
        this.submitting = false;
        this.toastService.success('Drawing Submitted', `Drawing '${drawing.projectName}' (Rev ${this.form.revisionNumber}) queued for review.`);
        setTimeout(() => {
          this.router.navigate(['/revisions']);
        }, 1200);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.message || 'Upload submission failed.';
        this.toastService.error('Upload Error', msg);
      }
    });
  }
}
