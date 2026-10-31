from decimal import Decimal
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class DashboardAdminStats(BaseModel):
    totalCustomers: int
    activeSubscriptions: int
    totalProducts: int
    monthlyRecurringRevenue: float
    revenueReceived: float
    outstandingInvoicesCount: int
    outstandingTotal: float
    overdueInvoicesCount: int
    revenueChart: List[Dict[str, Any]]
    statusDistribution: List[Dict[str, Any]]
    growthChart: List[Dict[str, Any]]
    recentCustomers: List[Dict[str, Any]]
    recentSubscriptions: List[Dict[str, Any]]
    recentPayments: List[Dict[str, Any]]
    urgentInvoices: List[Dict[str, Any]]


class DashboardStaffStats(BaseModel):
    totalCustomers: int
    totalQuotations: int
    activeSubscriptions: int
    pendingInvoicesCount: int
    overdueInvoicesCount: int
    recentPaymentsCount: int
    recentQuotations: List[Dict[str, Any]]
    recentSubscriptions: List[Dict[str, Any]]
    urgentInvoices: List[Dict[str, Any]]
    pendingTasks: List[Dict[str, Any]]


class DashboardCustomerStats(BaseModel):
    currentSubscription: Optional[Dict[str, Any]] = None
    allSubscriptions: List[Dict[str, Any]] = []
    invoices: List[Dict[str, Any]] = []
    payments: List[Dict[str, Any]] = []
    outstandingBalance: float = 0.0
    unpaidInvoices: List[Dict[str, Any]] = []


class RevenueReport(BaseModel):
    total_revenue: float
    recurring_revenue: float
    one_off_revenue: float
    period: str
    monthly_trend: List[Dict[str, Any]]
