import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models.url import URL
from app.schemas.url import URLCreate, URLResponse, URLStats
from app.utils.short_code import generate_short_code

# Criar tabelas no banco de dados
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="URL Shortner API",
    description="API para encurtamento de URL com contagem de cliques e estatísticas.",
    version="1.0.0"
)

# Configuração de CORS para permitir requisições de origens locais/externas
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caminho para os arquivos estáticos
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Bem-vindo à API do Encurtador de URLs!"}


@app.post("/shorten", response_model=URLResponse, status_code=status.HTTP_201_CREATED)
def shorten_url(url_data: URLCreate, db: Session = Depends(get_db)):
    original_url_str = str(url_data.original_url)

    # Verificar se a URL já foi encurtada previamente
    existing_url = db.query(URL).filter(URL.original_url == original_url_str).first()
    if existing_url:
        return existing_url

    # Gerar um código único
    short_code = generate_short_code()
    while db.query(URL).filter(URL.short_code == short_code).first():
        short_code = generate_short_code()

    new_url = URL(
        original_url=original_url_str,
        short_code=short_code
    )
    db.add(new_url)
    db.commit()
    db.refresh(new_url)
    return new_url


@app.get("/stats/{short_code}", response_model=URLStats)
def get_url_stats(short_code: str, db: Session = Depends(get_db)):
    db_url = db.query(URL).filter(URL.short_code == short_code).first()
    if not db_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="URL encurtada não encontrada."
        )
    return db_url


@app.get("/{short_code}")
def redirect_to_url(short_code: str, db: Session = Depends(get_db)):
    db_url = db.query(URL).filter(URL.short_code == short_code).first()
    if not db_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="URL encurtada não encontrada."
        )

    # Incrementar contador de cliques
    db_url.clicks += 1
    db.commit()

    return RedirectResponse(url=db_url.original_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
