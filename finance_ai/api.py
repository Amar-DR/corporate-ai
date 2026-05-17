from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import init_db, close_db
from routers.chat import router as chat_router
from routers.transactions import router as txn_router
from routers.import_excel import router as import_router
from routers.summary import router as summary_router
from routers.portfolio import router as portfolio_router
from routers.advisor import router as advisor_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()

app = FastAPI(
    title="Finance AI",
    description="Asisten keuangan personal berbasis AI",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(txn_router)
app.include_router(import_router)
app.include_router(summary_router)
app.include_router(portfolio_router)
app.include_router(advisor_router)

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "finance_ai", "version": "2.0.0"}
