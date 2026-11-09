import { Component, ElementRef, HostListener, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: 'Navigation' | 'Actions' | 'System';
  icon: string;
  shortcut?: string;
  action: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="palette-backdrop" *ngIf="isOpen()" (click)="close()">
      <div class="palette-dialog" (click)="$event.stopPropagation()">
        <div class="palette-header">
          <mat-icon class="search-icon">search</mat-icon>
          <input
            #searchInput
            type="text"
            class="search-input"
            placeholder="Type a command or search views... (e.g. 'Map', 'Upload', 'Dark')"
            [value]="query()"
            (input)="onSearch($event)"
            (keydown)="onKeydown($event)"
          />
          <span class="esc-badge">ESC</span>
        </div>

        <div class="palette-list" #listContainer>
          <div *ngIf="filteredCommands().length === 0" class="empty-results">
            <mat-icon>search_off</mat-icon>
            <p>No matching commands found for "{{ query() }}"</p>
          </div>

          <div
            *ngFor="let cmd of filteredCommands(); let i = index"
            class="palette-item"
            [class.selected]="i === selectedIndex()"
            (mouseenter)="selectedIndex.set(i)"
            (click)="execute(cmd)"
          >
            <div class="item-icon-wrapper">
              <mat-icon>{{ cmd.icon }}</mat-icon>
            </div>
            <div class="item-content">
              <div class="item-title">{{ cmd.title }}</div>
              <div class="item-desc">{{ cmd.description }}</div>
            </div>
            <span class="item-category">{{ cmd.category }}</span>
            <span class="item-shortcut" *ngIf="cmd.shortcut">{{ cmd.shortcut }}</span>
          </div>
        </div>

        <div class="palette-footer">
          <div class="footer-tip">
            <span class="kbd">↑</span>
            <span class="kbd">↓</span> Navigate
            <span class="kbd">↵</span> Select
            <span class="kbd">ESC</span> Close
          </div>
          <div class="footer-brand">GFC Intelligence 2.0</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .palette-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 12vh;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .palette-dialog {
      width: 100%;
      max-width: 640px;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-floating);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .palette-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--border-subtle);
    }

    .search-icon {
      color: var(--text-muted);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: var(--text-base);
      font-family: var(--font-sans);
      background: transparent;
      color: var(--text-primary);
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .esc-badge {
      background: var(--bg-surface-subtle);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      font-family: var(--font-mono);
    }

    .palette-list {
      max-height: 380px;
      overflow-y: auto;
      padding: var(--space-2);
    }

    .palette-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .palette-item.selected {
      background: var(--bg-surface-hover);
    }

    .item-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-md);
      color: var(--color-brand);
    }

    .item-content {
      flex: 1;
    }

    .item-title {
      font-weight: 600;
      font-size: var(--text-sm);
      color: var(--text-primary);
    }

    .item-desc {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    .item-category {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted);
      background: var(--bg-surface-subtle);
      padding: 2px 8px;
      border-radius: var(--radius-pill);
    }

    .item-shortcut {
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-muted);
    }

    .empty-results {
      padding: var(--space-8);
      text-align: center;
      color: var(--text-muted);
    }

    .empty-results mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      margin-bottom: var(--space-2);
      opacity: 0.5;
    }

    .palette-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-5);
      background: var(--bg-surface-subtle);
      border-top: 1px solid var(--border-subtle);
      font-size: 12px;
      color: var(--text-muted);
    }

    .footer-tip {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .kbd {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-xs);
      padding: 1px 5px;
      font-family: var(--font-mono);
      font-size: 10px;
    }

    .footer-brand {
      font-weight: 500;
      color: var(--text-muted);
      font-size: 11px;
    }
  `]
})
export class CommandPaletteComponent {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('listContainer') listContainer?: ElementRef<HTMLDivElement>;

  isOpen = signal<boolean>(false);
  query = signal<string>('');
  selectedIndex = signal<number>(0);

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private authService: AuthService
  ) {}

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
    }
  }

  private get commands(): CommandItem[] {
    const list: CommandItem[] = [
      {
        id: 'nav-map',
        title: 'Master Plan & 2D/3D Map View',
        description: 'Explore active construction layers and GIS master plan',
        category: 'Navigation',
        icon: 'map',
        shortcut: 'G M',
        action: () => this.navigate('/map')
      },
      {
        id: 'nav-upload',
        title: 'Upload GFC Drawing',
        description: 'Guided multi-format CAD / PDF upload engine',
        category: 'Navigation',
        icon: 'cloud_upload',
        shortcut: 'G U',
        action: () => this.navigate('/upload')
      },
      {
        id: 'nav-revisions',
        title: 'Drawings & Revision Approval Queue',
        description: 'Review pending drawings and verify revision changes',
        category: 'Navigation',
        icon: 'rate_review',
        shortcut: 'G R',
        action: () => this.navigate('/revisions')
      },
      {
        id: 'nav-compliance',
        title: 'As-Built vs GFC Compliance Engine',
        description: 'Run automated tolerance checks and export deviation reports',
        category: 'Navigation',
        icon: 'verified',
        shortcut: 'G C',
        action: () => this.navigate('/compliance')
      },
      {
        id: 'nav-clashes',
        title: 'Spatial Clash Detection',
        description: 'Inspect multi-discipline 3D clearance conflicts',
        category: 'Navigation',
        icon: 'warning',
        shortcut: 'G X',
        action: () => this.navigate('/clashes')
      },
      {
        id: 'nav-dashboard',
        title: 'Executive Intelligence Dashboard',
        description: 'View project analytics, layer breakdown, and health metrics',
        category: 'Navigation',
        icon: 'insights',
        shortcut: 'G D',
        action: () => this.navigate('/dashboard')
      },
      {
        id: 'nav-design-system',
        title: 'Design System & Component Library',
        description: 'Preview design tokens, themes, buttons, cards, and UI components',
        category: 'Navigation',
        icon: 'palette',
        shortcut: 'G S',
        action: () => this.navigate('/design-system')
      },
      {
        id: 'nav-settings',
        title: 'Workspace Settings & Tolerances',
        description: 'Manage layer mappings, engineering tolerances, and members',
        category: 'Navigation',
        icon: 'settings',
        action: () => this.navigate('/admin/settings')
      },
      {
        id: 'act-theme',
        title: 'Toggle Dark / Light Theme',
        description: `Currently ${this.themeService.isDark() ? 'Dark' : 'Light'} Mode`,
        category: 'Actions',
        icon: this.themeService.isDark() ? 'light_mode' : 'dark_mode',
        action: () => {
          this.themeService.toggleTheme();
          this.close();
        }
      },
      {
        id: 'act-workspaces',
        title: 'Switch Active Workspace',
        description: 'Select an organization or project workspace',
        category: 'Actions',
        icon: 'business',
        action: () => this.navigate('/workspaces')
      },
      {
        id: 'act-logout',
        title: 'Sign Out',
        description: 'End current authentication session',
        category: 'System',
        icon: 'logout',
        action: () => {
          this.authService.logout();
          this.navigate('/login');
        }
      }
    ];

    return list;
  }

  filteredCommands = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.commands;
    return this.commands.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  });

  open(): void {
    this.isOpen.set(true);
    this.query.set('');
    this.selectedIndex.set(0);
    setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.query.set(val);
    this.selectedIndex.set(0);
  }

  onKeydown(event: KeyboardEvent): void {
    const items = this.filteredCommands();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update(i => (i + 1) % (items.length || 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update(i => (i - 1 + items.length) % (items.length || 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (items[this.selectedIndex()]) {
        this.execute(items[this.selectedIndex()]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  execute(cmd: CommandItem): void {
    cmd.action();
  }

  private navigate(path: string): void {
    this.close();
    this.router.navigateByUrl(path);
  }
}

