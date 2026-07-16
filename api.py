import os
os.environ.setdefault('OMP_NUM_THREADS', '5')  # Suppress sklearn KMeans MKL memory leak warning on Windows
from download_weights import ensure_weights
import io
import time
import shutil
import base64
import json
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import torch
import torchvision.transforms as standard_transforms
import numpy as np
from PIL import Image
import cv2
from sklearn.cluster import KMeans
from sqlmodel import Session

from models import build_model
from tracker import Tracker
from database import init_db, engine, FlightReport

# ── APGCC (ECCV 2024) optional upgrade model ─────────────────────────────────
try:
    from apgcc_infer import load_apgcc_model, run_apgcc
    _APGCC_AVAILABLE = True
except Exception as _e:
    _APGCC_AVAILABLE = False
    print(f"[APGCC] Not available: {_e}")

import boto3
try:
    cloudwatch = boto3.client('cloudwatch')
except Exception:
    cloudwatch = None

async def push_cloudwatch_metric(count, anomalies):
    if not cloudwatch: return
    try:
        def _push():
            cloudwatch.put_metric_data(
                Namespace='CivicPulse/CrowdMonitoring',
                MetricData=[
                    {'MetricName': 'CrowdSize', 'Value': count, 'Unit': 'Count'},
                    {'MetricName': 'AnomaliesDetected', 'Value': anomalies, 'Unit': 'Count'}
                ]
            )
        await asyncio.to_thread(_push)
    except Exception as e:
        # Suppress credential warnings in local dev environments to keep console output clean
        if "InvalidClientTokenId" not in str(e) and "ExpiredToken" not in str(e) and "AccessDenied" not in str(e):
            print(f"CloudWatch push failed: {e}")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp_uploads")
os.makedirs(TEMP_DIR, exist_ok=True)

class Args:
    def __init__(self):
        self.backbone = 'vgg16_bn'
        self.row = 2
        self.line = 2

model = None
apgcc_model = None   # Lazy-loaded on first APGCC request
device = None
transform = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern FastAPI lifespan handler (replaces deprecated @app.on_event)."""
    # ── Startup ──────────────────────────────────────────────────────────────
    ensure_weights()
    init_db()

    global model, device, transform
    device_type = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    if device_type.type == 'cuda':
        torch.backends.cudnn.benchmark = True

    args = Args()
    model_obj = build_model(args)
    model_obj.to(device_type)
    if device_type.type == 'cuda':
        model_obj.to(memory_format=torch.channels_last)

    weight_path = os.path.join(BASE_DIR, 'weights', 'SHTechA.pth')
    if os.path.exists(weight_path):
        checkpoint = torch.load(weight_path, map_location=device_type)
        model_obj.load_state_dict(checkpoint['model'])

    model_obj.eval()

    transform_obj = standard_transforms.Compose([
        standard_transforms.ToTensor(),
        standard_transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    model = model_obj
    device = device_type
    transform = transform_obj

    # 1B: Pre-warm model — eliminates slow first-request JIT compilation
    try:
        _dummy = torch.zeros(1, 3, 128, 128, device=device_type)
        if device_type.type == 'cuda':
            _dummy = _dummy.contiguous(memory_format=torch.channels_last)
        with torch.inference_mode():
            model(_dummy)
        print("[Startup] Model pre-warmed successfully.")
    except Exception as _pw_err:
        print(f"[Startup] Pre-warm skipped: {_pw_err}")

    yield   # ← application runs here

    # ── Shutdown ─────────────────────────────────────────────────────────────
    print("[Shutdown] Cleaning up resources.")


app = FastAPI(lifespan=lifespan)

# Allow both local dev and the deployed Vercel frontend.
# The ALLOWED_ORIGINS env var can be set on HF Spaces to your exact Vercel URL.
_raw_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,http://localhost:3000,http://127.0.0.1:3000,https://praveendatascience-crowd-detection.hf.space"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",   # matches any Vercel deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
async def health_check():
    """Health check — HuggingFace Spaces pings this to confirm the app is alive."""
    return {"status": "ok", "model_loaded": model is not None}

def score_aware_merge(predictions, radius, orig_width, orig_height):
    if not predictions: return []
    predictions = sorted(predictions, key=lambda item: item[2], reverse=True)
    final_points = []
    radius_sq = radius * radius
    for x, y, _ in predictions:
        if not (0 <= x < orig_width and 0 <= y < orig_height): continue
        duplicate = False
        for fx, fy in final_points:
            if (x - fx) ** 2 + (y - fy) ** 2 <= radius_sq:
                duplicate = True
                break
        if not duplicate:
            final_points.append([float(x), float(y)])
    return final_points

def round_to_stride(value, stride=128):
    return max(stride, int(np.ceil(value / stride) * stride))

def apply_clahe(img_pil: Image.Image) -> Image.Image:
    """Adaptive contrast enhancement for dark/shadow crowd images.
    Applies CLAHE in LAB colour space — only on L channel to avoid colour shift.
    Auto-triggered when mean image brightness < 100 (out of 255).
    """
    img_np = np.array(img_pil)
    mean_brightness = img_np.mean()
    if mean_brightness >= 100:          # already bright enough — skip
        return img_pil
    lab = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    l_ch = clahe.apply(l_ch)
    lab_enhanced = cv2.merge([l_ch, a_ch, b_ch])
    img_enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2RGB)
    return Image.fromarray(img_enhanced)

def process_frame(img_raw, model, device, transform, threshold, max_dim=3840, magnification=1.5, patch_size=512, nms_radius=4.0, batch_size=8, patch_overlap=0.25, inference_strategy="Auto", full_frame_max_dim=1920, fencing_poly=None, model_type="P2PNet"):
    orig_width, orig_height = img_raw.size

    # ── Auto CLAHE: boost contrast on dark/shadowed images before inference ──
    img_raw = apply_clahe(img_raw)

    # ── Auto NMS: tighten radius for ultra-dense scenes (aerial/top-down) ────
    # Heuristic: if image has high crowd density (very few pixels per head expected),
    # reduce NMS radius automatically so nearby heads are not merged together.
    # Triggered when nms_radius is at default (>=3.5) — user-set values are respected.
    if nms_radius >= 3.5:
        img_arr = np.array(img_raw)
        mean_brightness = img_arr.mean()
        # Aerial top-down images tend to be bright (sky/ground visible) but uniform in texture
        # Simple proxy: dark images get CLAHE but are street-level; bright uniform images are aerial
        gray = cv2.cvtColor(img_arr, cv2.COLOR_RGB2GRAY)
        local_std = gray.std()   # low std = flat texture = likely aerial
        if local_std < 45:
            nms_radius = max(2.0, nms_radius / 2.0)

    # ── APGCC fast-path: delegate entirely to the APGCC bridge ───────────────
    if model_type == "APGCC" and _APGCC_AVAILABLE:
        global apgcc_model
        if apgcc_model is None:
            apgcc_model = load_apgcc_model(device)
        raw_pts = run_apgcc(img_raw, threshold=threshold, device=device, model=apgcc_model)
        # raw_pts → [[x, y, score], ...]
        final_points = score_aware_merge(raw_pts, nms_radius, orig_width, orig_height)
        if fencing_poly and len(fencing_poly) > 2:
            poly_arr = np.array([[p['x']*orig_width, p['y']*orig_height] for p in fencing_poly], dtype=np.int32)
            final_points = [pt for pt in final_points if cv2.pointPolygonTest(poly_arr, (pt[0], pt[1]), False) >= 0]
        return img_raw, len(final_points), final_points

    if inference_strategy == "TTA":
        # Test-Time Augmentation: run inference on 3 views, flip coordinates back, merge
        # Pass 1: Original
        _, _, pts_orig = process_frame(
            img_raw, model, device, transform, threshold, max_dim, magnification,
            patch_size, nms_radius, batch_size, patch_overlap, "Auto", full_frame_max_dim, None
        )
        # Pass 2: Horizontal flip (left-right mirror)
        img_hflip = img_raw.transpose(Image.FLIP_LEFT_RIGHT)
        _, _, pts_hflip = process_frame(
            img_hflip, model, device, transform, threshold, max_dim, magnification,
            patch_size, nms_radius, batch_size, patch_overlap, "Auto", full_frame_max_dim, None
        )
        # Pass 3: Vertical flip (top-bottom mirror)
        img_vflip = img_raw.transpose(Image.FLIP_TOP_BOTTOM)
        _, _, pts_vflip = process_frame(
            img_vflip, model, device, transform, threshold, max_dim, magnification,
            patch_size, nms_radius, batch_size, patch_overlap, "Auto", full_frame_max_dim, None
        )
        # Mirror coordinates back to original space
        all_pts = []
        for p in pts_orig:
            all_pts.append([p[0], p[1], 1.0])
        for p in pts_hflip:
            all_pts.append([orig_width - p[0], p[1], 1.0])
        for p in pts_vflip:
            all_pts.append([p[0], orig_height - p[1], 1.0])

        final_points = score_aware_merge(all_pts, nms_radius, orig_width, orig_height)

        if fencing_poly and len(fencing_poly) > 2:
            poly_arr = np.array([[p['x']*orig_width, p['y']*orig_height] for p in fencing_poly], dtype=np.int32)
            final_points = [pt for pt in final_points if cv2.pointPolygonTest(poly_arr, (pt[0], pt[1]), False) >= 0]

        return img_raw, len(final_points), final_points

    if inference_strategy == "Multi-Scale":
        # Run at 1.0x (original scale) and custom magnification scale, then merge
        _, _, pts_1x = process_frame(
            img_raw, model, device, transform, threshold, max_dim, 1.0,
            patch_size, nms_radius, batch_size, patch_overlap, "Auto", full_frame_max_dim, None
        )
        _, _, pts_mag = process_frame(
            img_raw, model, device, transform, threshold, max_dim, magnification,
            patch_size, nms_radius, batch_size, patch_overlap, "Auto", full_frame_max_dim, None
        )
        
        all_pts = []
        for p in pts_1x:
            all_pts.append([p[0], p[1], 1.0])
        for p in pts_mag:
            all_pts.append([p[0], p[1], 1.0])
            
        final_points = score_aware_merge(all_pts, nms_radius, orig_width, orig_height)
        
        # Smart Zone Fencing filter
        if fencing_poly and len(fencing_poly) > 2:
            poly_arr = np.array([[p['x']*orig_width, p['y']*orig_height] for p in fencing_poly], dtype=np.int32)
            filtered_pts = []
            for pt in final_points:
                if cv2.pointPolygonTest(poly_arr, (pt[0], pt[1]), False) >= 0:
                    filtered_pts.append(pt)
            final_points = filtered_pts
            
        return img_raw, len(final_points), final_points

    # 1. Scale the image to magnified dimensions to resolve scale mismatch
    work_width = int(orig_width * magnification)
    work_height = int(orig_height * magnification)
    
    # Cap dimensions to prevent out-of-memory
    if max_dim is not None and (work_width > max_dim or work_height > max_dim):
        scale = max_dim / float(max(work_width, work_height))
        work_width = int(work_width * scale)
        work_height = int(work_height * scale)
        
    # Recalculate effective scale factor
    effective_scale = work_width / float(orig_width)
    
    resample_filter = getattr(Image, 'Resampling', Image).LANCZOS if hasattr(Image, 'Resampling') else getattr(Image, 'ANTIALIAS', 1)
    img_magnified = img_raw.resize((work_width, work_height), resample_filter)
    
    # Choose strategy: Single Pass with padding for normal images, Tiled for large images
    use_single_pass = inference_strategy == "Single Pass" or (
        inference_strategy == "Auto" and max(work_width, work_height) <= full_frame_max_dim
    )
    
    if use_single_pass:
        # Add 64px symmetric edge margin using reflection to prevent corner boundary accuracy loss
        margin = 64
        work_w_padded = work_width + margin * 2
        work_h_padded = work_height + margin * 2
        
        model_width = ((work_w_padded + 127) // 128) * 128
        model_height = ((work_h_padded + 127) // 128) * 128
        
        img_np = np.array(img_magnified)
        pad_top = margin
        pad_left = margin
        pad_bottom = model_height - work_height - margin
        pad_right = model_width - work_width - margin
        
        img_padded_np = cv2.copyMakeBorder(img_np, pad_top, pad_bottom, pad_left, pad_right, cv2.BORDER_REFLECT_101)
        img_padded = Image.fromarray(img_padded_np)
        
        samples = transform(img_padded).unsqueeze(0).to(device, non_blocking=True)
        if device.type == 'cuda':
            samples = samples.contiguous(memory_format=torch.channels_last)
            
        with torch.inference_mode():
            if device.type == 'cuda':
                with torch.amp.autocast('cuda'):
                    outputs = model(samples)
            else:
                outputs = model(samples)
                
        scores = torch.nn.functional.softmax(outputs['pred_logits'].float(), -1)[:, :, 1][0]
        points = outputs['pred_points'][0].float()
        
        mask = scores > threshold
        selected_points = points[mask].detach().cpu().numpy()
        selected_scores = scores[mask].detach().cpu().numpy()
        
        # Filter points within magnified image boundaries, then map back to original coordinates
        all_predictions = []
        for pt, score in zip(selected_points, selected_scores):
            x_mag = pt[0] - pad_left
            y_mag = pt[1] - pad_top
            if 0 <= x_mag < work_width and 0 <= y_mag < work_height:
                x_orig = x_mag / effective_scale
                y_orig = y_mag / effective_scale
                all_predictions.append([x_orig, y_orig, float(score)])
                
        final_points = score_aware_merge(all_predictions, nms_radius, orig_width, orig_height)
                
    else:
        # Tiled (Patch-based) processing with border reflection padding to protect boundaries
        pad_border = 128
        img_np = np.array(img_magnified)
        
        inner_width = work_width + pad_border * 2
        inner_height = work_height + pad_border * 2
        
        padded_width = ((inner_width + patch_size - 1) // patch_size) * patch_size
        padded_height = ((inner_height + patch_size - 1) // patch_size) * patch_size
        
        pad_top = pad_border
        pad_bottom = padded_height - work_height - pad_border
        pad_left = pad_border
        pad_right = padded_width - work_width - pad_border
        
        img_padded_np = cv2.copyMakeBorder(img_np, pad_top, pad_bottom, pad_left, pad_right, cv2.BORDER_REFLECT_101)
        img_padded = Image.fromarray(img_padded_np)
        
        all_predictions = []
        stride = max(64, int(patch_size * (1.0 - patch_overlap)))
        patch_jobs = []
        
        for y in range(0, padded_height - stride + 1, stride):
            for x in range(0, padded_width - stride + 1, stride):
                if y + patch_size > padded_height or x + patch_size > padded_width: continue
                patch = img_padded.crop((x, y, x + patch_size, y + patch_size))
                patch_jobs.append((x, y, patch))
                
        total_patches = len(patch_jobs)
        batch_size = max(1, int(batch_size))
        
        for start_idx in range(0, total_patches, batch_size):
            batch_jobs = patch_jobs[start_idx:start_idx + batch_size]
            patch_tensors = [transform(patch) for _, _, patch in batch_jobs]
            samples = torch.stack(patch_tensors, dim=0).to(device, non_blocking=True)
            if device.type == 'cuda':
                samples = samples.contiguous(memory_format=torch.channels_last)
                
            with torch.inference_mode():
                if device.type == 'cuda':
                    with torch.amp.autocast('cuda'):
                        outputs = model(samples)
                else:
                    outputs = model(samples)
                    
            outputs_scores = torch.nn.functional.softmax(outputs['pred_logits'].float(), -1)[:, :, 1]
            outputs_points = outputs['pred_points'].float()
            
            for batch_idx, (x, y, _) in enumerate(batch_jobs):
                mask = outputs_scores[batch_idx] > threshold
                points = outputs_points[batch_idx][mask].detach().cpu().numpy()
                scores = outputs_scores[batch_idx][mask].detach().cpu().numpy()
                
                if len(points) > 0:
                    points[:, 0] += (x - pad_border)
                    points[:, 1] += (y - pad_border)
                    for point, score in zip(points, scores):
                        # Only keep if within magnified image bounds
                        if 0 <= point[0] < work_width and 0 <= point[1] < work_height:
                            x_orig = point[0] / effective_scale
                            y_orig = point[1] / effective_scale
                            all_predictions.append([x_orig, y_orig, float(score)])
                        
        # Merge duplicates across overlapping patches
        final_points = score_aware_merge(all_predictions, nms_radius, orig_width, orig_height)
        
    # Smart Zone Fencing filter
    if fencing_poly and len(fencing_poly) > 2:
        poly_arr = np.array([[p['x']*orig_width, p['y']*orig_height] for p in fencing_poly], dtype=np.int32)
        filtered_pts = []
        for pt in final_points:
            if cv2.pointPolygonTest(poly_arr, (pt[0], pt[1]), False) >= 0:
                filtered_pts.append(pt)
        final_points = filtered_pts
        
    return img_raw, len(final_points), final_points

def process_frame_with_oom_recovery(*args, batch_size=8, **kwargs):
    current_batch_size = max(1, int(batch_size))
    while current_batch_size >= 1:
        try:
            return process_frame(*args, batch_size=current_batch_size, **kwargs), current_batch_size
        except RuntimeError as exc:
            if "out of memory" not in str(exc).lower(): raise
            if torch.cuda.is_available(): torch.cuda.empty_cache()
            if current_batch_size == 1: raise
            current_batch_size = max(1, current_batch_size // 2)

def generate_colors(n):
    colors = []
    base_hues = [30, 90, 150, 210, 270, 330]
    for i in range(n):
        h = base_hues[i % len(base_hues)]
        hsv = np.uint8([[[h, 255, 255]]])
        bgr = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)[0][0]
        colors.append((int(bgr[0]), int(bgr[1]), int(bgr[2])))
    return colors

def draw_points(img, points, use_heatmap=False, use_clustering=False, use_motion_vectors=False, prev_points=None):
    img_bgr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    
    if use_heatmap:
        h, w = img_bgr.shape[:2]
        heatmap = np.zeros((h, w), dtype=np.float32)
        for p in points:
            px, py = int(p[0]), int(p[1])
            if 0 <= px < w and 0 <= py < h:
                r = 15
                x_min, x_max = max(0, px-r), min(w, px+r+1)
                y_min, y_max = max(0, py-r), min(h, py+r+1)
                y, x = np.ogrid[y_min:y_max, x_min:x_max]
                mask = np.exp(-((x - px)**2 + (y - py)**2) / (2 * 5**2))
                heatmap[y_min:y_max, x_min:x_max] += mask
        heatmap = np.clip(heatmap * 100, 0, 255).astype(np.uint8)
        color_map = cv2.applyColorMap(heatmap, cv2.COLORMAP_INFERNO)
        mask = (heatmap > 10).astype(np.float32)[:, :, np.newaxis]
        img_bgr = (img_bgr * (1 - mask * 0.7) + color_map * (mask * 0.7)).astype(np.uint8)
        
    elif use_clustering and len(points) >= 3:
        num_clusters = min(len(points) // 10 + 1, 5)
        # Guard: KMeans requires n_clusters <= n_samples
        num_clusters = max(1, min(num_clusters, len(points)))
        if num_clusters > 1:
            pts_array = np.array([[p[0], p[1]] for p in points])
            try:
                kmeans = KMeans(n_clusters=num_clusters, n_init='auto', random_state=42).fit(pts_array)
                labels = kmeans.labels_
                colors = generate_colors(num_clusters)
                for i, p in enumerate(points):
                    cv2.circle(img_bgr, (int(p[0]), int(p[1])), 2, colors[labels[i]], -1)
                for c in range(num_clusters):
                    cluster_pts = pts_array[labels == c].astype(np.int32)
                    if len(cluster_pts) >= 3:
                        hull = cv2.convexHull(cluster_pts)
                        cv2.polylines(img_bgr, [hull], True, colors[c], 2)
            except Exception:
                # Fallback to plain dots if clustering fails for any reason
                for p in points: cv2.circle(img_bgr, (int(p[0]), int(p[1])), 2, (0, 0, 255), -1)
        else:
            for p in points:
                cv2.circle(img_bgr, (int(p[0]), int(p[1])), 2, (0, 0, 255), -1)
    else:
        for p in points:
            cv2.circle(img_bgr, (int(p[0]), int(p[1])), 2, (0, 0, 255), -1)

    # GAP 5: Motion Vectors — draw arrows from prev positions to current
    if use_motion_vectors and prev_points and len(prev_points) > 0 and len(points) > 0:
        cur_arr  = np.array([[p[0], p[1]] for p in points],      dtype=np.float32)
        prev_arr = np.array([[p[0], p[1]] for p in prev_points], dtype=np.float32)
        # Match nearest neighbours between prev and current
        for pp in prev_arr:
            dists = np.sum((cur_arr - pp) ** 2, axis=1)
            nearest_idx = int(np.argmin(dists))
            if dists[nearest_idx] < 2500:  # max 50px movement
                cp = cur_arr[nearest_idx]
                dx, dy = float(cp[0] - pp[0]), float(cp[1] - pp[1])
                if abs(dx) > 1 or abs(dy) > 1:  # only draw if actually moved
                    speed = (dx**2 + dy**2) ** 0.5
                    # Color from green (slow) to amber (fast)
                    t = min(speed / 30.0, 1.0)
                    color = (
                        int(11 * (1 - t) + 11 * t),
                        int(230 * (1 - t) + 158 * t),
                        int(184 * (1 - t) + 245 * t)
                    )
                    cv2.arrowedLine(
                        img_bgr,
                        (int(pp[0]), int(pp[1])),
                        (int(cp[0]), int(cp[1])),
                        color, 1, tipLength=0.3
                    )
            
    return img_bgr

@app.post("/api/upload-video")
async def upload_video(file: UploadFile = File(...)):
    # Sanitize filename to remove spaces/special chars that break WebSocket URLs
    safe_name = "".join(c if c.isalnum() or c in '._-' else '_' for c in (file.filename or 'video'))
    file_id = f"vid_{int(time.time())}_{safe_name}"
    file_path = os.path.join(TEMP_DIR, file_id)
    # Stream-write in chunks to avoid loading entire video into RAM
    try:
        with open(file_path, "wb") as out_f:
            while True:
                chunk = await file.read(1024 * 1024)  # 1 MB chunks
                if not chunk:
                    break
                out_f.write(chunk)
    except Exception as exc:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Video upload failed: {exc}")
    return {"file_id": file_id, "size": os.path.getsize(file_path)}

@app.websocket("/api/stream-video/{file_id}")
async def stream_video(websocket: WebSocket, file_id: str):
    await websocket.accept()
    file_path = os.path.join(TEMP_DIR, file_id)

    if not os.path.exists(file_path):
        await websocket.send_json({"status": "error", "message": "Video file not found on server. Please upload again."})
        await websocket.close()
        return

    # Guard: model must be loaded
    if model is None:
        await websocket.send_json({"status": "error", "message": "AI model not loaded yet. Please wait and retry."})
        await websocket.close()
        return

    cap = None
    try:
        data = await websocket.receive_json()
        settings_payload = data.get("settings", {})

        confidence_threshold = float(settings_payload.get("confidenceThresh", 0.25))
        magnification        = float(settings_payload.get("magnification", 1.5))
        nms_radius           = float(settings_payload.get("nmsRadius", 4.0))
        use_heatmap          = bool(settings_payload.get("useHeatmap", False))
        use_clustering       = bool(settings_payload.get("useClustering", False))
        use_motion_vecs      = bool(settings_payload.get("useMotionVecs", False))
        fencing_poly         = settings_payload.get("fencingPolygon", [])
        frame_skip           = max(1, int(settings_payload.get("frameSkip", 3)))
        patch_overlap        = 0.25
        capacity_limit       = int(settings_payload.get("capacityLimit", 150))
        inference_strategy   = settings_payload.get("inferenceStrategy", "Auto")
        model_type           = settings_payload.get("modelType", "P2PNet")

        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            await websocket.send_json({"status": "error", "message": f"Cannot open video file. Format may not be supported by OpenCV."})
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        tracker = Tracker(max_distance=50.0, max_age=5)

        frames_processed  = 0
        total_unique      = 0
        peak_crowd        = 0
        total_anomalies   = 0
        capacity_breached = False
        prev_raw_points   = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frames_processed % frame_skip == 0:
                try:
                    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(img_rgb)

                    (_, count, raw_points), _ = process_frame_with_oom_recovery(
                        pil_img, model, device, transform, confidence_threshold,
                        max_dim=1920, magnification=magnification, nms_radius=nms_radius,
                        batch_size=4, patch_overlap=patch_overlap, inference_strategy=inference_strategy,
                        fencing_poly=fencing_poly, model_type=model_type
                    )

                    if count > peak_crowd:      peak_crowd = count
                    if count >= capacity_limit: capacity_breached = True

                    img_bgr = draw_points(pil_img, raw_points, use_heatmap, use_clustering,
                                          use_motion_vecs, prev_raw_points)
                    prev_raw_points = raw_points[:]

                    active_tracks, cumulative_unique, anomaly = tracker.update(img_bgr, raw_points, fps=fps, frame_skip=frame_skip)
                    total_unique = cumulative_unique
                    if anomaly:
                        total_anomalies += 1

                    # Trigger CloudWatch alarm telemetry asynchronously
                    asyncio.create_task(push_cloudwatch_metric(count, total_anomalies))

                    # Normalized speed threshold check (35 pixels/frame limit converted to pixels/second)
                    speed_limit_px_s = 35.0 / (frame_skip / fps)
                    for t in active_tracks:
                        color = (11, 158, 245) if (anomaly and hasattr(t, 'velocity') and t.velocity > speed_limit_px_s) else (0, 230, 184)
                        cv2.circle(img_bgr, (int(t.pt[0]), int(t.pt[1])), 5, (0, 0, 0), -1)
                        cv2.circle(img_bgr, (int(t.pt[0]), int(t.pt[1])), 4, color, -1)

                    _, buffer   = cv2.imencode('.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    encoded_img = base64.b64encode(buffer).decode('utf-8')

                    progress = round(frames_processed / total_video_frames * 100)
                    await websocket.send_json({
                        "status":       "playing",
                        "frame":        frames_processed,
                        "count":        count,
                        "total_unique": total_unique,
                        "anomalyEvent": anomaly,
                        "progress":     progress,
                        "imageB64":     encoded_img
                    })

                except Exception as frame_err:
                    print(f"[Frame {frames_processed} error]: {frame_err}")
                    # If the WebSocket connection is closed, break from the loop immediately to stop wasting CPU
                    if "close message has been sent" in str(frame_err).lower() or "connection is closed" in str(frame_err).lower():
                        break
                    # Skip this frame and continue rather than crashing the whole stream

            frames_processed += 1
            await asyncio.sleep(0.001)

        # Release BEFORE any file operations so Windows unlocks it
        cap.release()
        cap = None

        # Log to DB
        try:
            with Session(engine) as db_session:
                record = FlightReport(
                    filename=file_id,
                    max_capacity_breached=capacity_breached,
                    peak_crowd_count=peak_crowd,
                    duration_frames=frames_processed,
                    chaos_anomalies=total_anomalies
                )
                db_session.add(record)
                db_session.commit()
        except Exception as db_err:
            print(f"[DB error]: {db_err}")

        await websocket.send_json({"status": "done", "total_unique": total_unique})

    except WebSocketDisconnect:
        print("[WebSocket] client disconnected")
    except Exception as e:
        print(f"[Stream error]: {e}")
        try:
            await websocket.send_json({"status": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        # Make sure cap is released before file deletion
        if cap is not None:
            cap.release()
        # Retry deletion — Windows may keep handle briefly after cap.release()
        for _attempt in range(5):
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                break
            except PermissionError:
                import time as _t
                _t.sleep(0.3)


@app.post("/api/process-image")
async def process_image_api(
    file: UploadFile = File(...),
    confidence_threshold: float = Form(0.25),
    magnification: float = Form(1.5),
    nms_radius: float = Form(4.0),
    use_heatmap: str = Form("false"),
    use_clustering: str = Form("false"),
    use_motion_vectors: str = Form("false"),
    fencing_polygon: str = Form("[]"),
    inference_batch_size: int = Form(8),
    patch_overlap: float = Form(0.25),
    max_resolution: int = Form(3840),
    inference_strategy: str = Form("Auto"),
    model_type: str = Form("P2PNet")
):
    try:
        fencing_poly = json.loads(fencing_polygon) if fencing_polygon else []
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        start_time = time.perf_counter()
        
        (processed_img, count, points), used_batch_size = process_frame_with_oom_recovery(
            image, model, device, transform, confidence_threshold,
            max_dim=max_resolution, magnification=magnification,
            nms_radius=nms_radius, batch_size=inference_batch_size,
            patch_overlap=patch_overlap, inference_strategy=inference_strategy,
            fencing_poly=fencing_poly, model_type=model_type
        )
        
        # Trigger CloudWatch telemetry for static images as well
        asyncio.create_task(push_cloudwatch_metric(count, 0))
        
        elapsed = time.perf_counter() - start_time
        img_bgr = draw_points(
            image, points,
            use_heatmap.lower() == 'true',
            use_clustering.lower() == 'true',
            use_motion_vectors.lower() == 'true',
            None  # no prev_points for single image
        )
            
        _, buffer = cv2.imencode('.jpg', img_bgr)
        encoded_img = base64.b64encode(buffer).decode('utf-8')
        
        # Save to database
        try:
            with Session(engine) as session:
                report = FlightReport(
                    filename=file.filename,
                    max_capacity_breached=False, # We don't have capacity from frontend here natively, but let's record the scan
                    peak_crowd_count=count,
                    duration_frames=1,
                    chaos_anomalies=0
                )
                session.add(report)
                session.commit()
        except Exception as e:
            print(f"Failed to save to db: {e}")
            pass
        
        return {
            "count": count, "elapsed": elapsed,
            "usedBatchSize": used_batch_size, "imageB64": encoded_img
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=False)
