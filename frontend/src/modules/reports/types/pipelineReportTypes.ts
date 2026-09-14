export interface PipelineStageRes {
  stage: string;
  opportunityCount: number;
  totalExpectedValue: number;
  averageDaysInStage: number;
  stalledCount: number;
  stalledOpportunityIds: number[];
}

export interface PipelineReportRes {
  totalOpportunityCount: number;
  totalExpectedValue: number;
  stalledThresholdDays: number;
  generatedAt: string; // ISO date
  stages: PipelineStageRes[];
}
