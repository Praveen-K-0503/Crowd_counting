# Manual Testing Checklist

- [ ] Image upload accepts JPG, JPEG, and PNG.
- [ ] Image processing completes and displays predicted points.
- [ ] Video upload accepts MP4, AVI, and MOV.
- [ ] Video processing supports shorter and longer videos without fixed duration limits.
- [ ] Confidence slider changes the number of detected points.
- [ ] Duplicate merge radius reduces duplicate detections on overlapping patches.
- [ ] Magnification improves visibility of small drone targets.
- [ ] Frame skip changes processing speed for video.
- [ ] Fast processing preset prioritizes speed.
- [ ] Balanced processing preset gives normal recommended behavior.
- [ ] Accurate processing preset processes more thoroughly and runs slower.
- [ ] Tracking keeps stable IDs across nearby moving points.
- [ ] Alert triggers show normal/advisory/warning/critical states at capacity thresholds.
- [ ] CSV export downloads and contains frame count fields.
- [ ] JSON export downloads and contains timeline data.
- [ ] Annotated video download works after processing.
- [ ] Invalid video upload shows a clean error message.
