from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, func, select

from database import get_session
from models import DailySummary, Order, OrderStatus, OverviewStats

router = APIRouter(prefix="/stats", tags=["stats"])


def _day_bounds(day: date) -> tuple[datetime, datetime]:
    return (
        datetime.combine(day, time.min, tzinfo=timezone.utc),
        datetime.combine(day, time.max, tzinfo=timezone.utc),
    )


@router.get("/daily", response_model=DailySummary)
def daily_summary(
    summary_date: date | None = Query(
        default=None, description="Date for summary (YYYY-MM-DD)"
    ),
    session: Session = Depends(get_session),
):
    day = summary_date or datetime.now(timezone.utc).date()
    start, end = _day_bounds(day)

    summary: dict[str, int] = {}
    total = 0

    for order_status in OrderStatus:
        count = session.exec(
            select(func.count(Order.id)).where(
                Order.created_at >= start,
                Order.created_at <= end,
                Order.status == order_status,
            )
        ).one()
        count = int(count or 0)
        summary[order_status.value] = count
        total += count

    return DailySummary(date=day, total_orders=total, by_status=summary)


@router.get("/overview", response_model=OverviewStats)
def overview(session: Session = Depends(get_session)):
    total_orders = int(session.exec(select(func.count(Order.id))).one() or 0)
    delivered_orders = int(
        session.exec(
            select(func.count(Order.id)).where(Order.status == OrderStatus.DELIVERED)
        ).one()
        or 0
    )
    active_orders = total_orders - delivered_orders

    today = datetime.now(timezone.utc).date()
    start, end = _day_bounds(today)
    today_orders = int(
        session.exec(
            select(func.count(Order.id)).where(
                Order.created_at >= start, Order.created_at <= end
            )
        ).one()
        or 0
    )

    by_status: dict[str, int] = {}
    for order_status in OrderStatus:
        by_status[order_status.value] = int(
            session.exec(
                select(func.count(Order.id)).where(Order.status == order_status)
            ).one()
            or 0
        )

    return OverviewStats(
        total_orders=total_orders,
        active_orders=active_orders,
        delivered_orders=delivered_orders,
        today_orders=today_orders,
        by_status=by_status,
    )
