import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { WorkspaceService } from '../../core/services/workspace.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <div mat-card-avatar class="header-icon">
            <mat-icon color="primary">map</mat-icon>
          </div>
          <mat-card-title>GFC Upload Engine</mat-card-title>
          <mat-card-subtitle>Multi-Workspace GIS Drawing Platform</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div *ngIf="errorMessage" class="error-banner">
            {{ errorMessage }}
          </div>

          <div *ngIf="isChangePassword; else loginForm">
            <p class="notice">First login: You must set a new password before proceeding.</p>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Current Password</mat-label>
              <input matInput type="password" [(ngModel)]="currentPassword">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>New Password</mat-label>
              <input matInput type="password" [(ngModel)]="newPassword">
            </mat-form-field>
            <button mat-raised-button color="accent" class="full-width" (click)="submitPasswordChange()">
              Update Password & Continue
            </button>
          </div>

          <ng-template #loginForm>
            <form (ngSubmit)="onLogin()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email / Username</mat-label>
                <input matInput [(ngModel)]="username" name="username" required>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Password</mat-label>
                <input matInput type="password" [(ngModel)]="password" name="password" required>
              </mat-form-field>

              <button mat-raised-button color="primary" class="full-width submit-btn" type="submit" [disabled]="loading">
                {{ loading ? 'Signing in...' : 'Sign In' }}
              </button>
            </form>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    }
    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .full-width {
      width: 100%;
      margin-bottom: 12px;
    }
    .submit-btn {
      height: 48px;
      font-size: 16px;
      margin-top: 8px;
    }
    .error-banner {
      background: #ffebee;
      color: #c62828;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .notice {
      color: #e65100;
      font-size: 14px;
      margin-bottom: 12px;
    }
  `]
})
export class LoginComponent {
  username = 'admin@gfcengine.com';
  password = '';
  currentPassword = '';
  newPassword = '';
  isChangePassword = false;
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private workspaceService: WorkspaceService,
    private router: Router
  ) {
    if (window.location.search.includes('expired=true')) {
      this.errorMessage = 'Your login session has expired. Please sign in again.';
    }
  }

  onLogin(): void {
    this.errorMessage = '';
    this.loading = true;

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.mustChangePassword) {
          this.isChangePassword = true;
          this.currentPassword = this.password;
        } else {
          this.selectDefaultWorkspaceAndNavigate();
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Login failed. Please verify credentials.';
      }
    });
  }

  submitPasswordChange(): void {
    this.errorMessage = '';
    this.authService.changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.selectDefaultWorkspaceAndNavigate();
      },
      error: (err) => {
        this.errorMessage = err.error?.errors?.join(', ') || 'Password update failed.';
      }
    });
  }

  private selectDefaultWorkspaceAndNavigate(): void {
    this.workspaceService.getWorkspaces().subscribe({
      next: (workspaces) => {
        if (workspaces.length > 0) {
          this.authService.setActiveWorkspace(workspaces[0]);
          this.router.navigate(['/map']);
        } else {
          this.router.navigate(['/workspaces']);
        }
      },
      error: () => this.router.navigate(['/map'])
    });
  }
}

