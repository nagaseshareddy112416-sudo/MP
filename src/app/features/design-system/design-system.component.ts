import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-design-system',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="ds-container">
      <header class="ds-header">
        <div>
          <div class="ds-breadcrumb">Enterprise GIS & Engineering &bull; Architecture Tokens</div>
          <h1 class="ds-title">Living Design System</h1>
          <p class="ds-subtitle">
            Precision engineering design tokens, component primitives, and contrast-tested typography designed for 
            global multi-discipline construction digital twins.
          </p>
        </div>
        <div class="ds-header-actions">
          <button class="gfc-btn primary" (click)="themeService.toggleTheme()">
            <mat-icon>{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            Switch to {{ themeService.isDark() ? 'Light' : 'Dark' }} Theme
          </button>
        </div>
      </header>

      <!-- Section 1: Engineering Status Badges -->
      <section class="ds-section">
        <h2 class="section-title">1. As-Built Compliance & Engineering Status Tokens</h2>
        <p class="section-desc">Standardized status badges for spatial validation, clash analysis, and drawing approvals.</p>
        
        <div class="tokens-row">
          <span class="gfc-badge compliant"><mat-icon>check_circle</mat-icon> Compliant (0.00m)</span>
          <span class="gfc-badge tolerance"><mat-icon>verified</mat-icon> Within Tolerance (&plusmn;0.05m)</span>
          <span class="gfc-badge deviation"><mat-icon>warning</mat-icon> Deviation (0.60m)</span>
          <span class="gfc-badge missing"><mat-icon>error_outline</mat-icon> Missing Element</span>
          <span class="gfc-badge extra"><mat-icon>add_circle_outline</mat-icon> Extra Element</span>
          <span class="gfc-badge clash"><mat-icon>dangerous</mat-icon> 3D Clash Detected</span>
          <span class="gfc-badge neutral"><mat-icon>schedule</mat-icon> Pending Review</span>
        </div>
      </section>

      <!-- Section 2: Infrastructure Category Tokens -->
      <section class="ds-section">
        <h2 class="section-title">2. Discipline & Infrastructure Categories</h2>
        <p class="section-desc">Harmonized GIS layer styling colors matching real-world engineering standards.</p>

        <div class="category-grid">
          <div class="category-card road">
            <div class="cat-bar"></div>
            <div class="cat-body">
              <mat-icon>add_road</mat-icon>
              <strong>Road & Pavement</strong>
              <span>Centerline, Edge, Chainage</span>
            </div>
          </div>
          <div class="category-card water">
            <div class="cat-bar"></div>
            <div class="cat-body">
              <mat-icon>water_drop</mat-icon>
              <strong>Water Supply</strong>
              <span>Potable Mains, Valves, Hydrants</span>
            </div>
          </div>
          <div class="category-card sewer">
            <div class="cat-bar"></div>
            <div class="cat-body">
              <mat-icon>waves</mat-icon>
              <strong>Sewerage & Gravity</strong>
              <span>Pipes, Manholes, Inverts</span>
            </div>
          </div>
          <div class="category-card storm">
            <div class="cat-bar"></div>
            <div class="cat-body">
              <mat-icon>thunderstorm</mat-icon>
              <strong>Stormwater Drain</strong>
              <span>Culverts, Catch basins</span>
            </div>
          </div>
          <div class="category-card power">
            <div class="cat-bar"></div>
            <div class="cat-body">
              <mat-icon>bolt</mat-icon>
              <strong>Electrical & Telecom</strong>
              <span>Duct banks, MV/LV Cables</span>
            </div>
          </div>
          <div class="category-card building">
            <div class="cat-bar"></div>
            <div class="cat-body">
              <mat-icon>domain</mat-icon>
              <strong>Buildings & Towers</strong>
              <span>Footprints, STILT+G+10, Cores</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 3: Metric Tiles & Cards -->
      <section class="ds-section">
        <h2 class="section-title">3. Metric Tiles & Analytical Cards</h2>
        <div class="metric-grid">
          <div class="gfc-card metric-card">
            <div class="metric-label">Approved Master Plan Features</div>
            <div class="metric-val">17</div>
            <div class="metric-delta positive">
              <mat-icon>trending_up</mat-icon> 100% Verified EPSG:32644
            </div>
          </div>
          <div class="gfc-card metric-card">
            <div class="metric-label">As-Built Tolerance Pass Rate</div>
            <div class="metric-val">94.2%</div>
            <div class="metric-delta positive">
              <mat-icon>check</mat-icon> Within 0.05m Tolerance
            </div>
          </div>
          <div class="gfc-card metric-card">
            <div class="metric-label">Active Spatial Clashes</div>
            <div class="metric-val warning-text">1</div>
            <div class="metric-delta negative">
              <mat-icon>warning</mat-icon> Sewer vs Water Main (0.2m separation)
            </div>
          </div>
          <div class="gfc-card metric-card">
            <div class="metric-label">Drawing Revisions In Review</div>
            <div class="metric-val">0</div>
            <div class="metric-delta neutral">
              <mat-icon>done_all</mat-icon> Queue Clear
            </div>
          </div>
        </div>
      </section>

      <!-- Section 4: Interactive Buttons & Actions -->
      <section class="ds-section">
        <h2 class="section-title">4. Buttons & Interactive Controls</h2>
        <div class="tokens-row">
          <button class="gfc-btn primary">
            <mat-icon>cloud_upload</mat-icon> Primary Action
          </button>
          <button class="gfc-btn secondary">
            <mat-icon>tune</mat-icon> Secondary Action
          </button>
          <button class="gfc-btn outline">
            <mat-icon>filter_alt</mat-icon> Filter Layers
          </button>
          <button class="gfc-btn danger">
            <mat-icon>delete</mat-icon> Archive Drawing
          </button>
          <button class="gfc-btn subtle">
            <mat-icon>help_outline</mat-icon> Help & Shortcuts
          </button>
        </div>
      </section>

      <!-- Section 5: Interactive Toast Notifications -->
      <section class="ds-section">
        <h2 class="section-title">5. Toast & Notification Testing</h2>
        <p class="section-desc">Click below to test live floating toast notifications across all 4 severity states:</p>
        <div class="tokens-row">
          <button class="gfc-btn outline" (click)="toastService.success('Drawing Approved', 'GFC_ROAD_R1_CH0000-1000_R0 has been published to the Master Plan.')">
            Trigger Success Toast
          </button>
          <button class="gfc-btn outline" (click)="toastService.warning('Spatial Warning', 'Water main is within 0.2m vertical buffer of sewer line.')">
            Trigger Warning Toast
          </button>
          <button class="gfc-btn outline" (click)="toastService.error('CRS Error', 'Drawing coordinates near (0,0) - Missing valid georeference.')">
            Trigger Error Toast
          </button>
          <button class="gfc-btn outline" (click)="toastService.info('Background Job Queued', 'Clash analysis job #1042 started in Hangfire.')">
            Trigger Info Toast
          </button>
        </div>
      </section>

      <!-- Section 6: Skeleton Loaders -->
      <section class="ds-section">
        <h2 class="section-title">6. Skeleton Loading States</h2>
        <p class="section-desc">Accessible, non-jarring placeholders for asynchronous CAD uploads and background jobs.</p>
        <div class="gfc-card skeleton-card">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line sub"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .ds-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--space-8) var(--space-6);
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ds-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-8);
      padding-bottom: var(--space-6);
      border-bottom: 1px solid var(--border-subtle);
    }

    .ds-breadcrumb {
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--color-brand);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: var(--space-1);
    }

    .ds-title {
      font-size: var(--text-3xl);
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0 0 var(--space-2) 0;
      color: var(--text-primary);
    }

    .ds-subtitle {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      max-width: 680px;
      margin: 0;
      line-height: 1.6;
    }

    .ds-section {
      margin-bottom: var(--space-10);
    }

    .section-title {
      font-size: var(--text-lg);
      font-weight: 700;
      margin: 0 0 var(--space-1) 0;
      color: var(--text-primary);
    }

    .section-desc {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin: 0 0 var(--space-4) 0;
    }

    .tokens-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }

    /* Category Cards */
    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--space-4);
    }

    .category-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-sm);
    }

    .cat-bar {
      height: 4px;
      width: 100%;
    }

    .category-card.road .cat-bar { background-color: var(--color-cat-road); }
    .category-card.water .cat-bar { background-color: var(--color-cat-water); }
    .category-card.sewer .cat-bar { background-color: var(--color-cat-sewer); }
    .category-card.storm .cat-bar { background-color: var(--color-cat-storm); }
    .category-card.power .cat-bar { background-color: var(--color-cat-power); }
    .category-card.building .cat-bar { background-color: var(--color-cat-building); }

    .cat-body {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-1);

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--text-primary);
        margin-bottom: var(--space-1);
      }

      strong {
        font-size: var(--text-sm);
        color: var(--text-primary);
      }

      span {
        font-size: var(--text-xs);
        color: var(--text-muted);
      }
    }

    /* Metric Cards */
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--space-4);
    }

    .metric-card {
      padding: var(--space-5);
    }

    .metric-label {
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-val {
      font-size: var(--text-3xl);
      font-weight: 800;
      color: var(--text-primary);
      margin: var(--space-2) 0;

      &.warning-text {
        color: var(--color-status-deviation);
      }
    }

    .metric-delta {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: var(--text-xs);
      font-weight: 500;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &.positive { color: var(--color-status-compliant); }
      &.negative { color: var(--color-status-missing); }
      &.neutral { color: var(--text-muted); }
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
        color: var(--text-inverse);
        &:hover { background-color: var(--color-brand-hover); }
      }

      &.secondary {
        background-color: var(--bg-surface-elevated);
        border-color: var(--border-strong);
        color: var(--text-primary);
        &:hover { background-color: var(--bg-surface-hover); }
      }

      &.outline {
        background-color: transparent;
        border-color: var(--border-strong);
        color: var(--text-primary);
        &:hover {
          background-color: var(--bg-surface-hover);
        }
      }

      &.danger {
        background-color: var(--color-status-missing-bg);
        border-color: var(--color-status-missing);
        color: var(--color-status-missing);
        &:hover {
          background-color: var(--color-status-missing);
          color: #ffffff;
        }
      }

      &.subtle {
        background-color: transparent;
        color: var(--text-secondary);
        &:hover {
          background-color: var(--bg-surface-subtle);
          color: var(--text-primary);
        }
      }
    }

    /* Skeleton Loading */
    .skeleton-card {
      padding: var(--space-6);
      max-width: 480px;
    }

    .skeleton-line {
      height: 12px;
      background: linear-gradient(90deg, var(--bg-surface-subtle) 25%, var(--bg-surface-hover) 50%, var(--bg-surface-subtle) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-xs);
      margin-bottom: var(--space-3);

      &.title {
        height: 20px;
        width: 60%;
        margin-bottom: var(--space-4);
      }
      &.sub {
        width: 80%;
      }
      &.short {
        width: 40%;
        margin-bottom: 0;
      }
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class DesignSystemComponent {
  constructor(
    public themeService: ThemeService,
    public toastService: ToastService
  ) {}
}

