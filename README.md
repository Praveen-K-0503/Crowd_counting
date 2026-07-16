# Civic Pulse — Tactical Crowd Intelligence Dashboard 👥

A high-performance, full-stack AI system for real-time crowd counting, localization, and trajectory tracking in drone-view feeds. Built on the state-of-the-art **P2PNet** (Purely Point-Based Framework, ICCV 2021 Oral Presentation).

This repository contains the complete codebase for both the **FastAPI Backend Service** and the premium **React/Vite Dashboard Frontend**.

---

## ⚡ Key Features

* **🔬 Core AI Engine**: Powered by **P2PNet** using a VGG-16 backbone with bipartite Hungarian matching, optimized for single-point human head localization (zero double-counting/clumping).
* **🏎️ Optimized Engine Modes**:
  * **Balanced Mode**: 1.5× scale-guided magnification with a 4.0px NMS radius, perfect for standard crowds.
  * **Performance Mode**: 1.0× native resolution for ultra-fast processing speeds on CPUs/GPUs.
* **🌐 Real-Time Streaming (WebSockets)**: Direct sub-second binary image frame streaming over WebSocket connections for live drone camera feeds.
* **📍 Hungarian Point Tracking**: Custom motion-compensated tracking (`tracker.py`) that estimates trajectories, compensates for drone drift, and logs **unique** subjects across video timelines.
* **🚧 Dynamic Zone Fencing**: Interactive vector polygon drawing in the UI to count and track individuals exclusively within a defined danger/critical zone.
* **🚨 Smart Alert System**:
  * **Capacity Breach Alerts**: Real-time alarms triggered when zone population exceeds custom capacity parameters.
  * **Chaos Alerts**: Detects sudden fast-moving crowd stampedes or counterflows.
* **📊 Visual Layers**: High-contrast head-point overlay (with opacity slider control) and real-time density Heatmaps.

---

## 🛠️ Project Directory Structure

```
Crowd_counting/
│
├── frontend/                     # [React/Vite] Modern Tailwind-styled Web Dashboard
│   ├── src/
│   │   ├── App.jsx               # Core application logic & WebSocket handling
│   │   ├── index.css             # Vanilla CSS styling rules & glassmorphic system
│   │   └── main.jsx              # App entry point
│   ├── package.json              # Frontend package definitions
│   └── vite.config.js            # Build and bundler configurations
│
├── weights/                      # Trained model parameters folder
│   └── SHTechA.pth               # Pre-trained P2PNet weight checkpoint (MAE: ~51.9)
│
├── models/                       # Core neural networks directory
│   ├── p2pnet.py                 # Purely Point-based crowd counting network
│   ├── backbone.py               # CNN Backbone definition
│   ├── matcher.py                # Bipartite Hungarian matcher logic
│   └── vgg_.py                   # VGG-16 upsampled configuration
│
├── util/                         # Drawing and mapping utilities
│   └── plot_utils.py             # Drawing coordinates & rendering output images
│
├── database.py                   # SQLite configuration using SQLModel ORM
├── tracker.py                    # Object tracking using Hungarian optimal assignment
├── alert_system.py               # Crowd threshold alarms & chaos detector
├── motion_estimator.py           # Global motion translation (compensates for drone drift)
├── report_generator.py           # Logic to compile data logs into downloadable reports
├── download_weights.py           # CLI tool to verify/download weights automatically
│
├── api.py                        # REST & WebSocket FastAPI backend server
├── requirements.txt              # Backend library dependencies
└── Dockerfile                    # Containerization script for production deployment
```

---

## 🚀 Quick Local Setup

### 1. Prerequisites
Ensure you have **Python 3.8+** and **Node.js 16+** installed on your system.

### 2. Backend Installation & Startup
```bash
# Clone the repository
git clone https://github.com/Praveen-K-0503/Crowd_counting.git
cd Crowd_counting

# Install required packages
pip install -r requirements.txt

# Download pre-trained weights (if not present)
python download_weights.py

# Launch the FastAPI backend server
python api.py
```
The backend server will launch on `http://127.0.0.1:8000`.

### 3. Frontend Installation & Startup
```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Run the local development server
npm run dev
```
Open your browser and navigate to `http://localhost:5173` (or the port specified in your console).

---

## 🎛️ Configurations & Parameters

In the control panel on the left of the dashboard, you can tweak settings dynamically:

| Parameter | Default | Description |
|---|---|---|
| **Engine Mode** | `Balanced` | Toggle between `Balanced` (1.5× zoom) and `Performance` (1.0× native resolution). |
| **Overlay Opacity** | `100%` | Controls transparency of rendering dots to inspect original frames. |
| **Capacity Limit** | `150` | Sets the maximum threshold for alerts. Exceeding this triggers the **Threat: Danger** state. |
| **Draw Zone Polygon** | *Disabled* | Activating this allows drawing a polygon fence directly onto the camera feed. |

---

## 📈 Database Logging
All telemetry data (Peak counts, average populations, anomaly flags, session duration, and historical timestamps) are logged inside a local SQLite database file `crowd_data.db`. You can query this data programmatically or export it as a CSV report via the **Export Report** button.

---

## 🤝 Acknowledgements

* Core network architecture is based on the official implementation of **P2PNet** described in [Rethinking Counting and Localization in Crowds](https://arxiv.org/abs/2107.12746) (Song et al.).
* Trajectory math relies on Hungarian bipartite matching using standard `scipy` optimization routines.
