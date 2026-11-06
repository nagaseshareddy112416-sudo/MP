export interface LoginResponse {
  token: string;
  userId: string;
  username: string;
  fullName: string;
  mustChangePassword: boolean;
  roles: WorkspaceRole[];
}

export interface WorkspaceRole {
  workspaceId: string;
  workspaceName: string;
  role: string;
}

export interface Workspace {
  id: string;
  name: string;
  code: string;
  defaultEpsg: number;
  displayEpsg: number;
  centerLon: number;
  centerLat: number;
  defaultZoom: number;
  clashVerticalToleranceM: number;
  farFromExistingDataWarningM: number;
  createdAt: string;
}

export interface CadLayerMapping {
  id?: string;
  workspaceId?: string;
  cadLayer: string;
  category: string;
  subType: string;
  geometryType: string;
  color: string;
}

export interface CategoryConfig {
  id?: string;
  workspaceId?: string;
  categoryName: string;
  subTypeName: string;
  colorHex: string;
  iconName: string;
  displayOrder: number;
}

export interface CategoryFieldConfig {
  id?: string;
  workspaceId?: string;
  categoryName: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'select';
  isRequired: boolean;
  optionsJson?: string;
  displayOrder: number;
}

export interface Drawing {
  id: string;
  workspaceId: string;
  projectName: string;
  category: string;
  subType: string;
  currentRevision: string;
  status: string;
  reviewStatus: string;
  contractor?: string;
  consultant?: string;
  drawingDate?: string;
  sourceEpsg: number;
  chainageStart?: number;
  chainageEnd?: number;
  originalFileName: string;
  fileSize: number;
  fileType: string;
  processingStatus: string;
  processingError?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  pinLon?: number;
  pinLat?: number;
}

export interface DrawingRevision {
  id: string;
  drawingId: string;
  revisionNumber: string;
  originalFileName: string;
  reviewStatus: string;
  reviewComments?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  featureCount: number;
}

export interface Clash {
  id: string;
  workspaceId: string;
  featureAId: string;
  featureBId: string;
  featureACategory: string;
  featureASubType: string;
  featureADepth?: number;
  featureBCategory: string;
  featureBSubType: string;
  featureBDepth?: number;
  lon: number;
  lat: number;
  verticalGapM: number;
  status: number | string; // 0=Open, 1=Resolved, 2=Ignored
  notes?: string;
  detectedAt: string;
}

export interface ReferenceLayer {
  id: string;
  workspaceId: string;
  name: string;
  format: string;
  color: string;
  isVisible: boolean;
  geoJsonData?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalDrawings: number;
  totalFeatures: number;
  totalClashes: number;
  openClashes: number;
  statusCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  roadProgress: {
    roadName: string;
    totalLengthM: number;
    completedLengthM: number;
    percentComplete: number;
    status: string;
  }[];
  recentUploads: Drawing[];
}
