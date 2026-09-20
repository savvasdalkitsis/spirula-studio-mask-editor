import os
import re
import io
import json
import time
import shutil
import hashlib
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from PIL import Image

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
MASK_EXTS = {'.png'}

def natural_sort_key(s: str):
    """Sort strings with embedded numbers naturally (e.g. frame_2 before frame_10)."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def get_state_file_path() -> Path:
    data_env = os.environ.get("DATA_DIR")
    if data_env:
        p = Path(data_env)
        p.mkdir(parents=True, exist_ok=True)
        return p / "state.json"

    p_data = Path("/data")
    if p_data.exists() and os.access(str(p_data), os.W_OK):
        return p_data / "state.json"

    fallback = Path(get_default_cache_dir()).parent
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback / "state.json"

def load_persisted_state() -> dict:
    state_file = get_state_file_path()
    if state_file.exists():
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[load_persisted_state] Error loading state from {state_file}: {e}")
    return {}

def save_persisted_state(updates: dict) -> dict:
    state_file = get_state_file_path()
    current = load_persisted_state()
    for k, v in updates.items():
        if v is None and k in current:
            del current[k]
        elif v is not None:
            current[k] = v
    try:
        state_file.parent.mkdir(parents=True, exist_ok=True)
        tmp = state_file.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
        tmp.replace(state_file)
    except Exception as e:
        print(f"[save_persisted_state] Error saving state to {state_file}: {e}")
    return current

def get_default_dataset_root() -> str:
    # 1. Check saved state
    saved_state = load_persisted_state()
    saved_root = saved_state.get("dataset_root")
    if saved_root and Path(saved_root).exists() and Path(saved_root).is_dir():
        return saved_root

    # 2. Check environment variable
    env_root = os.environ.get("DATASET_ROOT")
    if env_root and Path(env_root).exists():
        return env_root

    candidates = [
        Path("/nvr/splats/hovoli"),
        Path.home() / "nvr" / "splats" / "hovoli",
        Path("/nvr"),
        Path.home() / "nvr",
        Path(r"E:\Hovoli\Hovoli_dataset"),
        Path(r"E:\Hovoli"),
        Path("/data"),
    ]
    for c in candidates:
        if c.exists() and c.is_dir():
            return str(c)
    return str(Path.cwd())

def get_default_cache_dir() -> str:
    env_cache = os.environ.get("CACHE_DIR") or os.environ.get("CACHES")
    if env_cache:
        return str(Path(env_cache) / "previews")
    if os.name == 'nt' and Path(r"E:\mask-editor").exists():
        return r"E:\mask-editor\.cache\previews"
    return str(Path.home() / ".cache" / "masks" / "previews")

class DatasetManager:
    def __init__(self, root_path: Optional[str] = None, cache_dir: Optional[str] = None):
        if not root_path:
            root_path = get_default_dataset_root()
        self.root_path = Path(root_path)

        if not cache_dir:
            cache_dir = get_default_cache_dir()
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._frame_cache: Dict[str, List[dict]] = {}

    def set_root(self, path_str: str) -> bool:
        p = Path(path_str)
        if p.exists() and p.is_dir():
            self.root_path = p
            self._frame_cache.clear()
            save_persisted_state({
                "dataset_root": str(self.root_path),
                "sequence": None,
                "frame_index": 0,
                "frame_filename": None
            })
            return True
        return False

    @property
    def images_dir(self) -> Path:
        return self.root_path / "images"

    @property
    def masks_dir(self) -> Path:
        return self.root_path / "masks"

    def _resolve_seq_dirs(self, sequence: str) -> Tuple[Path, Path]:
        """Resolves image and mask directories for a sequence, supporting subdatasets."""
        if "/" in sequence or "\\" in sequence:
            parts = Path(sequence).parts
            img_dir = self.root_path / parts[0] / "images" / Path(*parts[1:])
            mask_dir = self.root_path / parts[0] / "masks" / Path(*parts[1:])
        else:
            img_dir = self.images_dir / sequence
            mask_dir = self.masks_dir / sequence
        return img_dir, mask_dir

    def scan_sequences(self) -> List[Dict]:
        """List all video / capture sequences available in dataset."""
        sequences = []

        # Case 1: Root directly contains images/ and masks/
        if self.images_dir.exists() and self.images_dir.is_dir():
            for d in sorted(self.images_dir.iterdir(), key=lambda x: natural_sort_key(x.name)):
                if not d.is_dir():
                    continue
                img_count = sum(1 for f in d.iterdir() if f.suffix.lower() in IMAGE_EXTS)
                mask_seq_dir = self.masks_dir / d.name
                mask_count = sum(1 for f in mask_seq_dir.iterdir() if f.suffix.lower() in MASK_EXTS) if mask_seq_dir.exists() else 0

                sequences.append({
                    "name": d.name,
                    "image_count": img_count,
                    "mask_count": mask_count,
                    "missing_count": max(0, img_count - mask_count),
                    "path": str(d)
                })
        else:
            # Case 2: Parent folder containing multiple datasets (e.g. /nvr/splats with hovoli, santrivan)
            if self.root_path.exists() and self.root_path.is_dir():
                for sub in sorted(self.root_path.iterdir(), key=lambda x: natural_sort_key(x.name)):
                    if not sub.is_dir():
                        continue
                    sub_images = sub / "images"
                    sub_masks = sub / "masks"
                    if sub_images.exists() and sub_images.is_dir():
                        for d in sorted(sub_images.iterdir(), key=lambda x: natural_sort_key(x.name)):
                            if not d.is_dir():
                                continue
                            img_count = sum(1 for f in d.iterdir() if f.suffix.lower() in IMAGE_EXTS)
                            mask_seq_dir = sub_masks / d.name
                            mask_count = sum(1 for f in mask_seq_dir.iterdir() if f.suffix.lower() in MASK_EXTS) if mask_seq_dir.exists() else 0
                            seq_name = f"{sub.name}/{d.name}"
                            sequences.append({
                                "name": seq_name,
                                "image_count": img_count,
                                "mask_count": mask_count,
                                "missing_count": max(0, img_count - mask_count),
                                "path": str(d)
                            })

        return sequences

    def get_frames(self, sequence: str, refresh: bool = False) -> List[Dict]:
        """Get ordered list of frames for a sequence."""
        if not refresh and sequence in self._frame_cache:
            return self._frame_cache[sequence]

        img_seq_dir, mask_seq_dir = self._resolve_seq_dirs(sequence)

        if not img_seq_dir.exists():
            return []

        # Find all images
        img_files = [f for f in img_seq_dir.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTS]
        img_files.sort(key=lambda f: natural_sort_key(f.name))

        frames = []
        for idx, img_file in enumerate(img_files):
            stem = img_file.stem
            mask_file = mask_seq_dir / f"{stem}.png" if mask_seq_dir.exists() else None
            has_mask = mask_file is not None and mask_file.exists()

            frames.append({
                "index": idx,
                "filename": img_file.name,
                "stem": stem,
                "has_mask": has_mask,
                "mask_filename": f"{stem}.png" if has_mask else None,
                "image_size": img_file.stat().st_size if img_file.exists() else 0,
                "mask_size": mask_file.stat().st_size if has_mask else 0,
                "mask_mtime": mask_file.stat().st_mtime if has_mask else 0,
            })

        self._frame_cache[sequence] = frames
        return frames

    def get_image_path(self, sequence: str, filename: str) -> Optional[Path]:
        img_seq_dir, _ = self._resolve_seq_dirs(sequence)
        p = img_seq_dir / filename
        return p if p.exists() else None

    def get_mask_path(self, sequence: str, filename: str) -> Optional[Path]:
        _, mask_seq_dir = self._resolve_seq_dirs(sequence)
        stem = Path(filename).stem
        p = mask_seq_dir / f"{stem}.png"
        return p if p.exists() else None

    def get_preview_image(self, sequence: str, filename: str, max_dim: int = 1920) -> Tuple[Path, str]:
        """Return path to cached preview image or generate one."""
        img_path = self.get_image_path(sequence, filename)
        if not img_path:
            raise FileNotFoundError(f"Image not found: {sequence}/{filename}")

        mtime = img_path.stat().st_mtime
        cache_key = hashlib.md5(f"{img_path}_{mtime}_{max_dim}".encode()).hexdigest()
        cache_file = self.cache_dir / f"img_{cache_key}.jpg"

        if not cache_file.exists():
            with Image.open(img_path) as im:
                w, h = im.size
                if max(w, h) > max_dim:
                    scale = max_dim / max(w, h)
                    nw, nh = int(w * scale), int(h * scale)
                    # Draft resize for JPEG is very fast
                    if hasattr(im, 'draft'):
                        im.draft('RGB', (nw, nh))
                    im = im.resize((nw, nh), Image.Resampling.BILINEAR)
                if im.mode != 'RGB':
                    im = im.convert('RGB')
                im.save(cache_file, format='JPEG', quality=85)

        return cache_file, "image/jpeg"

    def get_preview_mask(self, sequence: str, filename: str, max_dim: int = 1920) -> Optional[Tuple[Path, str]]:
        """Return path to cached preview mask or generate one."""
        mask_path = self.get_mask_path(sequence, filename)
        if not mask_path:
            return None

        mtime = mask_path.stat().st_mtime
        cache_key = hashlib.md5(f"{mask_path}_{mtime}_{max_dim}".encode()).hexdigest()
        cache_file = self.cache_dir / f"msk_{cache_key}.png"

        if not cache_file.exists():
            with Image.open(mask_path) as im:
                w, h = im.size
                if max(w, h) > max_dim:
                    scale = max_dim / max(w, h)
                    nw, nh = int(w * scale), int(h * scale)
                    im = im.resize((nw, nh), Image.Resampling.NEAREST)
                if im.mode != 'L':
                    im = im.convert('L')
                im.save(cache_file, format='PNG')

        return cache_file, "image/png"

    def save_mask(self, sequence: str, filename: str, mask_bytes: bytes) -> Dict:
        """Save edited mask as mode L PNG, creating backup if existing."""
        stem = Path(filename).stem
        _, mask_seq_dir = self._resolve_seq_dirs(sequence)
        mask_seq_dir.mkdir(parents=True, exist_ok=True)
        mask_path = mask_seq_dir / f"{stem}.png"

        # Lookup corresponding image to ensure resolution matches
        img_path = self.get_image_path(sequence, filename)
        target_size = None
        if img_path:
            with Image.open(img_path) as im:
                target_size = im.size  # (width, height)

        # Parse uploaded mask
        with Image.open(io.BytesIO(mask_bytes)) as uploaded:
            # If RGBA, extract alpha or convert to grayscale
            if uploaded.mode == 'RGBA':
                gray = uploaded.convert('L')
            else:
                gray = uploaded.convert('L')

            if target_size and gray.size != target_size:
                gray = gray.resize(target_size, Image.Resampling.NEAREST)

            # Ensure pure binary mask (0 and 255)
            # Threshold at 128
            binary = gray.point(lambda p: 255 if p > 127 else 0, mode='L')

            # Backup existing mask
            if mask_path.exists():
                backup_dir = mask_seq_dir / ".backup_masks"
                backup_dir.mkdir(exist_ok=True)
                ts = int(time.time())
                backup_file = backup_dir / f"{stem}_{ts}.png"
                try:
                    shutil.copy2(mask_path, backup_file)
                    # Keep at most 10 recent backups for this frame
                    existing_backups = sorted(backup_dir.glob(f"{stem}_*.png"), key=lambda p: p.stat().st_mtime)
                    if len(existing_backups) > 10:
                        for old_b in existing_backups[:-10]:
                            old_b.unlink(missing_ok=True)
                except Exception as e:
                    print(f"Warning: backup failed: {e}")

            # Save binary PNG
            binary.save(mask_path, format='PNG')

        save_persisted_state({
            "sequence": sequence,
            "frame_filename": filename,
            "dataset_root": str(self.root_path)
        })

        # Invalidate frame cache
        if sequence in self._frame_cache:
            for fr in self._frame_cache[sequence]:
                if fr["stem"] == stem:
                    fr["has_mask"] = True
                    fr["mask_filename"] = f"{stem}.png"
                    fr["mask_size"] = mask_path.stat().st_size
                    fr["mask_mtime"] = mask_path.stat().st_mtime
                    break

        return {
            "success": True,
            "filename": f"{stem}.png",
            "size": mask_path.stat().st_size,
            "dimensions": target_size or binary.size
        }

    def delete_mask(self, sequence: str, filename: str) -> Dict:
        """Delete mask file, moving to .trash directory."""
        stem = Path(filename).stem
        _, mask_seq_dir = self._resolve_seq_dirs(sequence)
        mask_path = mask_seq_dir / f"{stem}.png"
        if not mask_path.exists():
            return {"success": False, "error": "Mask file does not exist"}

        trash_dir = mask_seq_dir / ".trash"
        trash_dir.mkdir(parents=True, exist_ok=True)
        ts = int(time.time())
        trash_file = trash_dir / f"{stem}_{ts}.png"
        shutil.move(mask_path, trash_file)

        # Update cache
        if sequence in self._frame_cache:
            for fr in self._frame_cache[sequence]:
                if fr["stem"] == stem:
                    fr["has_mask"] = False
                    fr["mask_filename"] = None
                    fr["mask_size"] = 0
                    fr["mask_mtime"] = 0
                    break

        return {"success": True, "trash_file": str(trash_file)}

    def clear_mask(self, sequence: str, filename: str, fill_value: int = 255) -> Dict:
        """Fill mask entirely with fill_value (255 = keep all, 0 = mask all)."""
        stem = Path(filename).stem
        img_path = self.get_image_path(sequence, filename)
        if not img_path:
            raise FileNotFoundError(f"Image not found: {sequence}/{filename}")

        with Image.open(img_path) as im:
            size = im.size

        blank = Image.new('L', size, color=(255 if fill_value >= 128 else 0))
        _, mask_seq_dir = self._resolve_seq_dirs(sequence)
        mask_seq_dir.mkdir(parents=True, exist_ok=True)
        mask_path = mask_seq_dir / f"{stem}.png"

        # Backup existing
        if mask_path.exists():
            backup_dir = mask_seq_dir / ".backup_masks"
            backup_dir.mkdir(exist_ok=True)
            ts = int(time.time())
            shutil.copy2(mask_path, backup_dir / f"{stem}_{ts}.png")

        blank.save(mask_path, format='PNG')

        if sequence in self._frame_cache:
            for fr in self._frame_cache[sequence]:
                if fr["stem"] == stem:
                    fr["has_mask"] = True
                    fr["mask_filename"] = f"{stem}.png"
                    fr["mask_size"] = mask_path.stat().st_size
                    fr["mask_mtime"] = mask_path.stat().st_mtime
                    break

        return {"success": True, "size": mask_path.stat().st_size, "fill": fill_value}

    def copy_mask(self, sequence: str, src_filename: str, dst_filename: str) -> Dict:
        """Copy mask from src frame to dst frame."""
        src_stem = Path(src_filename).stem
        dst_stem = Path(dst_filename).stem

        _, mask_seq_dir = self._resolve_seq_dirs(sequence)
        src_mask = mask_seq_dir / f"{src_stem}.png"
        if not src_mask.exists():
            return {"success": False, "error": f"Source mask does not exist: {src_stem}.png"}

        mask_seq_dir.mkdir(parents=True, exist_ok=True)
        dst_mask = mask_seq_dir / f"{dst_stem}.png"

        # Check dimensions
        dst_img = self.get_image_path(sequence, dst_filename)
        with Image.open(src_mask) as s_im:
            if dst_img:
                with Image.open(dst_img) as d_im:
                    target_size = d_im.size
                if s_im.size != target_size:
                    s_im = s_im.resize(target_size, Image.Resampling.NEAREST)
            s_im.save(dst_mask, format='PNG')

        if sequence in self._frame_cache:
            for fr in self._frame_cache[sequence]:
                if fr["stem"] == dst_stem:
                    fr["has_mask"] = True
                    fr["mask_filename"] = f"{dst_stem}.png"
                    fr["mask_size"] = dst_mask.stat().st_size
                    fr["mask_mtime"] = dst_mask.stat().st_mtime
                    break

        return {"success": True, "copied_from": src_filename, "copied_to": dst_filename}

    def propagate_mask(self, sequence: str, src_filename: str, count: int, direction: str = 'forward') -> Dict:
        """Propagate current mask to next or previous N frames."""
        frames = self.get_frames(sequence)
        stems = [f["stem"] for f in frames]
        src_stem = Path(src_filename).stem
        if src_stem not in stems:
            return {"success": False, "error": "Source frame not in sequence"}

        src_idx = stems.index(src_stem)
        copied_count = 0
        if direction == 'forward':
            targets = frames[src_idx + 1: src_idx + 1 + count]
        else:
            targets = frames[max(0, src_idx - count): src_idx]

        for target in targets:
            res = self.copy_mask(sequence, src_filename, target["filename"])
            if res.get("success"):
                copied_count += 1

        return {"success": True, "count": copied_count}

    def browse_directory(self, target_path: Optional[str] = None) -> Dict:
        """Browse directories on the server for the file chooser UI."""
        if not target_path or not str(target_path).strip():
            p = self.root_path
        else:
            p = Path(target_path)

        if not p.exists() or not p.is_dir():
            p = self.root_path if (self.root_path.exists() and self.root_path.is_dir()) else Path.cwd()

        try:
            p = p.resolve()
        except Exception:
            pass

        # Available quick roots
        roots = []
        if os.name == 'nt':
            import string
            for letter in string.ascii_uppercase:
                try:
                    drive = Path(f"{letter}:\\")
                    if drive.exists():
                        roots.append(str(drive))
                except Exception:
                    pass
        else:
            candidates = ["/nvr", "/nvr/splats", "/data", str(Path.home() / "nvr")]
            for r in candidates:
                try:
                    if Path(r).exists() and r not in roots:
                        roots.append(r)
                except Exception:
                    pass
            if "/" not in roots:
                roots.append("/")

        parent = str(p.parent) if p.parent != p else None

        items = []
        try:
            with os.scandir(p) as it:
                for entry in sorted(it, key=lambda e: natural_sort_key(e.name)):
                    try:
                        if not entry.is_dir():
                            continue
                        if entry.name.startswith('.') and entry.name not in {'.trash', '.backup_masks'}:
                            continue
                        
                        entry_path = Path(entry.path)
                        has_img = (entry_path / "images").exists() and (entry_path / "images").is_dir()
                        has_msk = (entry_path / "masks").exists() and (entry_path / "masks").is_dir()
                        is_dataset = has_img
                        items.append({
                            "name": entry.name,
                            "path": str(entry_path),
                            "has_images": has_img,
                            "has_masks": has_msk,
                            "is_dataset": is_dataset
                        })
                    except (PermissionError, OSError):
                        items.append({
                            "name": entry.name,
                            "path": str(Path(entry.path)),
                            "has_images": False,
                            "has_masks": False,
                            "is_dataset": False
                        })
        except (PermissionError, OSError):
            pass

        is_current_dataset = (p / "images").exists() and (p / "images").is_dir()

        return {
            "current_path": str(p),
            "parent_path": parent,
            "roots": roots,
            "is_current_dataset": is_current_dataset,
            "directories": items
        }
