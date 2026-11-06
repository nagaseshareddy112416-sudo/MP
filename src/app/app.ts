import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './core/services/auth.service';
import { WorkspaceService } from './core/services/workspace.service';
import { Workspace } from './core/models/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatToolbarModule, MatButtonModule,
    MatIconModule, MatMenuModule, MatSelectModule, MatDividerModule, MatTooltipModule
  ],
  template: `
    <div class="app-layout">
      <!-- Top Navigation Toolbar (shown when logged in) -->
      <mat-toolbar *ngIf="authService.isAuthenticated()" color="primary" class="main-toolbar">
        <div class="logo-group" routerLink="/map">
          <mat-icon class="app-logo">layers</mat-icon>
          <span class="app-title">GFC Upload Engine</span>
        </div>

        <nav class="nav-links">
          <a mat-button routerLink="/map" routerLinkActive="active-link">
            <mat-icon>map</mat-icon> Map
          </a>
          <a mat-button routerLink="/upload" routerLinkActive="active-link" *ngIf="authService.canUpload()">
            <mat-icon>cloud_upload</mat-icon> Upload
          </a>
          <a mat-button routerLink="/revisions" routerLinkActive="active-link">
            <mat-icon>rate_review</mat-icon> Revisions
          </a>
          <a mat-button routerLink="/clashes" routerLinkActive="active-link">
            <mat-icon>warning</mat-icon> Clashes
          </a>
          <a mat-button routerLink="/dashboard" routerLinkActive="active-link">
            <mat-icon>insights</mat-icon> Dashboard
          </a>
          <a mat-button routerLink="/admin/settings" routerLinkActive="active-link" *ngIf="authService.isWorkspaceAdmin()">
            <mat-icon>settings</mat-icon> Settings
          </a>
        </nav>

        <span class="spacer"></span>

        <!-- Workspace Quick Switcher -->
        <div class="workspace-chip" routerLink="/workspaces" matTooltip="Click to change workspace">
          <mat-icon>domain</mat-icon>
          <span>{{ authService.activeWorkspace()?.name || 'No Workspace' }}</span>
        </div>

        <!-- User Menu -->
        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <div class="user-menu-header">
            <strong>{{ authService.currentUser()?.fullName }}</strong>
            <div class="user-role">{{ authService.currentUser()?.username }}</div>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item routerLink="/workspaces">
            <mat-icon>business</mat-icon> Switch Workspace
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon> Sign Out
          </button>
        </mat-menu>
      </mat-toolbar>

      <!-- Main Content Router Outlet -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .main-toolbar {
      height: 64px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 100;
    }
    .logo-group {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .app-logo {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .app-title {
      font-weight: 700;
      font-size: 18px;
      letter-spacing: 0.5px;
    }
    .nav-links {
      display: flex;
      gap: 4px;
      margin-left: 16px;
    }
    .nav-links a {
      font-size: 14px;
    }
    .active-link {
      background: rgba(255,255,255,0.15);
      border-radius: 4px;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .workspace-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.2);
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .workspace-chip:hover {
      background: rgba(255,255,255,0.3);
    }
    .user-menu-header {
      padding: 12px 16px;
    }
    .user-role {
      font-size: 12px;
      color: #666;
    }
    .main-content {
      flex: 1;
      overflow: auto;
      background: #f8fafc;
    }
  `]
})
export class AppComponent {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
