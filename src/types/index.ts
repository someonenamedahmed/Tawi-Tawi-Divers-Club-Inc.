export type InteractionCategory =
  | 'process'
  | 'difficulty'
  | 'complaint'
  | 'suggestion'
  | 'general';

export type SentimentType = 'positive' | 'neutral' | 'needs_attention' | 'critical';

export interface UserProfile {
  id: string; // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
  department: string;
  jobDescription: string;
  isSuperAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  department: string;
  category: InteractionCategory;
  prompt: string;
  response: string;
  reflectionSummary?: string;
  modelUsed?: string;
  sentiment?: SentimentType;
  tags?: string[];
  actionItems?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyBenchmark {
  id: string;
  title: string;
  category: 'quality_standard' | 'sop' | 'policy' | 'kpi' | 'audit_rubric';
  content: string;
  uploadedBy: string;
  uploadedByUid: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface AggregateAuditReport {
  executiveSummary: string;
  complianceScore: number;
  topConcerns: string[];
  departmentInsights: {
    department: string;
    status: 'Healthy' | 'Attention Needed' | 'Critical';
    summary: string;
    recommendations: string[];
  }[];
  strategicRoadmap: {
    phase: string;
    action: string;
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  reflectionSummary?: string;
  sentiment?: SentimentType;
  actionItems?: string[];
  modelUsed?: string;
  savedToDb?: boolean;
}
