#!/usr/bin/env python3
"""Embed every art-style image with one model; cache per-image vectors.

Usage:
  python3 embed_experiment.py <model_tag>

model_tag is a key in MODELS below. Writes data/imgvecs_<tag>.json:
  {file_id: [floats]}  -- L2-normalized per-image embedding, resumable.

Per-image caching lets the analysis step build BOTH the single-thumbnail style
vector and the multi-image-averaged style vector without re-embedding.

All models are free / open-weight, run locally (MPS on Apple Silicon, else CPU).
"""
import json
import sys
import time
from pathlib import Path

import numpy as np
import torch
from PIL import Image

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
IMG = HERE / "multi_image_data"

# tag -> (hf_name, kind).  kind picks the forward/pooling path.
MODELS = {
    "siglip2_base_224":   ("google/siglip2-base-patch16-224",  "siglip"),
    "siglip2_large_384":  ("google/siglip2-large-patch16-384", "siglip"),
    "siglip2_so400m_512": ("google/siglip2-so400m-patch16-512", "siglip"),
    "nomic_vision_15":    ("nomic-ai/nomic-embed-vision-v1.5",  "nomic"),
    "dinov2_large":       ("facebook/dinov2-large",             "dinov2"),
}


def device():
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


class _TiedKeysDefault:
    """Non-data descriptor: missing access returns a fresh per-instance empty dict;
    normal assignment shadows it in the instance __dict__."""
    def __get__(self, obj, objtype=None):
        if obj is None:
            return {}
        d = {}
        obj.__dict__["all_tied_weights_keys"] = d
        return d


def _patch_tied_weights_default():
    """nomic's remote NomicVisionModel.__init__ skips PreTrainedModel.__init__, so the
    `all_tied_weights_keys` dict transformers 5.3 relies on is never set. Install the
    descriptor default so a missing read doesn't AttributeError."""
    from transformers import PreTrainedModel
    if not isinstance(getattr(PreTrainedModel, "all_tied_weights_keys", None), _TiedKeysDefault):
        PreTrainedModel.all_tied_weights_keys = _TiedKeysDefault()


def _fix_nomic_rope(model):
    """nomic's vision rope caches sin/cos in a NON-persistent buffer computed in
    __init__. Under transformers 5.x meta-device init that buffer is never
    materialized (it isn't in the checkpoint) and holds uninitialized memory —
    sometimes NaN, sometimes finite garbage, differing per load — which poisons every
    attention layer. ALWAYS recompute it with the model's own function (do not gate on
    NaN: a finite-garbage read would slip through)."""
    import sys
    import torch as _t
    for sub in model.modules():
        if sub.__class__.__name__ != "NomicVisionRotaryEmbeddingCat":
            continue
        pe = getattr(sub, "pos_embed", None)
        if pe is None or getattr(sub, "feat_shape", None) is None:
            continue
        mod = sys.modules[sub.__class__.__module__]
        emb = mod.build_rotary_pos_embed(
            feat_shape=sub.feat_shape, dim=sub.dim, max_res=sub.max_res,
            in_pixels=sub.in_pixels, ref_feat_shape=sub.ref_feat_shape)
        sub.pos_embed = _t.cat(emb, -1).to(pe.device, pe.dtype).contiguous()


def load(kind, name, dev):
    from transformers import AutoImageProcessor, AutoModel, AutoProcessor
    if kind == "siglip":
        proc = AutoProcessor.from_pretrained(name)
        model = AutoModel.from_pretrained(name).eval().to(dev)
    elif kind == "nomic":
        _patch_tied_weights_default()
        proc = AutoImageProcessor.from_pretrained(name)
        model = AutoModel.from_pretrained(name, trust_remote_code=True).eval()
        _fix_nomic_rope(model)
        model = model.to(dev)
    elif kind == "dinov2":
        proc = AutoImageProcessor.from_pretrained(name)
        model = AutoModel.from_pretrained(name).eval().to(dev)
    else:
        raise ValueError(kind)
    return proc, model


def _to_tensor(out):
    """Coerce a model output (tensor or ModelOutput) to a feature tensor."""
    if isinstance(out, torch.Tensor):
        return out
    if getattr(out, "pooler_output", None) is not None:
        return out.pooler_output
    if getattr(out, "image_embeds", None) is not None:
        return out.image_embeds
    return out.last_hidden_state[:, 0]  # CLS token fallback


def embed_batch(kind, proc, model, dev, pil_imgs):
    inputs = proc(images=pil_imgs, return_tensors="pt").to(dev)
    with torch.no_grad():
        if kind == "siglip":
            feats = _to_tensor(model.get_image_features(**inputs))
        elif kind == "nomic":
            # official nomic-embed-vision embedding = CLS token of the token
            # sequence. In this HF build the token sequence is `hidden_states`;
            # `last_hidden_state` is a separate attention-pooling head whose
            # norm_factor buffer is left uninitialized (=0) → NaN, so bypass it.
            out = model(**inputs)
            feats = out.hidden_states[:, 0]
        else:  # dinov2: CLS token of last_hidden_state
            out = model(**inputs)
            feats = out.last_hidden_state[:, 0]
    feats = feats.float().cpu().numpy()
    norms = np.linalg.norm(feats, axis=1, keepdims=True)
    norms[norms == 0] = 1
    return feats / norms


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in MODELS:
        raise SystemExit(f"usage: embed_experiment.py <{'|'.join(MODELS)}>")
    tag = sys.argv[1]
    name, kind = MODELS[tag]
    dev = device()

    manifest = json.loads((DATA / "style_images.json").read_text())
    needed = []
    seen = set()
    for st in manifest.values():
        for fid in st["images"]:
            if fid not in seen:
                seen.add(fid)
                needed.append(fid)

    out_path = DATA / f"imgvecs_{tag}.json"
    done = {}
    if out_path.exists():
        done = json.loads(out_path.read_text())
    todo = [fid for fid in needed if fid not in done and (IMG / (fid + ".img")).exists()]
    missing_file = [fid for fid in needed if not (IMG / (fid + ".img")).exists()]
    print(f"[{tag}] {name} on {dev}: {len(needed)} images, {len(done)} cached, "
          f"{len(todo)} to embed, {len(missing_file)} missing files", flush=True)

    proc, model = load(kind, name, dev)
    t0 = time.time()
    bs = 8 if kind == "siglip" and "so400m" in tag else 16
    buf_ids, buf_imgs = [], []

    def flush():
        if not buf_ids:
            return
        vecs = embed_batch(kind, proc, model, dev, buf_imgs)
        for fid, v in zip(buf_ids, vecs):
            done[fid] = v.tolist()
        buf_ids.clear()
        buf_imgs.clear()

    n = 0
    for fid in todo:
        try:
            im = Image.open(IMG / (fid + ".img")).convert("RGB")
        except Exception as e:  # noqa: BLE001
            print(f"  open failed {fid}: {e}", file=sys.stderr)
            continue
        buf_ids.append(fid)
        buf_imgs.append(im)
        if len(buf_ids) >= bs:
            flush()
            n += bs
            if n % 96 == 0:
                out_path.write_text(json.dumps(done))
                dt = time.time() - t0
                print(f"  {n}/{len(todo)}  {dt:.0f}s  {dt/max(n,1):.2f}s/img", flush=True)
    flush()
    out_path.write_text(json.dumps(done))
    dim = len(next(iter(done.values()))) if done else 0
    print(f"[{tag}] DONE {len(done)} vectors, dim={dim}, {time.time()-t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
