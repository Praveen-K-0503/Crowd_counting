import argparse
import csv
import json
import os

import cv2
import numpy as np
import torch
import torchvision.transforms as standard_transforms
from PIL import Image
from scipy.optimize import linear_sum_assignment
from scipy.spatial import cKDTree

from models import build_model


class Args:
    backbone = "vgg16_bn"
    row = 2
    line = 2


def load_model(weight_path):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
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


def infer_points(image, model, device, transform, confidence=0.5, magnification=1.5, batch_size=8):
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
    stride = patch_size // 2
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
        pred = out["pred_points"].float()
        for idx, (x, y, _) in enumerate(batch):
            pts = pred[idx][scores[idx] > confidence].detach().cpu().numpy()
            if len(pts):
                pts[:, 0] += x - pad
                pts[:, 1] += y - pad
                pts /= float(magnification)
                all_points.extend([p.tolist() for p in pts if 0 <= p[0] < orig_w and 0 <= p[1] < orig_h])
    if not all_points:
        return []
    pts = np.array(all_points, dtype=np.float32)
    tree = cKDTree(pts)
    suppressed = set()
    for i, j in tree.query_pairs(r=8.0):
        if i not in suppressed and j not in suppressed:
            suppressed.add(j)
    return [pts[i].tolist() for i in range(len(pts)) if i not in suppressed]


def load_gt(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and "annotations" in data:
        data = data["annotations"]
    if isinstance(data, dict):
        return [{"image": image, "points": points} for image, points in data.items()]
    return data


def precision_recall(pred_points, gt_points, radius):
    pred = np.array(pred_points, dtype=np.float32)
    gt = np.array(gt_points, dtype=np.float32)
    if len(pred) == 0 and len(gt) == 0:
        return 1.0, 1.0, 0, 0, 0
    if len(pred) == 0:
        return 0.0, 0.0, 0, 0, len(gt)
    if len(gt) == 0:
        return 0.0, 0.0, 0, len(pred), 0
    dist = np.linalg.norm(pred[:, None, :] - gt[None, :, :], axis=2)
    rows, cols = linear_sum_assignment(dist)
    matches = sum(1 for r, c in zip(rows, cols) if dist[r, c] <= radius)
    fp = len(pred) - matches
    fn = len(gt) - matches
    precision = matches / (matches + fp) if matches + fp else 0.0
    recall = matches / (matches + fn) if matches + fn else 0.0
    return precision, recall, matches, fp, fn


def draw_visual(image_path, gt_points, pred_points, output_path):
    img = cv2.imread(image_path)
    for x, y in gt_points:
        cv2.circle(img, (int(x), int(y)), 4, (0, 255, 0), -1)
    for x, y in pred_points:
        cv2.circle(img, (int(x), int(y)), 3, (0, 0, 255), 1)
    cv2.imwrite(output_path, img)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--images_dir", required=True)
    parser.add_argument("--gt_json", required=True)
    parser.add_argument("--weights", default=os.path.join("weights", "SHTechA.pth"))
    parser.add_argument("--output_dir", default="eval_results")
    parser.add_argument("--confidence", type=float, default=0.5)
    args = parser.parse_args()
    os.makedirs(args.output_dir, exist_ok=True)
    vis_dir = os.path.join(args.output_dir, "visualizations")
    os.makedirs(vis_dir, exist_ok=True)
    model, device, transform = load_model(args.weights)
    rows = []
    errors = []
    squared_errors = []
    for item in load_gt(args.gt_json):
        image_name = item["image"]
        gt_points = item.get("points", [])
        image_path = image_name if os.path.isabs(image_name) else os.path.join(args.images_dir, image_name)
        pred_points = infer_points(Image.open(image_path).convert("RGB"), model, device, transform, args.confidence)
        err = abs(len(pred_points) - len(gt_points))
        errors.append(err)
        squared_errors.append(err ** 2)
        row = {"image": os.path.basename(image_path), "gt_count": len(gt_points), "pred_count": len(pred_points), "abs_error": err, "sq_error": err ** 2}
        for radius in [5, 10, 15, 20]:
            p, r, m, fp, fn = precision_recall(pred_points, gt_points, radius)
            row[f"precision_{radius}px"] = round(p, 4)
            row[f"recall_{radius}px"] = round(r, 4)
            row[f"matches_{radius}px"] = m
            row[f"fp_{radius}px"] = fp
            row[f"fn_{radius}px"] = fn
        rows.append(row)
        draw_visual(image_path, gt_points, pred_points, os.path.join(vis_dir, os.path.splitext(os.path.basename(image_path))[0] + "_eval.png"))
    summary = {"mae": round(float(np.mean(errors)), 4) if errors else 0, "mse": round(float(np.mean(squared_errors)), 4) if squared_errors else 0, "images": len(rows)}
    csv_path = os.path.join(args.output_dir, "evaluation.csv")
    json_path = os.path.join(args.output_dir, "evaluation_summary.json")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["image"])
        writer.writeheader()
        writer.writerows(rows)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "rows": rows}, f, indent=2)
    print(json.dumps({"csv": csv_path, "json": json_path, "visualizations": vis_dir, "summary": summary}, indent=2))


if __name__ == "__main__":
    main()
