from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import create_tables
from routes.orders import router as orders_router
from routes.stats import router as stats_router

BASE_DIR = Path(__file__).resolve().parent


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    print("lunchBOX database ready.")
    yield
    print("lunchBOX application shutdown.")


app = FastAPI(
    title="lunchBOX API",
    description="Smart tiffin delivery order management and live status tracking API.",
    version="2.0.0",
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.include_router(orders_router)
app.include_router(stats_router)


@app.get("/", include_in_schema=False)
def dashboard():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/orders-page", include_in_schema=False)
def orders_page():
    return FileResponse(BASE_DIR / "static" / "orders.html")


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "lunchBOX API", "version": "2.0.0"}
