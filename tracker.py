import numpy as np
import cv2
from scipy.optimize import linear_sum_assignment
from motion_estimator import GlobalMotionEstimator

class PointTrack:
    def __init__(self, pt, track_id):
        self.id = track_id
        self.pt = np.array(pt, dtype=np.float32)
        self.velocity = 0.0
        self.time_since_update = 0


class Tracker:
    def __init__(self, max_distance=50.0, max_age=5):
        self.max_distance = max_distance
        self.max_age = max_age
        self.tracks = []
        self.next_id = 1
        self.motion_estimator = GlobalMotionEstimator()
        
    def apply_motion_compensation(self, transform):
        if transform is None or len(self.tracks) == 0:
            return
        # transform: 2x3 matrix
        pts = np.array([t.pt for t in self.tracks], dtype=np.float32).reshape(-1, 1, 2)
        pts_transformed = cv2.transform(pts, transform).reshape(-1, 2)
        for i, t in enumerate(self.tracks):
            t.pt = pts_transformed[i]

    def update(self, frame_bgr, detected_points):
        """
        Updates standard tracking variables and detects chaos.

        Returns:
            tuple[list[PointTrack], int, bool]: active tracks, cumulative unique count, and anomaly flag.
        """
        # 1. Global motion compensation via Drone drift
        transform = self.motion_estimator.update(frame_bgr)
        self.apply_motion_compensation(transform)
        
        # 2. Increment age for all
        for t in self.tracks:
            t.time_since_update += 1
            
        detected_points = np.array(detected_points, dtype=np.float32)
        
        if len(self.tracks) == 0:
            # First initialization
            for pt in detected_points:
                self.tracks.append(PointTrack(pt, self.next_id))
                self.next_id += 1
            return self.tracks.copy(), self.next_id - 1, False
            
        if len(detected_points) == 0:
            # No points detected, clear out old ones based on constraint
            self.tracks = [t for t in self.tracks if t.time_since_update <= self.max_age]
            return self.tracks.copy(), self.next_id - 1, False
            
        # 3. Hungarian matching assignment optimally pairing tracked to current
        track_pts = np.array([t.pt for t in self.tracks], dtype=np.float32)
        
        # Cost matrix: NxM distance mapping
        diff = track_pts[:, np.newaxis, :] - detected_points[np.newaxis, :, :]
        dist_matrix = np.sqrt(np.sum(diff**2, axis=2))
        
        # Optimization resolution
        row_ind, col_ind = linear_sum_assignment(dist_matrix)
        
        assigned_tracks = set()
        assigned_detections = set()
        
        for r, c in zip(row_ind, col_ind):
            if dist_matrix[r, c] <= self.max_distance:
                # Update velocity (distance from last position)
                self.tracks[r].velocity = dist_matrix[r, c]
                self.tracks[r].pt = detected_points[c]
                self.tracks[r].time_since_update = 0
                assigned_tracks.add(r)
                assigned_detections.add(c)

                
        # 4. Handle unassigned fresh detections
        for i, pt in enumerate(detected_points):
            if i not in assigned_detections:
                self.tracks.append(PointTrack(pt, self.next_id))
                self.next_id += 1
                
        # 5. Remove permanently lost/dead tracks
        self.tracks = [t for t in self.tracks if t.time_since_update <= self.max_age]
        
        # 6. Chaos detection criteria: if > 5 tracks are moving anomalously rapidly
        chaotic_count = sum(1 for t in self.tracks if t.velocity > self.max_distance * 0.7 and t.time_since_update == 0)
        anomaly = chaotic_count >= 5
        
        return self.tracks.copy(), self.next_id - 1, anomaly
