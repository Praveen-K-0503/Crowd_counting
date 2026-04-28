import json
import math
import os
import time

import torch


PRESETS = {
    "Fast": {
        "magnification": 1.0,
        "confidence_threshold": 0.55,
        "nms_radius": 10.0,
        "tracker_max_distance": 65.0,
        "inference_batch_size": 16,
        "frame_skip": 5,
        "patch_overlap": 0.0,
    },
    "Balanced": {
        "magnification": 1.5,
        "confidence_threshold": 0.5,
        "nms_radius": 8.0,
        "tracker_max_distance": 50.0,
        "inference_batch_size": 8,
        "frame_skip": 2,
        "patch_overlap": 0.25,
    },
    "Accurate": {
        "magnification": 2.0,
        "confidence_threshold": 0.45,
        "nms_radius": 6.0,
        "tracker_max_distance": 40.0,
        "inference_batch_size": 4,
        "frame_skip": 1,
        "patch_overlap": 0.5,
    },
}


def load_config(config_path, defaults):
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return {**defaults, **json.load(f)}
    return defaults


def save_config(config_path, config):
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)


def run_with_oom_recovery(process_fn, *args, batch_size=8, min_batch_size=1, **kwargs):
    current_batch = max(min_batch_size, int(batch_size))
    while current_batch >= min_batch_size:
        try:
            return process_fn(*args, batch_size=current_batch, **kwargs), current_batch
        except RuntimeError as exc:
            if "out of memory" not in str(exc).lower():
                raise
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            if current_batch == min_batch_size:
                raise
            current_batch = max(min_batch_size, current_batch // 2)
    raise RuntimeError("CUDA OOM recovery failed.")


def confidence_interval(values, z=1.96):
    if not values:
        return 0.0, 0.0
    if len(values) == 1:
        return float(values[0]), float(values[0])
    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
    margin = z * math.sqrt(variance) / math.sqrt(len(values))
    return mean - margin, mean + margin


def result_summary(start_time, frames_read, frames_analyzed, counts):
    elapsed = max(time.perf_counter() - start_time, 1e-9)
    ci_low, ci_high = confidence_interval(counts)
    return {
        "elapsed_sec": round(elapsed, 3),
        "frames_read": frames_read,
        "frames_analyzed": frames_analyzed,
        "effective_fps": round(frames_read / elapsed, 3),
        "analysis_fps": round(frames_analyzed / elapsed, 3),
        "avg_count": round(sum(counts) / len(counts), 3) if counts else 0,
        "peak_count": max(counts) if counts else 0,
        "count_95ci_low": round(ci_low, 3),
        "count_95ci_high": round(ci_high, 3),
    }


APP_PASTE_SECTION = r'''
CONFIG_PATH = os.path.join(BASE_DIR, "civic_pulse_config.json")
PRESETS = {
    "Fast": {"magnification": 1.0, "confidence_threshold": 0.55, "nms_radius": 10.0, "tracker_max_distance": 65.0, "inference_batch_size": 16, "frame_skip": 5, "patch_overlap": 0.0},
    "Balanced": {"magnification": 1.5, "confidence_threshold": 0.5, "nms_radius": 8.0, "tracker_max_distance": 50.0, "inference_batch_size": 8, "frame_skip": 2, "patch_overlap": 0.25},
    "Accurate": {"magnification": 2.0, "confidence_threshold": 0.45, "nms_radius": 6.0, "tracker_max_distance": 40.0, "inference_batch_size": 4, "frame_skip": 1, "patch_overlap": 0.5},
}

def process_with_oom_recovery(*args, batch_size, **kwargs):
    while batch_size >= 1:
        try:
            return process_frame(*args, batch_size=batch_size, **kwargs), batch_size
        except RuntimeError as exc:
            if "out of memory" not in str(exc).lower():
                raise
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            if batch_size == 1:
                raise
            batch_size = max(1, batch_size // 2)
'''
