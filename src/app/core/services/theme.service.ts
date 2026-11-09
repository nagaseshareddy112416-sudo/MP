import { Injectable, signal, computed } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'gfc_theme_preference';
  
  themeMode = signal<ThemeMode>('system');
  isDark = signal<boolean>(false);

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    let savedMode: ThemeMode = 'system';
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(this.storageKey) as ThemeMode;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          savedMode = stored;
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    this.themeMode.set(savedMode);
    this.applyTheme();

    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.themeMode() === 'system') {
          this.applyTheme();
        }
      });
    }
  }

  setTheme(mode: ThemeMode): void {
    this.themeMode.set(mode);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storageKey, mode);
      }
    } catch {
      // Ignore
    }
    this.applyTheme();
  }

  toggleTheme(): void {
    const current = this.isDark();
    this.setTheme(current ? 'light' : 'dark');
  }

  private applyTheme(): void {
    const mode = this.themeMode();
    let dark = false;

    if (mode === 'dark') {
      dark = true;
    } else if (mode === 'light') {
      dark = false;
    } else {
      if (typeof window !== 'undefined' && window.matchMedia) {
        dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    }

    this.isDark.set(dark);

    if (typeof document !== 'undefined') {
      document.body.classList.toggle('dark-theme', dark);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }
  }
}
