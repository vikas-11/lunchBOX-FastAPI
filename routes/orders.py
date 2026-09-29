from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session, select

from database import get_session
from models import (
    Order,
    OrderCreate,
    OrderStatus,
    OrderUpdate,
    StatusLog,
    StatusLogRead,
)

router = APIRouter(prefix="/orders", tags=["orders"])


def _get_order_or_404(order_id: int, session: Session) -> Order:
    order = session.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/", response_model=Order, status_code=status.HTTP_201_CREATED)
def create_order(order: OrderCreate, session: Session = Depends(get_session)):
    db_order = Order(**order.model_dump())
    try:
        session.add(db_order)
        session.commit()
        session.refresh(db_order)
        return db_order
    except Exception:
        session.rollback()
        raise


@router.get("/", response_model=list[Order])
def list_orders(
    order_status: OrderStatus | None = Query(
        default=None, alias="status", description="Filter by order status"
    ),
    created_date: date | None = Query(
        default=None, description="Filter by creation date (YYYY-MM-DD)"
    ),
    search: str | None = Query(
        default=None, min_length=1, description="Search customer, address, or items"
    ),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    session: Session = Depends(get_session),
):
    query = select(Order)

    if order_status is not None:
        query = query.where(Order.status == order_status)

    if created_date is not None:
        start = datetime.combine(created_date, time.min, tzinfo=timezone.utc)
        end = datetime.combine(created_date, time.max, tzinfo=timezone.utc)
        query = query.where(Order.created_at >= start, Order.created_at <= end)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(
            Order.customer_name.ilike(pattern)
            | Order.delivery_address.ilike(pattern)
            | Order.items.ilike(pattern)
        )

    query = query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
    return list(session.exec(query).all())


@router.get("/{order_id}", response_model=Order)
def get_order(order_id: int, session: Session = Depends(get_session)):
    return _get_order_or_404(order_id, session)


@router.patch("/{order_id}", response_model=Order)
def update_order(
    order_id: int,
    payload: OrderUpdate,
    session: Session = Depends(get_session),
):
    db_order = _get_order_or_404(order_id, session)
    update_data = payload.model_dump(exclude_unset=True)

    old_status = db_order.status
    new_status = update_data.get("status")

    for field, value in update_data.items():
        setattr(db_order, field, value)

    db_order.updated_at = datetime.now(timezone.utc)

    if new_status is not None and new_status != old_status:
        session.add(
            StatusLog(
                order_id=order_id,
                old_status=old_status,
                new_status=new_status,
            )
        )

    try:
        session.add(db_order)
        session.commit()
        session.refresh(db_order)
        return db_order
    except Exception:
        session.rollback()
        raise


@router.get("/{order_id}/history", response_model=list[StatusLogRead])
def order_history(order_id: int, session: Session = Depends(get_session)):
    _get_order_or_404(order_id, session)
    query = (
        select(StatusLog)
        .where(StatusLog.order_id == order_id)
        .order_by(StatusLog.changed_at.desc())
    )
    return list(session.exec(query).all())


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, session: Session = Depends(get_session)):
    db_order = _get_order_or_404(order_id, session)
    logs = session.exec(select(StatusLog).where(StatusLog.order_id == order_id)).all()
    try:
        for log in logs:
            session.delete(log)
        session.delete(db_order)
        session.commit()
    except Exception:
        session.rollback()
        raise
    return Response(status_code=status.HTTP_204_NO_CONTENT)
