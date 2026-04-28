import json
import os

import streamlit as st
from PIL import Image, ImageDraw

try:
    from streamlit_image_coordinates import streamlit_image_coordinates
except Exception:
    streamlit_image_coordinates = None


st.set_page_config(page_title="Point Annotation Tool", layout="wide")
st.title("Point Annotation Tool")

image_dir = st.sidebar.text_input("Image folder", value=".")
output_json = st.sidebar.text_input("Output JSON", value="annotations.json")

if "index" not in st.session_state:
    st.session_state.index = 0
if "annotations" not in st.session_state:
    st.session_state.annotations = {}


def list_images(folder):
    if not os.path.isdir(folder):
        return []
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    return sorted([name for name in os.listdir(folder) if os.path.splitext(name.lower())[1] in exts])


def annotated_image(image, points):
    preview = image.copy()
    draw = ImageDraw.Draw(preview)
    for x, y in points:
        r = 5
        draw.ellipse((x - r, y - r, x + r, y + r), fill="red", outline="white")
    return preview


images = list_images(image_dir)
if not images:
    st.warning("No images found.")
    st.stop()

st.session_state.index = max(0, min(st.session_state.index, len(images) - 1))
image_name = images[st.session_state.index]
image_path = os.path.join(image_dir, image_name)
image = Image.open(image_path).convert("RGB")
points = st.session_state.annotations.setdefault(image_name, [])

nav1, nav2, nav3, nav4 = st.columns(4)
if nav1.button("Prev"):
    st.session_state.index = max(0, st.session_state.index - 1)
    st.rerun()
if nav2.button("Next"):
    st.session_state.index = min(len(images) - 1, st.session_state.index + 1)
    st.rerun()
if nav3.button("Delete Last") and points:
    points.pop()
    st.rerun()
if nav4.button("Clear"):
    st.session_state.annotations[image_name] = []
    st.rerun()

st.write(f"{st.session_state.index + 1}/{len(images)} | {image_name} | Count: {len(points)}")
preview = annotated_image(image, points)

if streamlit_image_coordinates is not None:
    clicked = streamlit_image_coordinates(preview, key=f"img_{image_name}_{len(points)}")
    if clicked is not None and "x" in clicked and "y" in clicked:
        points.append([int(clicked["x"]), int(clicked["y"])])
        st.rerun()
else:
    st.image(preview, caption="Install streamlit-image-coordinates for direct click annotation.", use_container_width=True)
    c1, c2, c3 = st.columns(3)
    x = c1.number_input("x", min_value=0, max_value=image.width, value=0, step=1)
    y = c2.number_input("y", min_value=0, max_value=image.height, value=0, step=1)
    if c3.button("Add Point"):
        points.append([int(x), int(y)])
        st.rerun()

export_data = [
    {"image": name, "points": pts, "count": len(pts)}
    for name, pts in sorted(st.session_state.annotations.items())
]
json_text = json.dumps(export_data, indent=2)

if st.sidebar.button("Save JSON"):
    with open(output_json, "w", encoding="utf-8") as f:
        f.write(json_text)
    st.sidebar.success(output_json)

st.sidebar.download_button(
    "Download JSON",
    data=json_text.encode("utf-8"),
    file_name=os.path.basename(output_json),
    mime="application/json",
)
