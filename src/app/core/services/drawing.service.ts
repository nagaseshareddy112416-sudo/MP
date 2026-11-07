import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Drawing, DrawingRevision, Clash, DashboardStats, ReferenceLayer,
  DrawingStage, ToleranceRule, ComplianceResult, Deviation,
  ReviewDeviationRequest, ComplianceSummary
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class DrawingService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDrawings(workspaceId: string): Observable<Drawing[]> {
    return this.http.get<Drawing[]>(`${this.apiUrl}/workspaces/${workspaceId}/drawings`);
  }

  getDrawing(workspaceId: string, id: string): Observable<Drawing> {
    return this.http.get<Drawing>(`${this.apiUrl}/workspaces/${workspaceId}/drawings/${id}`);
  }

  previewDrawing(workspaceId: string, file: File, sourceEpsg?: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (sourceEpsg) {
      formData.append('sourceEpsg', sourceEpsg.toString());
    }
    return this.http.post(`${this.apiUrl}/workspaces/${workspaceId}/drawings/preview`, formData);
  }

  uploadDrawing(workspaceId: string, formData: FormData): Observable<Drawing> {
    return this.http.post<Drawing>(`${this.apiUrl}/workspaces/${workspaceId}/drawings/upload`, formData);
  }

  deleteDrawing(workspaceId: string, drawingId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/workspaces/${workspaceId}/drawings/${drawingId}`);
  }

  setPinLocation(workspaceId: string, drawingId: string, lon: number, lat: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/workspaces/${workspaceId}/drawings/${drawingId}/pin`, { lon, lat });
  }

  getRevisions(workspaceId: string, drawingId: string): Observable<DrawingRevision[]> {
    return this.http.get<DrawingRevision[]>(`${this.apiUrl}/workspaces/${workspaceId}/drawings/${drawingId}/revisions`);
  }

  reviewRevision(workspaceId: string, drawingId: string, revisionId: string, approved: boolean, comments?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/workspaces/${workspaceId}/drawings/${drawingId}/revisions/${revisionId}/review`, {
      approved,
      comments
    });
  }

  getFeatures(workspaceId: string, bbox?: string, category?: string): Observable<any> {
    let params = new HttpParams();
    if (bbox) params = params.set('bbox', bbox);
    if (category) params = params.set('category', category);
    return this.http.get(`${this.apiUrl}/workspaces/${workspaceId}/features`, { params });
  }

  getClashes(workspaceId: string): Observable<Clash[]> {
    return this.http.get<Clash[]>(`${this.apiUrl}/workspaces/${workspaceId}/clashes`);
  }

  updateClashStatus(workspaceId: string, clashId: string, status: number, notes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/workspaces/${workspaceId}/clashes/${clashId}/status`, { status, notes });
  }

  getDashboardStats(workspaceId: string): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/workspaces/${workspaceId}/dashboard`);
  }

  getReferenceLayers(workspaceId: string): Observable<ReferenceLayer[]> {
    return this.http.get<ReferenceLayer[]>(`${this.apiUrl}/workspaces/${workspaceId}/reference-layers`);
  }

  uploadReferenceLayer(workspaceId: string, name: string, color: string, file: File): Observable<ReferenceLayer> {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('color', color);
    formData.append('file', file);
    return this.http.post<ReferenceLayer>(`${this.apiUrl}/workspaces/${workspaceId}/reference-layers`, formData);
  }

  deleteReferenceLayer(workspaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/workspaces/${workspaceId}/reference-layers/${id}`);
  }

  exportGeoJsonUrl(workspaceId: string, category?: string): string {
    let url = `${this.apiUrl}/workspaces/${workspaceId}/features/export-geojson`;
    if (category) url += `?category=${encodeURIComponent(category)}`;
    return url;
  }

  exportClashesCsvUrl(workspaceId: string): string {
    return `${this.apiUrl}/workspaces/${workspaceId}/clashes/export-csv`;
  }

  // Phase 9: Drawing Stages & As-Built Compliance
  getDrawingStages(workspaceId: string): Observable<DrawingStage[]> {
    return this.http.get<DrawingStage[]>(`${this.apiUrl}/workspaces/${workspaceId}/stages`);
  }

  evaluateCompliance(workspaceId: string, asBuiltDrawingId: string): Observable<ComplianceResult[]> {
    return this.http.post<ComplianceResult[]>(`${this.apiUrl}/workspaces/${workspaceId}/compliance/evaluate/${asBuiltDrawingId}`, {});
  }

  getComplianceResults(workspaceId: string, asBuiltDrawingId: string): Observable<ComplianceResult[]> {
    return this.http.get<ComplianceResult[]>(`${this.apiUrl}/workspaces/${workspaceId}/compliance/results/${asBuiltDrawingId}`);
  }

  getComplianceSummary(workspaceId: string): Observable<ComplianceSummary> {
    return this.http.get<ComplianceSummary>(`${this.apiUrl}/workspaces/${workspaceId}/compliance/summary`);
  }

  getToleranceRules(workspaceId: string): Observable<ToleranceRule[]> {
    return this.http.get<ToleranceRule[]>(`${this.apiUrl}/workspaces/${workspaceId}/compliance/rules`);
  }

  updateToleranceRule(workspaceId: string, id: string, rule: Partial<ToleranceRule>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/workspaces/${workspaceId}/compliance/rules/${id}`, rule);
  }

  getDeviations(workspaceId: string, filter?: { category?: string; status?: string; decision?: string }): Observable<ComplianceResult[]> {
    let params = new HttpParams();
    if (filter?.category) params = params.set('category', filter.category);
    if (filter?.status) params = params.set('status', filter.status);
    if (filter?.decision) params = params.set('decision', filter.decision);
    return this.http.get<ComplianceResult[]>(`${this.apiUrl}/workspaces/${workspaceId}/deviations`, { params });
  }

  reviewDeviation(workspaceId: string, deviationId: string, req: ReviewDeviationRequest): Observable<Deviation> {
    return this.http.post<Deviation>(`${this.apiUrl}/workspaces/${workspaceId}/deviations/${deviationId}/decision`, req);
  }

  exportComplianceCsvUrl(workspaceId: string, asBuiltDrawingId: string): string {
    return `${this.apiUrl}/workspaces/${workspaceId}/compliance/export/csv/${asBuiltDrawingId}`;
  }

  exportComplianceGeoJsonUrl(workspaceId: string, asBuiltDrawingId: string): string {
    return `${this.apiUrl}/workspaces/${workspaceId}/compliance/export/geojson/${asBuiltDrawingId}`;
  }
}

