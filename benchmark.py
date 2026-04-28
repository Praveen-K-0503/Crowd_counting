import argparse
import csv
import json
import os
import time
from itertools import product

import cv2
import numpy as np
import torch
import torchvision.transforms as standard_transforms
from PIL import Image
from scipy.spatial import cKDTree

from models import build_model


class Args:
    backbone = "vgg16_bn"
    row = 2
    line = 2


def load_model(weight_path):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device.type == "cuda":
        torch.backends.cudnn.benchmark = True
    model = build_model(Args()).to(device).eval()
    if os.path.exists(weight_path):
        checkpoint = torch.load(weight_path, map_location=device)
        model.load_state_dict(checkpoint["model"])
    transform = standard_transforms.Compose([
        standard_transforms.ToTensor(),
        standard_transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                      std=[0.229, 0.224, 0.225]),
    ])
    return model, device, transform


def merge_points(points, radius=8.0):
    if not points:
        return []
    pts = np.array(points, dtype=np.float32)
    tree = cKDTree(pts)
    suppressed = set()
    for i, j in tree.query_pairs(r=radius):
        if i not in suppressed and j not in suppressed:
            suppressed.add(j)
    return [pts[i].tolist() for i in range(len(pts)) if i not in suppressed]


def infer_frame(image, model, device, transform, confidence, magnification, batch_size, patch_overlap):
    orig_w, orig_h = image.size
    patch_size = 512
    pad = 256
    work_w, work_h = int(orig_w * magnification), int(orig_h * magnification)
    scale = min(1.0, 3840 / float(max(work_w, work_h)))
    work_w, work_h = int(work_w * scale), int(work_h * scale)
    magnification = work_w / float(orig_w)
    resample_filter = getattr(Image, "Resampling", Image).LANCZOS if hasattr(Image, "Resampling") else getattr(Image, "ANTIALIAS", 1)
    image = image.resize((work_w, work_h), resample_filter)
    padded_w = ((work_w + pad * 2 + patch_size - 1) // patch_size) * patch_size
    padded_h = ((work_h + pad * 2 + patch_size - 1) // patch_size) * patch_size
    padded = Image.new("RGB", (padded_w, padded_h), (0, 0, 0))
    padded.paste(image, (pad, pad))
    stride = max(64, int(patch_size * (1.0 - patch_overlap)))
    jobs = []
    for y in range(0, padded_h - stride + 1, stride):
        for x in range(0, padded_w - stride + 1, stride):
            if x + patch_size <= padded_w and y + patch_size <= padded_h:
                jobs.append((x, y, padded.crop((x, y, x + patch_size, y + patch_size))))

    all_points = []
    for start in range(0, len(jobs), batch_size):
        batch = jobs[start:start + batch_size]
        samples = torch.stack([transform(patch) for _, _, patch in batch]).to(device)
        with torch.inference_mode():
            if device.type == "cuda":
                with torch.cuda.amp.autocast():
                    out = model(samples)
            else:
                out = model(samples)
        scores = torch.nn.functional.softmax(out["pred_logits"].float(), -1)[:, :, 1]
        points = out["pred_points"].float()
        for idx, (x, y, _) in enumerate(batch):
            selected = points[idx][scores[idx] > confidence].detach().cpu().numpy()
            if len(selected):
                selected[:, 0] += x - pad
                selected[:, 1] += y - pad
                selected /= float(magnification)
                all_points.extend([
                    p.tolist() for p in selected
                    if 0 <= p[0] < orig_w and 0 <= p[1] < orig_h
                ])
    return merge_points(all_points)


def run_config(video, model, device, transform, cfg, max_frames):
    cap = cv2.VideoCapture(video)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frames_read = 0
    frames_analyzed = 0
    counts = []
    start = time.perf_counter()
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret or (max_frames and frames_read >= max_frames):
            break
        if frames_read % cfg["frame_skip"] == 0:
            image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            points = infer_frame(image, model, device, transform, cfg["confidence"], cfg["magnification"], cfg["batch_size"], cfg["patch_overlap"])
            counts.append(len(points))
            frames_analyzed += 1
        frames_read += 1
    cap.release()
    elapsed = time.perf_counter() - start
    return {
        **cfg,
        "video_frames": total_frames,
        "frames_read": frames_read,
        "frames_analyzed": frames_analyzed,
        "elapsed_sec": round(elapsed, 4),
        "effective_fps": round(frames_read / elapsed, 4) if elapsed else 0,
        "analysis_fps": round(frames_analyzed / elapsed, 4) if elapsed else 0,
        "avg_count": round(float(np.mean(counts)), 4) if counts else 0,
        "max_count": int(max(counts)) if counts else 0,
        "std_count": round(float(np.std(counts)), 4) if counts else 0,
    }


def recommendations(rows):
    return {
        "fast": max(rows, key=lambda row: row["effective_fps"]),
        "balanced": min(rows, key=lambda row: (row["std_count"], -row["effective_fps"])),
        "accurate": max(rows, key=lambda row: (row["patch_overlap"], row["magnification"], -row["frame_skip"])),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--weights", default=os.path.join("weights", "SHTechA.pth"))
    parser.add_argument("--output_dir", default="benchmark_results")
    parser.add_argument("--max_frames", type=int, default=120)
    args = parser.parse_args()
    os.makedirs(args.output_dir, exist_ok=True)
    model, device, transform = load_model(args.weights)
    configs = []
    for frame_skip, mag, batch, conf in product([1, 2, 5], [1.0, 1.5, 2.0], [4, 8, 16], [0.45, 0.5, 0.55]):
        configs.append({
            "frame_skip": frame_skip,
            "magnification": mag,
            "batch_size": batch,
            "confidence": conf,
            "patch_overlap": 0.5 if frame_skip == 1 else 0.25 if frame_skip == 2 else 0.0,
        })
    rows = [run_config(args.video, model, device, transform, cfg, args.max_frames) for cfg in configs]
    recs = recommendations(rows)
    csv_path = os.path.join(args.output_dir, "benchmark_results.csv")
    json_path = os.path.join(args.output_dir, "benchmark_results.json")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"results": rows, "recommendations": recs}, f, indent=2)
    print(json.dumps({"csv": csv_path, "json": json_path, "recommendations": recs}, indent=2))


if __name__ == "__main__":
    main()
