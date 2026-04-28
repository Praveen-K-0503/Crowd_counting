import streamlit as st
import cv2
import torch
import torchvision.transforms as standard_transforms
import numpy as np
from PIL import Image
import os
import tempfile
import time
import warnings
warnings.filterwarnings('ignore')

from tracker import Tracker
from report_generator import ReportGenerator
from alert_system import render_alert

from app_enhancements import confidence_interval, load_config, save_config
from models import build_model

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "civic_pulse_config.json")
MODE_SETTINGS = {
    "Fast": {
        "patch_overlap": 0.0,
        "frame_skip": 5,
        "magnification": 1.25,
        "confidence_threshold": 0.5,
        "nms_radius": 10.0,
        "tracker_max_distance": 65.0,
        "inference_batch_size": 16,
    },
    "Balanced": {
        "patch_overlap": 0.25,
        "frame_skip": 2,
        "magnification": 1.5,
        "confidence_threshold": 0.35,
        "nms_radius": 9.0,
        "tracker_max_distance": 55.0,
        "inference_batch_size": 8,
    },
    "Accurate": {
        "patch_overlap": 0.5,
        "frame_skip": 1,
        "magnification": 2.0,
        "confidence_threshold": 0.25,
        "nms_radius": 7.0,
        "tracker_max_distance": 45.0,
        "inference_batch_size": 4,
    },
}
DEFAULT_CONFIG = {
    "processing_mode": "Balanced",
    "max_resolution": 3840,
    "magnification": 1.5,
    "confidence_threshold": 0.35,
    "nms_radius": 9.0,
    "tracker_max_distance": 55.0,
    "inference_batch_size": 8,
    "inference_strategy": "Auto",
    "venue_capacity": 15000,
}
saved_config = load_config(CONFIG_PATH, DEFAULT_CONFIG)

# Custom wrapper to provide args to the model builder
class Args:
    def __init__(self):
        self.backbone = 'vgg16_bn'
        self.row = 2
        self.line = 2

# Page Configuration
st.set_page_config(page_title="Civic Pulse Dashboard", page_icon="🚁", layout="wide")

st.title("🚁 Civic Pulse: Drone Crowd Monitor")
st.markdown("Upload drone imagery or video for AI-based crowd counting using P2PNet.")

# Sidebar Configuration
st.sidebar.header("Processing Settings")
processing_mode = st.sidebar.selectbox(
    "Processing Mode",
    ("Balanced", "Fast", "Accurate"),
    index=("Balanced", "Fast", "Accurate").index(saved_config.get("processing_mode", "Balanced")),
    help="Fast uses fewer overlapping patches. Accurate uses more overlap for better boundary coverage. Balanced is recommended."
)
preset_values = MODE_SETTINGS[processing_mode]
use_preset_values = st.sidebar.checkbox(
    "Use Recommended Detection Preset",
    value=True,
    help="Recommended for drone/top-down images. Turn off only if you want to manually tune every setting."
)
max_resolution = st.sidebar.slider("Max GPU Resolution Bounds", min_value=720, max_value=8000, value=int(saved_config.get("max_resolution", 3840)), step=120, help="Prevents RAM crashes. Patches are generated within this bound.")
inference_strategy = st.sidebar.selectbox(
    "Inference Strategy",
    ("Auto", "Single Pass", "Tiled"),
    index=("Auto", "Single Pass", "Tiled").index(saved_config.get("inference_strategy", "Auto")),
    help="Single Pass is much faster for normal images. Tiled is only for very large images. Auto chooses for you."
)
if use_preset_values:
    magnification = preset_values["magnification"]
    confidence_threshold = preset_values["confidence_threshold"]
    nms_radius = preset_values["nms_radius"]
    tracker_max_distance = preset_values["tracker_max_distance"]
    inference_batch_size = preset_values["inference_batch_size"]
    st.sidebar.info(
        f"Preset active: magnification {magnification}x, confidence {confidence_threshold}, "
        f"merge radius {nms_radius}px, batch {inference_batch_size}."
    )
else:
    magnification = st.sidebar.slider("Micro-Target Magnification", min_value=1.0, max_value=3.0, value=float(saved_config.get("magnification", preset_values["magnification"])), step=0.1, help="Scales up tiny drone targets so the AI can physically see them.")
    confidence_threshold = st.sidebar.slider("Confidence Threshold", min_value=0.05, max_value=1.0, value=float(saved_config.get("confidence_threshold", preset_values["confidence_threshold"])), step=0.05, help="Decrease to catch missed people, increase to reduce false positives.")
    nms_radius = st.sidebar.slider("Duplicate Merge Radius (px)", min_value=2.0, max_value=30.0, value=float(saved_config.get("nms_radius", preset_values["nms_radius"])), step=1.0, help="Merges overlapping patch detections. Increase if duplicate dots appear.")
    tracker_max_distance = st.sidebar.slider("Tracker Match Radius (px)", min_value=10.0, max_value=150.0, value=float(saved_config.get("tracker_max_distance", preset_values["tracker_max_distance"])), step=5.0, help="Maximum motion allowed when matching people between processed video frames.")
    inference_batch_size = st.sidebar.slider("P2PNet Patch Batch Size", min_value=1, max_value=32, value=int(saved_config.get("inference_batch_size", preset_values["inference_batch_size"])), step=1, help="Processes tiled patches in batches for faster P2PNet inference. Lower it if memory is limited.")
input_type = st.sidebar.radio("Select Input Type", ("Image", "Video"))
uploaded_file = st.sidebar.file_uploader(f"Upload {input_type}", type=["png", "jpg", "jpeg"] if input_type == "Image" else ["mp4", "avi", "mov"])

st.sidebar.markdown("---")
st.sidebar.header("Alert Settings")
venue_capacity = st.sidebar.slider("Venue Max Capacity", min_value=100, max_value=50000, value=int(saved_config.get("venue_capacity", 15000)), step=100)
if st.sidebar.button("Save Current Settings"):
    save_config(CONFIG_PATH, {
        "processing_mode": processing_mode,
        "max_resolution": max_resolution,
        "magnification": magnification,
        "confidence_threshold": confidence_threshold,
        "nms_radius": nms_radius,
        "tracker_max_distance": tracker_max_distance,
        "inference_batch_size": inference_batch_size,
        "inference_strategy": inference_strategy,
        "venue_capacity": venue_capacity,
    })
    st.sidebar.success("Settings saved.")


@st.cache_resource
def load_model():
    """Load the P2PNet model into GPU if available."""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    if device.type == 'cuda':
        torch.backends.cudnn.benchmark = True
        
    args = Args()
    model = build_model(args)
    model.to(device)
    if device.type == 'cuda':
        model.to(memory_format=torch.channels_last)
    
    # Load weights
    weight_path = os.path.join(BASE_DIR, 'weights', 'SHTechA.pth')
    if os.path.exists(weight_path):
        checkpoint = torch.load(weight_path, map_location=device)
        model.load_state_dict(checkpoint['model'])
    else:
        st.sidebar.error(f"Weights not found at {weight_path}. Model will perform poorly.")
    
    model.eval()
    
    transform = standard_transforms.Compose([
        standard_transforms.ToTensor(), 
        standard_transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    return model, device, transform

model, device, transform = load_model()

def format_elapsed(seconds):
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes, remaining = divmod(seconds, 60)
    return f"{int(minutes)}m {remaining:.1f}s"


def score_aware_merge(predictions, radius, orig_width, orig_height):
    if not predictions:
        return []
    predictions = sorted(predictions, key=lambda item: item[2], reverse=True)
    final_points = []
    radius_sq = radius * radius
    for x, y, _ in predictions:
        if not (0 <= x < orig_width and 0 <= y < orig_height):
            continue
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


def process_frame(
    img_raw,
    model,
    device,
    transform,
    threshold,
    max_dim=3840,
    magnification=1.5,
    patch_size=512,
    nms_radius=8.0,
    batch_size=8,
    patch_overlap=0.25,
    inference_strategy="Auto",
    full_frame_max_dim=1800,
    progress_callback=None,
):
    """Process a PIL Image using Multi-Scale Tiling Inference."""
    orig_width, orig_height = img_raw.size
    
    # 1. Magnify
    work_width = int(orig_width * magnification)
    work_height = int(orig_height * magnification)
    
    if max_dim is not None and (work_width > max_dim or work_height > max_dim):
        scale = max_dim / float(max(work_width, work_height))
        work_width = int(work_width * scale)
        work_height = int(work_height * scale)
        magnification = work_width / float(orig_width)
        
    resample_filter = getattr(Image, 'Resampling', Image).LANCZOS if hasattr(Image, 'Resampling') else getattr(Image, 'ANTIALIAS', 1)
    img_magnified = img_raw.resize((work_width, work_height), resample_filter)

    use_single_pass = inference_strategy == "Single Pass" or (
        inference_strategy == "Auto" and max(work_width, work_height) <= full_frame_max_dim
    )

    if use_single_pass:
        model_width = round_to_stride(work_width)
        model_height = round_to_stride(work_height)
        scale_x = model_width / float(orig_width)
        scale_y = model_height / float(orig_height)
        model_img = img_raw.resize((model_width, model_height), resample_filter)
        samples = transform(model_img).unsqueeze(0).to(device, non_blocking=True)
        if device.type == 'cuda':
            samples = samples.contiguous(memory_format=torch.channels_last)

        with torch.inference_mode():
            if device.type == 'cuda':
                with torch.cuda.amp.autocast():
                    outputs = model(samples)
            else:
                outputs = model(samples)

        scores = torch.nn.functional.softmax(outputs['pred_logits'].float(), -1)[:, :, 1][0]
        points = outputs['pred_points'][0].float()
        mask = scores > threshold
        selected_points = points[mask].detach().cpu().numpy()
        selected_scores = scores[mask].detach().cpu().numpy()
        predictions = []
        for point, score in zip(selected_points, selected_scores):
            predictions.append([point[0] / scale_x, point[1] / scale_y, float(score)])
        if progress_callback is not None:
            progress_callback(1.0, 1, 1)
        final_points = score_aware_merge(predictions, nms_radius, orig_width, orig_height)
        return img_raw, len(final_points), final_points
    
    # 2. Symmetrical Boundary Padding to eliminate corner-blindness
    pad_border = 256
    new_width = ((work_width + (pad_border * 2) + patch_size - 1) // patch_size) * patch_size
    new_height = ((work_height + (pad_border * 2) + patch_size - 1) // patch_size) * patch_size
    
    img_padded = Image.new('RGB', (new_width, new_height), (0, 0, 0))
    img_padded.paste(img_magnified, (pad_border, pad_border))
    
    all_predictions = []
    patch_overlap = min(max(float(patch_overlap), 0.0), 0.75)
    stride = max(64, int(patch_size * (1.0 - patch_overlap)))
    patch_jobs = []
    
    # 3. Patch Gridding Inference
    for y in range(0, new_height - stride + 1, stride):
        for x in range(0, new_width - stride + 1, stride):
            if y + patch_size > new_height or x + patch_size > new_width: continue
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
                with torch.cuda.amp.autocast():
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
                # Subtract the padding offset to map correctly back to original frame
                points[:, 0] += (x - pad_border)
                points[:, 1] += (y - pad_border)
                points = points / float(magnification)
                for point, score in zip(points, scores):
                    all_predictions.append([point[0], point[1], float(score)])

        if progress_callback is not None and total_patches > 0:
            done = min(start_idx + len(batch_jobs), total_patches)
            progress_callback(done / total_patches, done, total_patches)
                
    final_points = score_aware_merge(all_predictions, nms_radius, orig_width, orig_height)
                
    return img_raw, len(final_points), final_points


def process_frame_with_oom_recovery(*args, batch_size=8, **kwargs):
    current_batch_size = max(1, int(batch_size))
    while current_batch_size >= 1:
        try:
            result = process_frame(*args, batch_size=current_batch_size, **kwargs)
            return result, current_batch_size
        except RuntimeError as exc:
            if "out of memory" not in str(exc).lower():
                raise
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            if current_batch_size == 1:
                raise
            current_batch_size = max(1, current_batch_size // 2)


# Main Interface
if uploaded_file is not None:
    if input_type == "Image":
        col1, col2 = st.columns(2)
        
        # Original Image
        image = Image.open(uploaded_file).convert('RGB')
        col1.subheader("Original Image")
        col1.image(image, use_container_width=True)
        
        # Processing
        if st.sidebar.button("Process Image"):
            image_progress = st.progress(0)
            image_status = st.empty()
            image_start = time.perf_counter()

            def update_image_progress(ratio, done, total):
                elapsed = time.perf_counter() - image_start
                image_progress.progress(ratio)
                image_status.text(f"Processing image patches: {done}/{total} ({ratio * 100:.1f}%) | Elapsed: {format_elapsed(elapsed)}")

            (processed_img, count, points), used_batch_size = process_frame_with_oom_recovery(
                image,
                model,
                device,
                transform,
                confidence_threshold,
                max_dim=max_resolution,
                magnification=magnification,
                nms_radius=nms_radius,
                batch_size=inference_batch_size,
                patch_overlap=MODE_SETTINGS[processing_mode]["patch_overlap"],
                inference_strategy=inference_strategy,
                progress_callback=update_image_progress,
            )
            image_elapsed = time.perf_counter() - image_start
            image_progress.progress(1.0)
            image_status.text(f"Image processing complete: 100.0% | Processed time: {format_elapsed(image_elapsed)}")
            
            img_draw = cv2.cvtColor(np.array(processed_img), cv2.COLOR_RGB2BGR)
            for p in points:
                cv2.circle(img_draw, (int(p[0]), int(p[1])), 2, (0, 0, 255), -1)
                
            img_draw_rgb = cv2.cvtColor(img_draw, cv2.COLOR_BGR2RGB)
            
            col2.subheader("Processed Analysis")
            col2.image(img_draw_rgb, use_container_width=True)
            st.sidebar.metric(label="Detected Crowd Count", value=count)
            st.sidebar.metric(label="Processed Time", value=format_elapsed(image_elapsed))
            st.sidebar.metric(label="Used Batch Size", value=used_batch_size)
            if count < 10:
                st.warning(
                    "Low detection count. For top-down drone/crosswalk images, use Processing Mode = Accurate. "
                    "If still low, turn off recommended preset and reduce Confidence Threshold toward 0.05."
                )
            
    elif input_type == "Video":
        st.subheader("Video Processing")
        st.caption("Upload any supported video duration. Processing progress is calculated from the video's total frame count, not a fixed 30-second limit.")
        
        frame_skip = st.sidebar.slider(
            "Frame Skip (Process Every Nth Frame)",
            min_value=1,
            max_value=30,
            value=MODE_SETTINGS[processing_mode]["frame_skip"],
            step=1,
            help="Higher values process video faster by analyzing fewer frames. Processing Mode sets a good starting value."
        )
        
        if st.sidebar.button("Process Video"):
            # Save temp file because cv2.VideoCapture requires a file path
            tfile = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
            tfile.write(uploaded_file.getvalue())
            tfile.close()  # Fixes Windows [WinError 32] lock

            cap = cv2.VideoCapture(tfile.name)
            fps = int(cap.get(cv2.CAP_PROP_FPS))
            if fps == 0:
                fps = 30
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if width <= 0 or height <= 0:
                cap.release()
                os.remove(tfile.name)
                st.error("Could not read video dimensions. Please upload a valid video file.")
                st.stop()
            video_duration = total_frames / float(fps) if total_frames > 0 else 0
            st.info(
                f"Video loaded: {width}x{height}, {fps} FPS, "
                f"{total_frames if total_frames > 0 else 'unknown'} frames"
                f"{f', duration {format_elapsed(video_duration)}' if video_duration > 0 else ''}."
            )
            
            # Ensure multiples of 2 for codecs
            new_width = width if width % 2 == 0 else width - 1
            new_height = height if height % 2 == 0 else height - 1
            
            tfile_out = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
            tfile_out.close()  # Fixes Windows [WinError 32] lock
            # mp4v is a safe fallback codec for cv2.VideoWriter
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(tfile_out.name, fourcc, fps, (new_width, new_height))
            
            progress_bar = st.progress(0)
            status_text = st.empty()
            elapsed_text = st.empty()
            video_start = time.perf_counter()
            
            peak_count = 0
            frames_processed = 0
            frames_analyzed = 0
            crowd_timeline = []
            analyzed_counts = []
            live_count = 0
            used_batch_size = inference_batch_size
            last_out_frame = np.zeros((new_height, new_width, 3), dtype=np.uint8)
            
            # --- Analytics Inits ---
            tracker = Tracker(max_distance=tracker_max_distance, max_age=5)
            report = ReportGenerator()
            total_unique = 0
            
            # Helper for consistent coloring based on unique ID
            def get_color(track_id):
                np.random.seed(track_id)
                return tuple(int(x) for x in np.random.randint(0, 255, 3))
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Check for frame skip optimization
                if frames_processed % frame_skip == 0:
                    # Convert cv2 frame (BGR) to PIL RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(frame_rgb)
                    
                    # Process single frame safely
                    (img_out, live_count, raw_points), used_batch_size = process_frame_with_oom_recovery(
                        pil_img,
                        model,
                        device,
                        transform,
                        confidence_threshold,
                        max_dim=max_resolution,
                        magnification=magnification,
                        nms_radius=nms_radius,
                        batch_size=inference_batch_size,
                        patch_overlap=MODE_SETTINGS[processing_mode]["patch_overlap"],
                        inference_strategy=inference_strategy,
                    )
                    frames_analyzed += 1
                    analyzed_counts.append(live_count)
                    
                    img_out = img_out.resize((new_width, new_height))
                    img_out_bgr = cv2.cvtColor(np.array(img_out), cv2.COLOR_RGB2BGR)
                    
                    # Track
                    active_tracks, cumulative_unique, anomaly = tracker.update(img_out_bgr, raw_points)
                    total_unique = cumulative_unique
                    
                    # Draw faintly all raw points
                    for p in raw_points:
                        cv2.circle(img_out_bgr, (int(p[0]), int(p[1])), 2, (0, 0, 100), -1)
                        
                    # Draw strongly unique IDs
                    for t in active_tracks:
                        color = get_color(t.id)
                        cv2.circle(img_out_bgr, (int(t.pt[0]), int(t.pt[1])), 4, color, -1)
                    if anomaly:
                        st.warning("High motion anomaly detected in the current processed segment.")
                        
                    last_out_frame = img_out_bgr
                    
                    if live_count > peak_count:
                        peak_count = live_count
                        
                    current_time_sec = frames_processed / float(fps)
                    report.add_frame_data(frames_processed, current_time_sec, live_count, total_unique)
                else:
                    # For skipped frames, duplicate the last drawn frame for continuous smooth playback
                    pass
                
                crowd_timeline.append(live_count)
                out.write(last_out_frame)
                
                frames_processed += 1
                if total_frames > 0:
                    encoded_status = min(frames_processed / total_frames, 1.0)
                    progress_bar.progress(encoded_status)
                    elapsed = time.perf_counter() - video_start
                    status_text.text(f"Processing video: {encoded_status * 100:.1f}% | Frame {frames_processed}/{total_frames} | Unique Targets: {total_unique}")
                    elapsed_text.text(f"Elapsed processing time: {format_elapsed(elapsed)}")
                else:
                    elapsed = time.perf_counter() - video_start
                    status_text.text(f"Processing frame {frames_processed}... (Unique Targets: {total_unique})")
                    elapsed_text.text(f"Elapsed processing time: {format_elapsed(elapsed)}")
            
            cap.release()
            out.release()
            os.remove(tfile.name)
            
            video_elapsed = time.perf_counter() - video_start
            progress_bar.progress(1.0)
            status_text.text(f"Processing Complete: 100.0% | Finalizing video output...")
            elapsed_text.text(f"Total processed time: {format_elapsed(video_elapsed)}")
            
            # Try to encode the resulting MP4 in H264 for web browser compatibility using ffmpeg (if available)
            web_friendly_mp4 = tfile_out.name.replace('.mp4', '_web.mp4')
            result_video_path = tfile_out.name
            
            try:
                # Suppress output to avoid clutter, run synchronously
                exit_code = os.system(f'ffmpeg -y -i "{tfile_out.name}" -vcodec libx264 -f mp4 "{web_friendly_mp4}" >nul 2>&1')
                if exit_code == 0 and os.path.exists(web_friendly_mp4):
                    result_video_path = web_friendly_mp4
            except Exception:
                pass
            
            st.success("Video Analytics Compilation Completed.")
            
            # Subsystem Alerts
            render_alert(total_unique, venue_capacity)
            
            # Telemetry Metrics
            m1, m2 = st.columns(2)
            m1.metric(label="Peak Current Frame Count", value=peak_count)
            m2.metric(label="Total Unique Individuals Tracked", value=total_unique)
            st.metric(label="Total Processed Time", value=format_elapsed(video_elapsed))
            ci_low, ci_high = confidence_interval(analyzed_counts)
            s1, s2, s3 = st.columns(3)
            s1.metric(label="Effective FPS", value=f"{frames_processed / video_elapsed:.2f}" if video_elapsed > 0 else "0.00")
            s2.metric(label="Analyzed FPS", value=f"{frames_analyzed / video_elapsed:.2f}" if video_elapsed > 0 else "0.00")
            s3.metric(label="95% Count CI", value=f"{ci_low:.1f} - {ci_high:.1f}")
            st.caption(f"CUDA OOM recovery used batch size: {used_batch_size}")
            if peak_count < 10:
                st.warning(
                    "Low detection count. For top-down drone/crosswalk videos, use Processing Mode = Accurate. "
                    "If still low, turn off recommended preset and reduce Confidence Threshold toward 0.05."
                )
            
            st.subheader("Population History Dynamics")
            st.line_chart(crowd_timeline)
            
            st.subheader("Data Exports")
            e1, e2 = st.columns(2)
            if total_unique > 0:
                e1.download_button(label="Download CSV Report", data=report.get_csv(), file_name="drone_report.csv", mime="text/csv")
                e2.download_button(label="Download JSON Report", data=report.get_json(), file_name="drone_report.json", mime="application/json")
            else:
                st.info("No crowd targets detected to export.")
            
            st.subheader("Simulated Telemetry Video Pipeline")
            try:
                video_bytes = open(result_video_path, 'rb').read()
                st.video(video_bytes)
                st.download_button(label="Download Analytics Video", data=video_bytes, file_name="analytics_overlay_output.mp4", mime="video/mp4")
            except Exception as e:
                st.error("Could not load the generated video for playback in Streamlit, but you can download it anyway.")
                st.download_button(label="Download Analytics Video", data=open(tfile_out.name, 'rb').read(), file_name="analytics_overlay_output.mp4", mime="video/mp4")


else:
    st.info("Please upload an image or video from the sidebar to begin.")
