# CivicPulse Vision Training Plan

The current app has a safe baseline for image evidence:

- It extracts GPS metadata from JPEG photos when available.
- It uses address search, GPS, or map pinning when photo GPS metadata is missing.
- It passes lightweight visual signals into the AI assistant when filenames contain civic issue hints.

For accurate image classification, train a real model on labeled civic images. A perfect model is not realistic, but a good production model is achievable with enough labeled examples and evaluation.

## Recommended Labels

Use the same project domains as labels:

- Roads and Transportation
- Sanitation and Waste Management
- Water Supply, Sewerage, and Drainage
- Street Lighting and Electrical Infrastructure
- Public Infrastructure and Amenities
- Environment and Public Health
- Fire Emergencies
- Flood and Water Disaster
- Structural and Infrastructure Hazard
- Electrical Hazard
- Disaster and Rescue

## Dataset Format

For Hugging Face image classification, publish a dataset with:

- `image`: image column
- `label`: one of the labels above

Example record:

[civic-image-record.example.json](/C:/Users/Praveen/Documents/New%20project/civic-platform/ai/schemas/civic-image-record.example.json)

## Training Recommendation

Start with image classification:

- Model: `timm/mobilenetv3_small_100.lamb_in1k` for fast iteration
- Upgrade: `timm/resnet50.a1_in1k` or `timm/vit_base_patch16_dinov3.lvd1689m` for better accuracy
- Target metric: validation accuracy and per-class recall
- Minimum data target: 300 to 500 images per label for a useful first model
- Better data target: 1,000+ images per label with different lighting, angles, weather, and phones

For localization such as detecting a pothole box inside the image, move to object detection later with D-FINE or RT-DETR.

## Deployment Path

1. Collect and label civic images from real reports.
2. Upload the dataset to Hugging Face Hub.
3. Validate the dataset format before training.
4. Fine-tune an image classifier using Hugging Face Jobs.
5. Push the trained model to the Hub.
6. Add a backend inference endpoint that calls the trained model and returns:
   - predicted domain
   - confidence
   - top 3 alternatives
   - model version
7. Keep the operator override flow because image models can be wrong.

## Important Note

Do not rely only on image classification. The best production result should combine:

- image prediction
- text/voice description
- issue domain chosen by the citizen
- geo-location and ward
- nearby duplicate complaints
- operator override
