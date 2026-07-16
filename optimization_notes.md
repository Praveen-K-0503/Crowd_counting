```python
from concurrent.futures import ThreadPoolExecutor

def extract_patch(job):
    x, y, img_padded, patch_size, transform = job
    patch = img_padded.crop((x, y, x + patch_size, y + patch_size))
    return x, y, transform(patch)

jobs = [(x, y, img_padded, patch_size, transform) for x, y in coords]
with ThreadPoolExecutor(max_workers=8) as executor:
    patch_tensors = list(executor.map(extract_patch, jobs))
```

```python
def grid_merge_points(points, radius=8.0):
    if not points:
        return []
    cell_size = radius
    cells = {}
    merged = []
    for point in points:
        x, y = point
        key = (int(x // cell_size), int(y // cell_size))
        duplicate = False
        for nx in range(key[0] - 1, key[0] + 2):
            for ny in range(key[1] - 1, key[1] + 2):
                for existing in cells.get((nx, ny), []):
                    if ((x - existing[0]) ** 2 + (y - existing[1]) ** 2) ** 0.5 <= radius:
                        duplicate = True
                        break
                if duplicate:
                    break
            if duplicate:
                break
        if not duplicate:
            merged.append(point)
            cells.setdefault(key, []).append(point)
    return merged
```

```python
import cv2
import numpy as np

class ORBHomographyMotionEstimator:
    def __init__(self, max_features=500):
        self.prev_gray = None
        self.orb = cv2.ORB_create(max_features)
        self.matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    def update(self, frame_bgr):
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        if self.prev_gray is None:
            self.prev_gray = gray
            return np.eye(3, dtype=np.float32)
        kp1, des1 = self.orb.detectAndCompute(self.prev_gray, None)
        kp2, des2 = self.orb.detectAndCompute(gray, None)
        H = np.eye(3, dtype=np.float32)
        if des1 is not None and des2 is not None and len(kp1) >= 8 and len(kp2) >= 8:
            matches = sorted(self.matcher.match(des1, des2), key=lambda m: m.distance)[:100]
            if len(matches) >= 8:
                src = np.float32([kp1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
                dst = np.float32([kp2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)
                H_found, _ = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
                if H_found is not None:
                    H = H_found.astype(np.float32)
        self.prev_gray = gray
        return H
```

```python
from PIL import Image

def batch_infer_frames(frames_rgb, process_frame_fn, model, device, transform, **kwargs):
    results = []
    for frame_rgb in frames_rgb:
        image = Image.fromarray(frame_rgb)
        _, count, points = process_frame_fn(image, model, device, transform, **kwargs)
        results.append({"count": count, "points": points})
    return results
```
