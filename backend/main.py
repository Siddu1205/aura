import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import router
from backend.seed import seed_database
from backend.services.orchestrator import start_orchestrator, stop_orchestrator

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aura.main")

app = FastAPI(title="AURA - Autonomous Business Nervous System", version="2.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathon, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="/api")

@app.on_event("startup")
def on_startup():
    logger.info("Initializing database and seeding baseline data...")
    seed_database()
    logger.info("Starting background orchestrator loop...")
    start_orchestrator()

@app.on_event("shutdown")
def on_shutdown():
    logger.info("Stopping background orchestrator...")
    stop_orchestrator()

@app.get("/")
def read_root():
    return {"status": "AURA Nervous System Active"}
