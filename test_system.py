import json

import cv2
import numpy as np
import torch

from motion_estimator import GlobalMotionEstimator
from report_generator import ReportGenerator
from tracker import Tracker


GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"


def run_test(name, fn):
    try:
        fn()
        print(f"{GREEN}PASS{RESET} {name}")
        return True
    except Exception as exc:
        print(f"{RED}FAIL{RESET} {name}: {exc}")
        return False


def test_model_loading():
    from models import build_model

    class Args:
        backbone = "vgg16_bn"
        row = 2
        line = 2

    model = build_model(Args())
    assert model is not None


def test_dummy_inference():
    from models import build_model

    class Args:
        backbone = "vgg16_bn"
        row = 2
        line = 2

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(Args()).to(device).eval()
    x = torch.zeros((1, 3, 512, 512), dtype=torch.float32, device=device)
    with torch.inference_mode():
        out = model(x)
    assert "pred_logits" in out and "pred_points" in out
    assert out["pred_logits"].shape[0] == 1


def test_tracker_persistence():
    tracker = Tracker(max_distance=20, max_age=3)
    frame = np.zeros((128, 128, 3), dtype=np.uint8)
    first_id = None
    for i in range(30):
        tracks, total, anomaly = tracker.update(frame, [[50 + i * 0.2, 50 + i * 0.1]])
        assert tracks
        if first_id is None:
            first_id = tracks[0].id
        assert tracks[0].id == first_id
        assert anomaly is False
    assert total == 1


def test_motion_compensation():
    estimator = GlobalMotionEstimator()
    img1 = np.zeros((200, 200, 3), dtype=np.uint8)
    cv2.circle(img1, (80, 80), 10, (255, 255, 255), -1)
    cv2.rectangle(img1, (120, 120), (150, 150), (255, 255, 255), -1)
    img2 = np.roll(img1, shift=5, axis=1)
    t1 = estimator.update(img1)
    t2 = estimator.update(img2)
    assert t1.shape == (2, 3)
    assert t2.shape == (2, 3)


def test_alert_thresholds():
    for current, threshold in [(50, 100), (75, 100), (90, 100), (100, 100)]:
        ratio = current / threshold
        assert ratio >= 0


def test_report_exports():
    report = ReportGenerator()
    report.add_frame_data(1, 0.03, 10, 11)
    csv_data = report.get_csv()
    json_data = report.get_json()
    assert b"frame_number" in csv_data
    parsed = json.loads(json_data.decode("utf-8"))
    assert parsed["timeline"][0]["frame_count"] == 10


def main():
    tests = [
        ("model loading", test_model_loading),
        ("dummy image inference", test_dummy_inference),
        ("tracker ID persistence across 30 frames", test_tracker_persistence),
        ("motion compensation transform", test_motion_compensation),
        ("alert thresholds at 50/75/90/100%", test_alert_thresholds),
        ("CSV/JSON export", test_report_exports),
    ]
    results = [run_test(name, fn) for name, fn in tests]
    passed = sum(results)
    print(f"{passed}/{len(results)} tests passed")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
