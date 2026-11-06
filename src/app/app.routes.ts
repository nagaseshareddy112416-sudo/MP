import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { WorkspaceSelectorComponent } from './features/workspace/workspace-selector.component';
import { AdminSettingsComponent } from './features/workspace/admin-settings.component';
import { MapViewComponent } from './features/map/map-view.component';
import { UploadDrawingComponent } from './features/upload/upload-drawing.component';
import { RevisionHistoryComponent } from './features/revisions/revision-history.component';
import { ClashesListComponent } from './features/clashes/clashes-list.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { authGuard } from './core/services/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'workspaces', component: WorkspaceSelectorComponent, canActivate: [authGuard] },
  { path: 'map', component: MapViewComponent, canActivate: [authGuard] },
  { path: 'upload', component: UploadDrawingComponent, canActivate: [authGuard] },
  { path: 'revisions', component: RevisionHistoryComponent, canActivate: [authGuard] },
  { path: 'clashes', component: ClashesListComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'admin/settings', component: AdminSettingsComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'map', pathMatch: 'full' },
  { path: '**', redirectTo: 'map' }
];
