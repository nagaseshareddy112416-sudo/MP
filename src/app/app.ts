import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    CommandPaletteComponent,
    ToastContainerComponent
  ],
  template: `
    <div class="app-layout">
      <!-- Top Navigation Toolbar (shown when authenticated) -->
      <header *ngIf="authService.isAuthenticated()" class="main-header">
        <div class="header-left">
          <div class="brand-group" routerLink="/map">
            <div class="brand-icon">
              <mat-icon>layers</mat-icon>
            </div>
            <div class="brand-text">
              <span class="brand-name">GFC Intelligence</span>
              <span class="brand-tag">Digital Twin</span>
            </div>
          </div>

          <nav class="nav-links">
            <a routerLink="/map" routerLinkActive="active" class="nav-link">
              <mat-icon>map</mat-icon>
              <span>Map</span>
            </a>
            <a routerLink="/upload" routerLinkActive="active" class="nav-link" *ngIf="authService.canUpload()">
              <mat-icon>cloud_upload</mat-icon>
              <span>Upload</span>
            </a>
            <a routerLink="/revisions" routerLinkActive="active" class="nav-link">
              <mat-icon>rate_review</mat-icon>
              <span>Revisions</span>
            </a>
            <a routerLink="/compliance" routerLinkActive="active" class="nav-link">
              <mat-icon>verified</mat-icon>
              <span>Compliance</span>
            </a>
            <a routerLink="/clashes" routerLinkActive="active" class="nav-link">
              <mat-icon>warning</mat-icon>
              <span>Clashes</span>
            </a>
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
              <mat-icon>insights</mat-icon>
              <span>Dashboard</span>
            </a>
            <a routerLink="/design-system" routerLinkActive="active" class="nav-link">
              <mat-icon>palette</mat-icon>
              <span>Tokens</span>
            </a>
            <a routerLink="/admin/settings" routerLinkActive="active" class="nav-link" *ngIf="authService.isWorkspaceAdmin()">
              <mat-icon>settings</mat-icon>
              <span>Settings</span>
            </a>
          </nav>
        </div>

        <div class="header-right">
          <!-- Command Palette Trigger Button -->
          <button class="cmd-trigger-btn" (click)="cmdPalette.open()" matTooltip="Open Quick Command Palette (Ctrl+K)">
            <mat-icon>search</mat-icon>
            <span class="cmd-label">Quick Search...</span>
            <span class="cmd-kbd">Ctrl K</span>
          </button>

          <!-- Workspace Quick Switcher -->
          <button class="workspace-pill" routerLink="/workspaces" matTooltip="Click to switch workspace">
            <mat-icon class="ws-icon">business</mat-icon>
            <span class="ws-name">{{ authService.activeWorkspace()?.name || 'Select Workspace' }}</span>
          </button>

          <!-- Theme Toggle -->
          <button class="header-icon-btn" (click)="themeService.toggleTheme()" [matTooltip]="themeService.isDark() ? 'Switch to Light Theme' : 'Switch to Dark Theme'">
            <mat-icon>{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>

          <!-- User Profile Menu -->
          <button class="avatar-btn" [matMenuTriggerFor]="userMenu" [matTooltip]="authService.currentUser()?.fullName || 'User Profile'">
            <div class="user-avatar">
              {{ getUserInitial() }}
            </div>
          </button>

          <mat-menu #userMenu="matMenu" class="user-dropdown">
            <div class="user-dropdown-header">
              <div class="header-name">{{ authService.currentUser()?.fullName || 'Engineer' }}</div>
              <div class="header-email">&#64;{{ authService.currentUser()?.username }}</div>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item routerLink="/workspaces">
              <mat-icon>swap_horiz</mat-icon> Switch Workspace
            </button>
            <button mat-menu-item routerLink="/design-system">
              <mat-icon>palette</mat-icon> Design System Showcase
            </button>
            <button mat-menu-item (click)="cmdPalette.open()">
              <mat-icon>keyboard</mat-icon> Command Palette (Ctrl+K)
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon> Sign Out
            </button>
          </mat-menu>
        </div>
      </header>

      <!-- Main Content Outlet -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Global Command Palette Modal (Ctrl+K) -->
      <app-command-palette #cmdPalette></app-command-palette>

      <!-- Global Floating Toast Notification Stack -->
      <app-toast-container></app-toast-container>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background: var(--bg-app);
      color: var(--text-primary);
    }

    .main-header {
      height: var(--header-height);
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-4);
      z-index: 100;
      flex-shrink: 0;
      box-shadow: var(--shadow-xs);
      transition: background-color var(--transition-base), border-color var(--transition-base);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--space-6);
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      cursor: pointer;
      user-select: none;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--color-brand) 0%, #1e40af 100%);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-weight: 700;
      font-size: var(--text-sm);
      letter-spacing: -0.2px;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .brand-tag {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--color-brand);
      line-height: 1.1;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .nav-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--text-secondary);
      text-decoration: none;
      transition: all var(--transition-fast);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--bg-surface-hover);
        color: var(--text-primary);
      }

      &.active {
        background: var(--color-brand-subtle);
        color: var(--color-brand);
        font-weight: 600;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .cmd-trigger-btn {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: var(--space-1) var(--space-3);
      color: var(--text-muted);
      cursor: pointer;
      font-family: var(--font-sans);
      font-size: var(--text-xs);
      transition: all var(--transition-fast);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        border-color: var(--border-strong);
        color: var(--text-primary);
        background: var(--bg-surface-hover);
      }
    }

    .cmd-label {
      font-size: var(--text-xs);
    }

    .cmd-kbd {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-xs);
      padding: 1px 4px;
      font-family: var(--font-mono);
      font-size: 10px;
    }

    .workspace-pill {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-pill);
      padding: 4px 12px;
      font-family: var(--font-sans);
      font-size: var(--text-xs);
      font-weight: 500;
      color: var(--text-primary);
      cursor: pointer;
      transition: all var(--transition-fast);

      .ws-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--color-brand);
      }

      &:hover {
        background: var(--bg-surface-hover);
        border-color: var(--border-strong);
      }
    }

    .header-icon-btn {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-secondary);
      transition: all var(--transition-fast);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        background: var(--bg-surface-hover);
        color: var(--text-primary);
      }
    }

    .avatar-btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-pill);
      background: var(--bg-surface-elevated);
      border: 2px solid var(--color-brand);
      color: var(--color-brand);
      font-weight: 700;
      font-size: var(--text-xs);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-dropdown-header {
      padding: var(--space-3) var(--space-4);
      .header-name {
        font-weight: 700;
        font-size: var(--text-sm);
        color: var(--text-primary);
      }
      .header-email {
        font-size: var(--text-xs);
        color: var(--text-muted);
        margin-top: 2px;
      }
    }

    .main-content {
      flex: 1;
      overflow: auto;
      background: var(--bg-app);
      position: relative;
    }

    @media (max-width: 960px) {
      .cmd-label, .cmd-kbd {
        display: none;
      }
      .nav-link span {
        display: none;
      }
    }
  `]
})
export class AppComponent {
  @ViewChild('cmdPalette') cmdPalette!: CommandPaletteComponent;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router
  ) {}

  getUserInitial(): string {
    const name = this.authService.currentUser()?.fullName || this.authService.currentUser()?.username || 'E';
    return name.charAt(0).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
