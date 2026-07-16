import pandas as pd
import json

class ReportGenerator:
    def __init__(self):
        self.data = []
        
    def add_frame_data(self, frame_num, timestamp_sec, frame_count, cumulative_count):
        self.data.append({
            "frame_number": frame_num,
            "timestamp_sec": round(timestamp_sec, 2),
            "frame_count": frame_count,
            "total_unique_count": cumulative_count
        })
        
    def get_csv(self):
        if not self.data: return ""
        df = pd.DataFrame(self.data)
        return df.to_csv(index=False).encode('utf-8')
        
    def get_json(self):
        return json.dumps({
            "metadata": {
                "generated_by": "Civic Pulse Engine",
                "total_frames_analyzed": len(self.data)
            },
            "timeline": self.data
        }, indent=2).encode('utf-8')
