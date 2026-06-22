from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import engine, Base
from apis.v1.analyzer import router as analyzer_api
from apis.v1.auth import router as auth_api
from apis.v1.chat import router as chat_api
from apis.v1.situation import router as situation_api


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(router=auth_api)
app.include_router(router=chat_api)
app.include_router(router=situation_api)
app.include_router(router=analyzer_api)

origins = [
    "*",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
