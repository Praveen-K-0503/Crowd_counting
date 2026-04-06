# Frontend Plan

## Design principles

- Mobile-first
- Fast reporting with minimal taps
- High trust and high clarity
- Accessible contrast and readable typography
- Map-aware but not map-dependent

## Visual direction

### Colors

- Primary: `#0F4C81`
- Secondary: `#14B8A6`
- Accent: `#F59E0B`
- Success: `#16A34A`
- Danger: `#DC2626`
- Background: `#F8FAFC`
- Card: `#FFFFFF`
- Text: `#0F172A`
- Muted: `#64748B`

### Typography

- Headings: Poppins
- Body: Inter

### Motion

- 150ms to 250ms transitions
- Fade and slide for view entry
- Card hover lift
- Skeleton loading for pending data
- Soft pulse for active issue pins

## Main screens

### Public and citizen flow

1. Landing page
2. Report issue page
3. Location confirmation page
4. Complaint submitted success page
5. My complaints
6. Complaint detail and timeline
7. Public issue map
8. Emergency reporting page

### Operations flow

1. Admin dashboard
2. Complaint queue
3. Complaint detail
4. Assignment panel
5. Department analytics
6. Emergency queue

## Free resources

- Icons: Lucide
- Components: shadcn/ui
- Maps: OpenStreetMap
- Illustrations: unDraw and Storyset
- Photos: Pexels and Unsplash
- Motion assets: LottieFiles free set

## UX rules

- A complaint must be submittable in under 60 seconds
- Emergency reporting should be visible from every main page
- Status timeline must always be understandable without training
- Forms should support image-first reporting
- Provide clear upload feedback and error recovery

## Map and Heat Layer

- Use OpenStreetMap by default so the project remains free and works without a token.
- If `MAPBOX_TOKEN` or `NEXT_PUBLIC_MAPBOX_TOKEN` is configured, switch the public map tile layer to Mapbox streets tiles.
- Keep the hotspot layer data-driven: circle radius and opacity increase as the number of nearby complaints increases.
- Use stronger red/orange colors when emergency or very high-density clusters appear.
- Treat Mapbox 3D terrain as a future enhancement because the current map implementation is Leaflet-based; true 3D terrain would need Mapbox GL integration.
