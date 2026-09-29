from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class OrderStatus(str, Enum):
    PREPARING = "preparing"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"


class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_name: str = Field(min_length=2, max_length=80, index=True)
    delivery_address: str = Field(min_length=5, max_length=250)
    items: str = Field(min_length=2, max_length=500)
    status: OrderStatus = Field(default=OrderStatus.PREPARING, index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class StatusLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", index=True)
    old_status: OrderStatus
    new_status: OrderStatus
    changed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), index=True
    )


class OrderCreate(SQLModel):
    customer_name: str = Field(min_length=2, max_length=80)
    delivery_address: str = Field(min_length=5, max_length=250)
    items: str = Field(min_length=2, max_length=500)


class OrderUpdate(SQLModel):
    status: Optional[OrderStatus] = None
    delivery_address: Optional[str] = Field(default=None, min_length=5, max_length=250)
    items: Optional[str] = Field(default=None, min_length=2, max_length=500)


class StatusLogRead(SQLModel):
    id: int
    order_id: int
    old_status: OrderStatus
    new_status: OrderStatus
    changed_at: datetime


class DailySummary(SQLModel):
    date: date
    total_orders: int
    by_status: dict[str, int]


class OverviewStats(SQLModel):
    total_orders: int
    active_orders: int
    delivered_orders: int
    today_orders: int
    by_status: dict[str, int]
