# lunchBOX — Smart Tiffin Delivery Manager

lunchBOX is a polished FastAPI + SQLModel project for creating, tracking and managing tiffin/dabbawala delivery orders. It includes a responsive operations dashboard, order status workflow, search/filtering, daily statistics and status history.

## Features

- Create, view, update and delete delivery orders
- Status workflow: `preparing → picked_up → in_transit → delivered`
- Persistent status-change history
- Filter by status/date and search customer/address/items
- Daily and overall delivery statistics
- Responsive web dashboard served directly by FastAPI
- Swagger/OpenAPI docs at `/docs`
- SQLite database with SQLModel
- UTC-aware timestamps

## Project structure

```text
lunchBOX/
├── main.py
├── database.py
├── models.py
├── requirements.txt
├── routes/
│   ├── __init__.py
│   ├── orders.py
│   └── stats.py
└── static/
    ├── index.html
    ├── orders.html
    ├── styles.css
    ├── app.js
    └── orders.js
```

## Run locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Open:

- Dashboard: http://127.0.0.1:8000/
- Orders UI: http://127.0.0.1:8000/orders-page
- API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

## Main API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/orders/` | Create order |
| GET | `/orders/` | List/filter/search orders |
| GET | `/orders/{id}` | Get one order |
| PATCH | `/orders/{id}` | Update status/address/items |
| GET | `/orders/{id}/history` | Status history |
| DELETE | `/orders/{id}` | Delete order |
| GET | `/stats/daily` | Daily summary |
| GET | `/stats/overview` | Dashboard totals |
| GET | `/health` | Service health |

## Notes

The database file `lunchbox.db` is created automatically in the project directory on startup. The old course database is intentionally not required so the corrected schema starts cleanly.
