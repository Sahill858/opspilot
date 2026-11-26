from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_requests: int
    pending_requests: int
    approved_requests: int
    rejected_requests: int


class MonthlyTrend(BaseModel):
    month: str
    total: int


class DistributionItem(BaseModel):
    name: str
    total: int


class ApprovalPerformance(BaseModel):
    total_approvals: int
    approved: int
    rejected: int
    approval_rate: float


class AnalyticsResponse(BaseModel):
    summary: AnalyticsSummary
    monthly_trend: list[MonthlyTrend]
    status_distribution: list[DistributionItem]
    priority_distribution: list[DistributionItem]
    approval_performance: ApprovalPerformance