import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Workspace, CadLayerMapping, CategoryConfig, CategoryFieldConfig } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  constructor(private http: HttpClient) {}

  getWorkspaces(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(this.apiUrl);
  }

  getWorkspace(id: string): Observable<Workspace> {
    return this.http.get<Workspace>(`${this.apiUrl}/${id}`);
  }

  createWorkspace(workspace: Partial<Workspace>): Observable<Workspace> {
    return this.http.post<Workspace>(this.apiUrl, workspace);
  }

  updateWorkspace(id: string, workspace: Partial<Workspace>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, workspace);
  }

  getLayerMappings(workspaceId: string): Observable<CadLayerMapping[]> {
    return this.http.get<CadLayerMapping[]>(`${this.apiUrl}/${workspaceId}/mappings`);
  }

  createLayerMapping(workspaceId: string, mapping: CadLayerMapping): Observable<CadLayerMapping> {
    return this.http.post<CadLayerMapping>(`${this.apiUrl}/${workspaceId}/mappings`, mapping);
  }

  deleteLayerMapping(workspaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/mappings/${id}`);
  }

  importLayerMappingCsv(workspaceId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${workspaceId}/mappings/import-csv`, formData);
  }

  getCategories(workspaceId: string): Observable<CategoryConfig[]> {
    return this.http.get<CategoryConfig[]>(`${this.apiUrl}/${workspaceId}/categories`);
  }

  getCategoryFields(workspaceId: string, categoryName: string): Observable<CategoryFieldConfig[]> {
    return this.http.get<CategoryFieldConfig[]>(`${this.apiUrl}/${workspaceId}/categories/${categoryName}/fields`);
  }

  createCategory(workspaceId: string, category: CategoryConfig): Observable<CategoryConfig> {
    return this.http.post<CategoryConfig>(`${this.apiUrl}/${workspaceId}/categories`, category);
  }

  createCategoryField(workspaceId: string, categoryName: string, field: CategoryFieldConfig): Observable<CategoryFieldConfig> {
    return this.http.post<CategoryFieldConfig>(`${this.apiUrl}/${workspaceId}/categories/${categoryName}/fields`, field);
  }
}

