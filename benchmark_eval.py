import os
import time
import json
import torch
import numpy as np
import cv2
from PIL import Image
from models import build_model
import torchvision.transforms as standard_transforms

# 🛠️ Configuration parameters matching production
class Args:
    backbone = "vgg16_bn"
    row = 2
    line = 2

def load_eval_model(weight_path, device):
    model = build_model(Args()).to(device).eval()
    if os.path.exists(weight_path):
        checkpoint = torch.load(weight_path, map_location=device)
        model.load_state_dict(checkpoint["model"])
    transform = standard_transforms.Compose([
        standard_transforms.ToTensor(),
        standard_transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                      std=[0.229, 0.224, 0.225]),
    ])
    return model, transform

def run_performance_benchmark(model, transform, device, img_path, runs=20, warmup=5):
    """
    Measures mean latency, standard deviation, throughput, and peak GPU VRAM usage.
    """
    img = Image.open(img_path).convert("RGB")
    # Crop to 512x512 center patch to ensure dimensions are multiples of 128
    w, h = img.size
    cx, cy = w // 2, h // 2
    img_cropped = img.crop((cx - 256, cy - 256, cx + 256, cy + 256))
    sample = transform(img_cropped).unsqueeze(0).to(device)
    
    # Reset peak memory stats
    if device.type == "cuda":
        torch.cuda.reset_peak_memory_stats(device)
        torch.cuda.empty_cache()
    
    # Warm up runs to stabilize JIT/CUDA caches
    for _ in range(warmup):
        with torch.no_grad():
            _ = model(sample)
            
    latencies = []
    for _ in range(runs):
        start = time.perf_counter()
        with torch.no_grad():
            if device.type == "cuda":
                with torch.amp.autocast('cuda'):
                    out = model(sample)
            else:
                out = model(sample)
        # Force sync if running on GPU to get exact execution time
        if device.type == "cuda":
            torch.cuda.synchronize(device)
        latencies.append(time.perf_counter() - start)
        
    mean_latency = np.mean(latencies)
    std_latency = np.std(latencies)
    fps = 1.0 / mean_latency
    
    peak_vram = 0.0
    if device.type == "cuda":
        peak_vram = torch.cuda.max_memory_allocated(device) / (1024 * 1024) # MB
        
    return mean_latency, std_latency, fps, peak_vram

def calculate_model_parameters(model):
    """Calculates active trainable parameters."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    weights_path = os.path.join("weights", "SHTechA.pth")
    test_img_path = os.path.join("test_set", "img_1.jpg")
    
    print("=" * 60)
    print("      CIVIC PULSE TACTICAL CROWD ENGINE HARDWARE BENCHMARK      ")
    print("=" * 60)
    print(f"Device: {device.type.upper()}")
    if device.type == "cuda":
        print(f"GPU Name: {torch.cuda.get_device_name(0)}")
        
    # Verify weights
    if not os.path.exists(weights_path):
        print(f"[Error] Weight checkpoint file not found at {weights_path}")
        return
        
    model, transform = load_eval_model(weights_path, device)
    
    # 1. Model Properties
    params_count = calculate_model_parameters(model)
    file_size_mb = os.path.getsize(weights_path) / (1024 * 1024)
    
    print("\n[1] Neural Network Specifications:")
    print(f" -> Active Parameters: {params_count:,} ({params_count/1e6:.2f} Million)")
    print(f" -> Weight Checkpoint Size: {file_size_mb:.2f} MB")
    
    # 2. Performance Metrics
    if os.path.exists(test_img_path):
        print("\n[2] Executing Controlled Benchmarks (20 timed runs, 5 warm-ups)...")
        mean_l, std_l, fps, vram = run_performance_benchmark(model, transform, device, test_img_path)
        print(f" -> Inference Latency (Mean): {mean_l*1000:.2f} ms")
        print(f" -> Latency Std Dev (SD):    {std_l*1000:.2f} ms")
        print(f" -> Frame Throughput (FPS):  {fps:.2f} FPS")
        if device.type == "cuda":
            print(f" -> Peak VRAM Allocated:     {vram:.2f} MB")
        else:
            print(" -> Peak VRAM Allocated:     N/A (CPU execution)")
            
        # Write benchmark stats to JSON
        stats = {
            "device": device.type,
            "device_name": torch.cuda.get_device_name(0) if device.type == "cuda" else "CPU",
            "trainable_parameters": params_count,
            "model_size_mb": round(file_size_mb, 2),
            "mean_latency_ms": round(mean_l * 1000, 2),
            "std_latency_ms": round(std_l * 1000, 2),
            "throughput_fps": round(fps, 2),
            "peak_vram_mb": round(vram, 2)
        }
        with open("eval_results/hardware_benchmark.json", "w") as f:
            json.dump(stats, f, indent=2)
        print("\n[3] Saved metrics to eval_results/hardware_benchmark.json successfully!")
    else:
        print(f"\n[Warning] Test image not found at {test_img_path}. Performance benchmark skipped.")

if __name__ == "__main__":
    main()
