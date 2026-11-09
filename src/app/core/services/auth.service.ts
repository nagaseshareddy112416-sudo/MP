import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, Workspace } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  
  currentUser = signal<LoginResponse | null>(null);
  activeWorkspace = signal<Workspace | null>(null);

  constructor(private http: HttpClient) {
    this.loadSession();
  }

  private getStorageItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Ignore security or storage errors
    }
    return null;
  }

  private setStorageItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore storage errors
    }
  }

  private removeStorageItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage errors
    }
  }

  private loadSession(): void {
    const session = this.getStorageItem('gfc_session');
    if (session) {
      try {
        const user: LoginResponse = JSON.parse(session);
        this.currentUser.set(user);
      } catch (e) {
        this.removeStorageItem('gfc_session');
      }
    }

    const savedWs = this.getStorageItem('gfc_active_workspace');
    if (savedWs) {
      try {
        this.activeWorkspace.set(JSON.parse(savedWs));
      } catch (e) {
        this.removeStorageItem('gfc_active_workspace');
      }
    }
  }

  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        this.currentUser.set(res);
        this.setStorageItem('gfc_session', JSON.stringify(res));
      })
    );
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, data);
  }

  logout(): void {
    this.currentUser.set(null);
    this.activeWorkspace.set(null);
    this.removeStorageItem('gfc_session');
    this.removeStorageItem('gfc_active_workspace');
  }

  setActiveWorkspace(workspace: Workspace): void {
    this.activeWorkspace.set(workspace);
    this.setStorageItem('gfc_active_workspace', JSON.stringify(workspace));
  }

  getToken(): string | null {
    return this.currentUser()?.token ?? null;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser()?.token;
  }

  isWorkspaceAdmin(): boolean {
    const ws = this.activeWorkspace();
    const user = this.currentUser();
    if (!ws || !user) return false;
    return user.roles.some(r => r.workspaceId === ws.id && r.role === 'WorkspaceAdmin');
  }

  canUpload(): boolean {
    const ws = this.activeWorkspace();
    const user = this.currentUser();
    if (!ws || !user) return false;
    return user.roles.some(r => r.workspaceId === ws.id && (r.role === 'WorkspaceAdmin' || r.role === 'Uploader'));
  }

  canReview(): boolean {
    const ws = this.activeWorkspace();
    const user = this.currentUser();
    if (!ws || !user) return false;
    return user.roles.some(r => r.workspaceId === ws.id && (r.role === 'WorkspaceAdmin' || r.role === 'Reviewer'));
  }
}

