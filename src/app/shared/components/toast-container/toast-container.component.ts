import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="toast-stack" aria-live="polite">
      <div
        *ngFor="let toast of toastService.toasts()"
        class="toast-item {{ toast.type }}"
        (click)="toastService.dismiss(toast.id)"
      >
        <div class="toast-icon">
          <mat-icon>{{ getIcon(toast.type) }}</mat-icon>
        </div>
        <div class="toast-body">
          <div class="toast-title">{{ toast.title }}</div>
          <div class="toast-msg" *ngIf="toast.message">{{ toast.message }}</div>
        </div>
        <button class="toast-close" (click)="$event.stopPropagation(); toastService.dismiss(toast.id)" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: var(--space-6);
      right: var(--space-6);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      max-width: 420px;
      width: calc(100vw - 32px);
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      cursor: pointer;
      animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      transition: transform var(--transition-fast), opacity var(--transition-fast);
    }

    .toast-item:hover {
      transform: translateY(-2px);
    }

    @keyframes slideIn {
      from {
        transform: translateY(16px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .toast-item.success {
      border-left: 4px solid var(--color-status-compliant);
      .toast-icon { color: var(--color-status-compliant); }
    }
    .toast-item.error {
      border-left: 4px solid var(--color-status-missing);
      .toast-icon { color: var(--color-status-missing); }
    }
    .toast-item.warning {
      border-left: 4px solid var(--color-status-deviation);
      .toast-icon { color: var(--color-status-deviation); }
    }
    .toast-item.info {
      border-left: 4px solid var(--color-brand);
      .toast-icon { color: var(--color-brand); }
    }

    .toast-icon {
      margin-top: 2px;
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .toast-body {
      flex: 1;
    }

    .toast-title {
      font-weight: 600;
      font-size: var(--text-sm);
      color: var(--text-primary);
    }

    .toast-msg {
      font-size: var(--text-xs);
      color: var(--text-muted);
      margin-top: 2px;
    }

    .toast-close {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        color: var(--text-primary);
      }
    }
  `]
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
}
