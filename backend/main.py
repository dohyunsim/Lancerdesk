from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import ai, analytics, conversations, health, projects

app = FastAPI(
    title="Lancerdesk API",
    description="AI-powered CRM for freelancers on soomgo.com",
    version="1.0.0",
)

# CORS — allow the Chrome extension and Next.js dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://*",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(conversations.router)
app.include_router(projects.router)
app.include_router(ai.router)
app.include_router(analytics.router)
