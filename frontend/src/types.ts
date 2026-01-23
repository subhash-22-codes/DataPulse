// src/types.ts
export interface Owner {
  name?: string | null;
  email: string;
}

export interface TeamMember {
  id: string;
  name?: string;
  email: string;
}

// NEW: A specific type for the summary statistics from pandas.describe()
export interface SummaryStats {
  [columnName: string]: {
    count: number;
    mean: number;
    std: number;
    min: number;
    '25%': number;
    '50%': number;
    '75%': number;
    max: number;
  };
}

export type InsightSeverity = "low" | "medium" | "high";

export type UploadInsight = {
  type: string;
  severity: InsightSeverity;
  message: string;
};

export type QualityReport = {
  missing_by_column: Record<string, number>;
  missing_percent_by_column: Record<string, number>;
  unique_count_by_column: Record<string, number>;
  unique_percent_by_column: Record<string, number>;
  duplicate_rows: number;
  outliers_by_column: Record<string, number>;
};

export type AnalysisResults = {
  row_count: number;
  column_count: number;
  summary_stats: SummaryStats | null;
  quality_report?: QualityReport;
  insights?: UploadInsight[];
  is_truncated?: boolean;
};

export interface DataUpload {
  id: string;
  file_path: string;
  uploaded_at: string;
  schema_info: { [key: string]: string } | null;

  analysis_results: AnalysisResults | null;

  schema_changed_from_previous: boolean;
  upload_type: "manual" | "api_poll" | "db_query";
}

export interface TrendDataPoint {
  date: string;
  value: number | null;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  team_members?: TeamMember[];
  data_source?: string;
  created_at: string;
  owner_id: string;
  owner: Owner;
  api_url?: string;
  polling_interval?: string;
  is_polling_active?: boolean;
  tracked_column?: string;
  api_header_name?: string; 
  db_type?: string;
  db_host?: string;
  db_port?: number;
  db_user?: string;
  db_name?: string;
  db_query?: string;
  description_last_updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  last_failure_reason?: string | null;
  auto_disabled_at?: string | null;
  failure_count?: number;
}

// In src/types.ts
export interface AlertRule {
  id: string;
  column_name: string;
  metric: string;
  condition: string;
  value: number;
  is_active: boolean;
}

export interface IllustrationProps {
  className?: string;
}