"""
download_weights.py
Auto-downloads the P2PNet model weights from HuggingFace Hub if they are
not present locally. Called at FastAPI startup so the container always has
the weights without committing the 82 MB .pth file to Git.
"""

import os


HF_WEIGHTS_REPO = os.environ.get(
    "HF_WEIGHTS_REPO",
    "praveendatascience/crowd-counting-weights",
)
WEIGHTS_FILENAME = "SHTechA.pth"
WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weights")
WEIGHTS_PATH = os.path.join(WEIGHTS_DIR, WEIGHTS_FILENAME)


def ensure_weights() -> None:
    """Download model weights from HuggingFace Hub if not present locally."""
    if os.path.exists(WEIGHTS_PATH):
        print(f"[Weights] Found at {WEIGHTS_PATH} - skipping download.")
        return

    repo_is_placeholder = (
        not HF_WEIGHTS_REPO
        or "YOUR_HF_USERNAME" in HF_WEIGHTS_REPO
        or "your-username" in HF_WEIGHTS_REPO.lower()
    )
    if repo_is_placeholder:
        print("[Weights] No valid HuggingFace weights repo configured - skipping download.")
        print("[Weights] The model will run without pretrained weights.")
        return

    print(
        f"[Weights] Not found locally. Downloading '{WEIGHTS_FILENAME}' "
        f"from HuggingFace Hub repo '{HF_WEIGHTS_REPO}' ..."
    )
    os.makedirs(WEIGHTS_DIR, exist_ok=True)

    try:
        from huggingface_hub import hf_hub_download

        downloaded = hf_hub_download(
            repo_id=HF_WEIGHTS_REPO,
            filename=WEIGHTS_FILENAME,
            local_dir=WEIGHTS_DIR,
        )
        print(f"[Weights] Downloaded successfully -> {downloaded}")
    except Exception as exc:
        print(f"[Weights] WARNING: Could not download weights - {exc}")
        print("[Weights] The model will run without pretrained weights.")
