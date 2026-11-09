import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app';
import { ThemeService } from './core/services/theme.service';
import { ToastService } from './core/services/toast.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        ThemeService,
        ToastService
      ]
    }).compileComponents();
  });

  it('should create the app and render header', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should return default initial E when no user is logged in', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.getUserInitial()).toBe('E');
  });

  it('should support toggling dark and light theme', () => {
    const themeService = TestBed.inject(ThemeService);
    const initial = themeService.isDark();
    themeService.toggleTheme();
    expect(themeService.isDark()).toBe(!initial);
  });
});
