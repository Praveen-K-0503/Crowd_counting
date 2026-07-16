import streamlit as st

def render_alert(current_unique_count, threshold):
    # Safety Check: If threshold is 0 somehow to avoid div zero error
    if threshold <= 0:
        threshold = 1
        
    ratio = current_unique_count / threshold
    if ratio >= 1.0:
        st.error(f"🔴 CRITICAL ALERT: Venue Capacity Exceeded! ({current_unique_count:,} / {threshold:,})")
    elif ratio >= 0.85:
        st.warning(f"🟠 WARNING: Venue Capacity Nearing Limit! ({current_unique_count:,} / {threshold:,})")
    elif ratio >= 0.70:
        st.info(f"🟡 ADVISORY: Venue Filling Up. ({current_unique_count:,} / {threshold:,})")
    else:
        st.success(f"🟢 Venue Status Normal. ({current_unique_count:,} / {threshold:,})")
