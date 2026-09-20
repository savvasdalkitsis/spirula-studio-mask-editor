import os
import io
import sys
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .dataset import (
    DatasetManager,
    get_default_dataset_root,
    load_persisted_state,
    save_persisted_state,
)

app = FastAPI(title="Spirula Mask Studio", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_for_static(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.endswith((".js", ".css", ".html")) or path == "/":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# Determine default dataset root
DEFAULT_ROOT = get_default_dataset_root()
dataset_mgr = DatasetManager(root_path=DEFAULT_ROOT)

class ConfigRequest(BaseModel):
    dataset_root: str

class StateUpdateRequest(BaseModel):
    dataset_root: Optional[str] = None
    sequence: Optional[str] = None
    frame_index: Optional[int] = None
    frame_filename: Optional[str] = None

class ClearMaskRequest(BaseModel):
    fill: int = 255

class CopyMaskRequest(BaseModel):
    src_filename: str

class PropagateMaskRequest(BaseModel):
    count: int = 5
    direction: str = "forward"

@app.get("/api/config")
def get_config():
    sequences = dataset_mgr.scan_sequences()
    state = load_persisted_state()
    return {
        "dataset_root": str(dataset_mgr.root_path),
        "exists": dataset_mgr.root_path.exists(),
        "sequences": sequences,
        "state": state
    }

@app.post("/api/config")
def set_config(req: ConfigRequest):
    if not dataset_mgr.set_root(req.dataset_root):
        raise HTTPException(status_code=400, detail="Invalid dataset directory path")
    return get_config()

@app.get("/api/state")
def get_state():
    return load_persisted_state()

@app.post("/api/state")
def update_state(req: StateUpdateRequest):
    updates = req.model_dump(exclude_unset=True)
    if req.dataset_root and Path(req.dataset_root).exists() and Path(req.dataset_root).is_dir():
        dataset_mgr.set_root(req.dataset_root)
    return save_persisted_state(updates)

@app.get("/api/browse")
def browse_directory(path: Optional[str] = None):
    return dataset_mgr.browse_directory(path)

@app.get("/api/sequences")
def get_sequences():
    return dataset_mgr.scan_sequences()

@app.get("/api/frames/{sequence}")
def get_frames(sequence: str, refresh: bool = False):
    frames = dataset_mgr.get_frames(sequence, refresh=refresh)
    if not frames:
        raise HTTPException(status_code=404, detail="Sequence not found or empty")
    return frames

@app.get("/api/image/{sequence}/{filename}")
def get_image(sequence: str, filename: str, res: str = "preview", max_dim: int = 1920):
    if res == "full":
        p = dataset_mgr.get_image_path(sequence, filename)
        if not p or not p.exists():
            raise HTTPException(status_code=404, detail="Image not found")
        return FileResponse(p, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=3600"})
    else:
        try:
            cache_p, media_type = dataset_mgr.get_preview_image(sequence, filename, max_dim=max_dim)
            return FileResponse(cache_p, media_type=media_type, headers={"Cache-Control": "public, max-age=3600"})
        except Exception as e:
            raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/mask/{sequence}/{filename}")
def get_mask(sequence: str, filename: str, res: str = "full", max_dim: int = 1920):
    mask_path = dataset_mgr.get_mask_path(sequence, filename)
    if not mask_path or not mask_path.exists():
        raise HTTPException(status_code=404, detail="Mask not found")

    if res == "preview":
        res_tuple = dataset_mgr.get_preview_mask(sequence, filename, max_dim=max_dim)
        if res_tuple:
            cache_p, media_type = res_tuple
            return FileResponse(cache_p, media_type=media_type, headers={"Cache-Control": "no-cache"})

    return FileResponse(mask_path, media_type="image/png", headers={"Cache-Control": "no-cache"})

@app.post("/api/mask/{sequence}/{filename}")
async def save_mask(sequence: str, filename: str, request: Request):
    """Accepts either raw PNG binary body or multipart file."""
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        file_obj = form.get("mask")
        if not file_obj:
            raise HTTPException(status_code=400, detail="Missing 'mask' form field")
        mask_bytes = await file_obj.read()
    else:
        mask_bytes = await request.body()

    if not mask_bytes:
        raise HTTPException(status_code=400, detail="Empty mask payload")

    try:
        res = dataset_mgr.save_mask(sequence, filename, mask_bytes)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/mask/{sequence}/{filename}")
def delete_mask(sequence: str, filename: str):
    res = dataset_mgr.delete_mask(sequence, filename)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to delete mask"))
    return res

@app.post("/api/mask/{sequence}/{filename}/clear")
def clear_mask(sequence: str, filename: str, req: ClearMaskRequest):
    try:
        res = dataset_mgr.clear_mask(sequence, filename, fill_value=req.fill)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mask/{sequence}/{filename}/copy-from")
def copy_mask(sequence: str, filename: str, req: CopyMaskRequest):
    res = dataset_mgr.copy_mask(sequence, req.src_filename, filename)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Copy failed"))
    return res

@app.post("/api/mask/{sequence}/{filename}/propagate")
def propagate_mask(sequence: str, filename: str, req: PropagateMaskRequest):
    res = dataset_mgr.propagate_mask(sequence, filename, count=req.count, direction=req.direction)
    return res

# Static files
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
