"""Katagami style-embedding service.

Serves the style/authorship encoders the WASM verifier cannot host:
STAR (the bake-off champion), LUAR, Wegmann Style-Embedding, StyleDistance.
Report-only consumers: the curation finalizer's fusion column and the
research harness. Bearer-auth; models lazy-load on first use and stay warm.
"""
import os
import threading

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

MODELS = {
    "star": "AIDA-UPM/star",
    "luar": "gabrielloiseau/LUAR-MUD-sentence-transformers",
    "wegmann": "AnnaWegmann/Style-Embedding",
    "styledistance": "StyleDistance/styledistance",
}
KEY = os.environ.get("STYLE_EMBED_KEY", "")
app = FastAPI()
_cache: dict = {}
_lock = threading.Lock()


def get_model(name: str):
    with _lock:
        if name not in _cache:
            from sentence_transformers import SentenceTransformer

            _cache[name] = SentenceTransformer(MODELS[name], trust_remote_code=True)
        return _cache[name]


class EmbedRequest(BaseModel):
    model: str = "star"
    texts: list[str]


@app.get("/healthz")
def healthz():
    return {"ok": True, "models": list(MODELS), "loaded": list(_cache)}


@app.post("/embed")
def embed(req: EmbedRequest, authorization: str = Header(default="")):
    if not KEY or authorization != f"Bearer {KEY}":
        raise HTTPException(401, "bad key")
    if req.model not in MODELS:
        raise HTTPException(400, f"unknown model {req.model}; one of {list(MODELS)}")
    if not req.texts or len(req.texts) > 64:
        raise HTTPException(400, "1..64 texts")
    model = get_model(req.model)
    vectors = model.encode(req.texts, normalize_embeddings=True)
    return {
        "model": req.model,
        "model_id": MODELS[req.model],
        "dims": int(vectors.shape[1]),
        "vectors": [[round(float(x), 6) for x in v] for v in vectors],
    }
