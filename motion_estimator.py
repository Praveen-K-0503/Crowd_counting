import cv2
import numpy as np

class GlobalMotionEstimator:
    def __init__(self):
        self.prev_gray = None
        self.prev_pts = None
        
    def update(self, current_frame):
        # Expects a BGR or RGB frame (function works identically long as it's 3-channel)
        curr_gray = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)
        
        transform = np.eye(2, 3, dtype=np.float32)
        
        if self.prev_gray is None:
            self.prev_gray = curr_gray
            self.prev_pts = cv2.goodFeaturesToTrack(curr_gray, maxCorners=200, qualityLevel=0.01, minDistance=30, blockSize=3)
            return transform
            
        if self.prev_pts is not None and len(self.prev_pts) > 0:
            curr_pts, status, err = cv2.calcOpticalFlowPyrLK(self.prev_gray, curr_gray, self.prev_pts, None, winSize=(21, 21), maxLevel=3)
            
            good_prev = self.prev_pts[status == 1]
            good_curr = curr_pts[status == 1]
            
            if len(good_prev) >= 4 and len(good_curr) >= 4:
                # Estimate affine transform (translation + rotation + scale) 
                transform, inliers = cv2.estimateAffinePartial2D(good_prev, good_curr)
                if transform is None: # Safety fallback
                    transform = np.eye(2, 3, dtype=np.float32)
        
        self.prev_gray = curr_gray
        self.prev_pts = cv2.goodFeaturesToTrack(curr_gray, maxCorners=200, qualityLevel=0.01, minDistance=30, blockSize=3)
        
        return transform
