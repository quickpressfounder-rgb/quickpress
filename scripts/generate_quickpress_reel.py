import os
import sys
import math
import subprocess
import asyncio
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg
import edge_tts

# Configuration
W, H = 1080, 1920
FPS = 30
OUTPUT_DIR = "output"
FINAL_VIDEO = os.path.join(OUTPUT_DIR, "quickpress_promo_reel.mp4")

# Color Palette (Minimalist Luxury Aesthetic like @linen_alchemy)
BG_TOP = (248, 244, 237)      # Warm Cream
BG_BOTTOM = (231, 221, 208)   # Sand / Muted Khaki
TEXT_RED = (196, 24, 24)      # Bold Crimson Red Varsity
TEXT_DARK = (34, 34, 34)      # Charcoal Black
TEXT_MUTED = (120, 110, 100)  # Muted Taupe
BRAND_GREEN = (22, 120, 75)   # QuickPress Emerald Green
WHITE = (255, 255, 255)
GOLD = (212, 160, 23)

# Fonts
FONT_VARSITY = "/System/Library/Fonts/Supplemental/Impact.ttf"
FONT_SANS_BOLD = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_HINDI = "/Library/Fonts/Arial Unicode.ttf"

font_title = ImageFont.truetype(FONT_VARSITY, 104)
font_title_large = ImageFont.truetype(FONT_VARSITY, 124)
font_hindi_lg = ImageFont.truetype(FONT_HINDI, 46)
font_hindi_sm = ImageFont.truetype(FONT_HINDI, 36)
font_badge = ImageFont.truetype(FONT_SANS_BOLD, 32)
font_meta = ImageFont.truetype(FONT_SANS_BOLD, 26)

def create_base_background():
    """Pre-generates a smooth 1080x1920 warm luxury gradient with vignette."""
    bg = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(bg)
    for y in range(H):
        ratio = y / H
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * ratio)
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * ratio)
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * ratio)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    
    # Add subtle corner vignettes
    vignette = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vignette)
    cx, cy = W // 2, H // 2
    max_radius = math.hypot(cx, cy)
    # 4 soft corner patches
    for radius in range(int(max_radius * 0.7), int(max_radius), 20):
        alpha = int(((radius - max_radius * 0.7) / (max_radius * 0.3)) * 35)
        vdraw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], outline=(60, 50, 40, alpha), width=22)
    
    bg.paste(vignette, (0, 0), vignette)
    return bg

def make_rounded_card_with_shadow(img_path, target_w=640, target_h=640, corner_r=36):
    """Loads an image, applies rounded corners, and creates a realistic drop shadow."""
    if not os.path.exists(img_path):
        card = Image.new("RGB", (target_w, target_h), (220, 220, 220))
    else:
        src = Image.open(img_path).convert("RGB")
        src_w, src_h = src.size
        # Center crop to target aspect ratio
        crop_size = min(src_w, src_h)
        left = (src_w - crop_size) // 2
        top = (src_h - crop_size) // 2
        src = src.crop((left, top, left + crop_size, top + crop_size))
        card = src.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Rounded mask
    mask = Image.new("L", (target_w, target_h), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, target_w, target_h], radius=corner_r, fill=255)
    
    # Card with alpha
    card_rgba = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    card_rgba.paste(card, (0, 0), mask)
    
    # Border
    bdraw = ImageDraw.Draw(card_rgba)
    bdraw.rounded_rectangle([0, 0, target_w, target_h], radius=corner_r, outline=(255, 255, 255, 180), width=6)
    
    # Shadow canvas (slightly larger)
    pad = 60
    sw, sh = target_w + pad * 2, target_h + pad * 2
    shadow_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_img)
    # Dark shadow oval/box
    sdraw.rounded_rectangle([pad + 5, pad + 25, pad + target_w - 5, pad + target_h + 35], radius=corner_r + 10, fill=(40, 35, 30, 80))
    shadow_blurred = shadow_img.filter(ImageFilter.GaussianBlur(28))
    
    # Paste card onto shadow
    shadow_blurred.paste(card_rgba, (pad, pad), card_rgba)
    return shadow_blurred, target_w, target_h, pad

def draw_pill(draw, x, y, text, font, bg_color, text_color, px=32, py=14, radius=24):
    """Draws a stylish rounded pill badge with centered text."""
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    w = tw + px * 2
    h = th + py * 2
    left = x - w // 2
    top = y - h // 2
    draw.rounded_rectangle([left, top, left + w, top + h], radius=radius, fill=bg_color)
    draw.text((x, y - 2), text, font=font, fill=text_color, anchor="mm")
    return w, h

async def ensure_audio_assets():
    """Generates the speech audio segments if missing."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    full_audio = os.path.join(OUTPUT_DIR, "full_narration.mp3")
    if os.path.exists(full_audio):
        print("Using existing concatenated narration:", full_audio)
        return
    
    scenes = [
        ("scene1", "अगर आपके पास भी महंगे सूट्स और ब्लेज़र्स हैं"),
        ("scene2", "या विंटर लेदर और बॉम्बर जैकेट्स"),
        ("scene3", "तो इन्हें घर पर पानी में धोकर बर्बाद मत करो"),
        ("scene4", "क्विकप्रेस देगा प्रीमियम इटैलियन ड्राई क्लीनिंग पंद्रह मिनट पिकअप के साथ"),
        ("scene5", "और सबसे मजेदार बात, बीस परसेंट ऑफ पाने के लिए मुझे फॉलो करके कमेंट करो CLEAN!")
    ]
    for name, text in scenes:
        path = os.path.join(OUTPUT_DIR, f"{name}.mp3")
        comm = edge_tts.Communicate(text, "hi-IN-MadhurNeural", rate="+12%")
        await comm.save(path)
    
    concat_list = os.path.join(OUTPUT_DIR, "concat_list.txt")
    with open(concat_list, "w") as f:
        for i in range(1, 6):
            f.write(f"file scene{i}.mp3\n")
    
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([
        ffmpeg_exe, "-y", "-f", "concat", "-safe", "0",
        "-i", concat_list, "-c", "copy", full_audio
    ], check=True)
    print("Generated full narration audio at:", full_audio)

def render_reel():
    print("--- Starting QuickPress Automated Reel Rendering ---")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    base_bg = create_base_background()
    
    # Pre-render cards for scenes
    print("Preparing assets and shadows...")
    card_suit, c_w, c_h, c_pad = make_rounded_card_with_shadow("customer-frontend/src/shared/assets/item-dry-clean.jpg", 680, 680)
    card_jacket, _, _, _ = make_rounded_card_with_shadow("customer-frontend/src/shared/assets/item-blanket.jpg", 680, 680)
    card_wash, _, _, _ = make_rounded_card_with_shadow("customer-frontend/src/shared/assets/item-wash-fold.jpg", 680, 680)
    card_pickup, _, _, _ = make_rounded_card_with_shadow("customer-frontend/public/images/laundry-pickup.png", 720, 540)
    
    # Logo watermark
    logo_path = "customer-frontend/public/quickpress-brand-logo-transparent.png"
    if not os.path.exists(logo_path):
        logo_path = "customer-frontend/public/quickpress-logo-transparent.png"
    logo_img = None
    if os.path.exists(logo_path):
        raw_logo = Image.open(logo_path).convert("RGBA")
        lw = 320
        lh = int(raw_logo.size[1] * (lw / raw_logo.size[0]))
        logo_img = raw_logo.resize((lw, lh), Image.Resampling.LANCZOS)
    
    # Scene Timestamps (exact sync with speech audio)
    # Scene 1: 0.00s -> 4.39s (132 frames)
    # Scene 2: 4.39s -> 7.46s (92 frames)
    # Scene 3: 7.46s -> 11.25s (114 frames)
    # Scene 4: 11.25s -> 16.34s (153 frames)
    # Scene 5: 16.34s -> 22.48s (184 frames)
    total_duration = 22.48
    total_frames = int(total_duration * FPS) # ~675 frames
    print(f"Total Video Length: {total_duration:.2f}s ({total_frames} frames @ {FPS} fps)")
    
    # Start ffmpeg pipe
    audio_path = os.path.join(OUTPUT_DIR, "full_narration.mp3")
    cmd = [
        ffmpeg_exe, "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{W}x{H}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",               # pipe stdin
        "-i", audio_path,        # audio file
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        FINAL_VIDEO
    ]
    
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    
    try:
        for f in range(total_frames):
            t = f / FPS
            frame = base_bg.copy()
            draw = ImageDraw.Draw(frame)
            
            # 1. Header & Brand Watermark (Present throughout)
            if logo_img:
                frame.paste(logo_img, ((W - logo_img.size[0]) // 2, 100), logo_img)
            else:
                draw.text((W // 2, 120), "QUICKPRESS", font=font_title, fill=BRAND_GREEN, anchor="mm")
            
            # Bottom watermark
            draw.text((W // 2, H - 90), "QUICKPRESS.IN  •  KASGANJ HUB  •  15-MIN PICKUP", font=font_meta, fill=TEXT_MUTED, anchor="mm")
            
            # ----------------------------------------------------
            # SCENE 1: SUITS & BLAZERS (0.00s -> 4.39s)
            # ----------------------------------------------------
            if t < 4.39:
                local_t = t
                # Animation: slight float & scale in
                float_offset = math.sin(local_t * 3.5) * 12
                card_y = int(580 + float_offset)
                
                # Title
                draw.text((W // 2, 340), "SUITS & BLAZERS", font=font_title, fill=TEXT_RED, anchor="mm")
                
                # Card
                card_x = (W - card_suit.size[0]) // 2
                frame.paste(card_suit, (card_x, card_y), card_suit)
                
                # Badges
                draw_pill(draw, W // 2 - 190, 1370, "Zero Shrinkage", font_badge, (235, 245, 238), BRAND_GREEN)
                draw_pill(draw, W // 2 + 190, 1370, "Italian Clean", font_badge, (253, 242, 242), TEXT_RED)
                draw_pill(draw, W // 2, 1450, "₹120 Dry Clean Only", font_badge, (244, 244, 244), TEXT_DARK)
                
                # Hindi Subtitle Hook
                draw.text((W // 2, 1620), "महंगे सूट्स और ब्लेज़र्स", font=font_hindi_lg, fill=TEXT_DARK, anchor="mm")
            
            # ----------------------------------------------------
            # SCENE 2: WINTER JACKETS (4.39s -> 7.46s)
            # ----------------------------------------------------
            elif t < 7.46:
                local_t = t - 4.39
                float_offset = math.sin(local_t * 3.5) * 12
                card_y = int(580 + float_offset)
                
                draw.text((W // 2, 340), "WINTER JACKETS", font=font_title, fill=TEXT_RED, anchor="mm")
                
                card_x = (W - card_jacket.size[0]) // 2
                frame.paste(card_jacket, (card_x, card_y), card_jacket)
                
                draw_pill(draw, W // 2 - 180, 1370, "Leather & Suede", font_badge, (253, 242, 242), TEXT_RED)
                draw_pill(draw, W // 2 + 180, 1370, "Down Bombers", font_badge, (235, 245, 238), BRAND_GREEN)
                draw_pill(draw, W // 2, 1450, "Gentle Hydrocarbon Wash", font_badge, (244, 244, 244), TEXT_DARK)
                
                draw.text((W // 2, 1620), "विंटर लेदर और बॉम्बर जैकेट्स", font=font_hindi_lg, fill=TEXT_DARK, anchor="mm")
            
            # ----------------------------------------------------
            # SCENE 3: DON'T WASH AT HOME (7.46s -> 11.25s)
            # ----------------------------------------------------
            elif t < 11.25:
                local_t = t - 7.46
                float_offset = math.sin(local_t * 4.0) * 8
                card_y = int(580 + float_offset)
                
                draw.text((W // 2, 340), "DON'T RUIN THEM!", font=font_title, fill=TEXT_RED, anchor="mm")
                
                card_x = (W - card_wash.size[0]) // 2
                frame.paste(card_wash, (card_x, card_y), card_wash)
                
                # Warning Overlays
                draw_pill(draw, W // 2, 1360, "❌ Normal Water Destroys Fabric", font_badge, (254, 226, 226), (185, 28, 28), px=40)
                draw_pill(draw, W // 2, 1440, "❌ Lining Shrinks & Fades Color", font_badge, (254, 226, 226), (185, 28, 28), px=40)
                
                draw.text((W // 2, 1620), "घर पर पानी में धोकर बर्बाद मत करो!", font=font_hindi_lg, fill=TEXT_RED, anchor="mm")
            
            # ----------------------------------------------------
            # SCENE 4: 15-MIN PICKUP (11.25s -> 16.34s)
            # ----------------------------------------------------
            elif t < 16.34:
                local_t = t - 11.25
                float_offset = math.sin(local_t * 3.5) * 10
                card_y = int(620 + float_offset)
                
                draw.text((W // 2, 340), "15-MIN PICKUP", font=font_title, fill=BRAND_GREEN, anchor="mm")
                
                card_x = (W - card_pickup.size[0]) // 2
                frame.paste(card_pickup, (card_x, card_y), card_pickup)
                
                draw_pill(draw, W // 2 - 180, 1360, "⚡ 15-Min Pickup", font_badge, (235, 245, 238), BRAND_GREEN)
                draw_pill(draw, W // 2 + 180, 1360, "🔒 4-Way OTP", font_badge, (253, 242, 242), TEXT_RED)
                draw_pill(draw, W // 2, 1440, "Soron Gate, Kasganj Hub", font_badge, (244, 244, 244), TEXT_DARK)
                
                draw.text((W // 2, 1620), "क्विकप्रेस देगा प्रीमियम इटैलियन ड्राई क्लीनिंग", font=font_hindi_lg, fill=TEXT_DARK, anchor="mm")
            
            # ----------------------------------------------------
            # SCENE 5: THE VIRAL CTA CLIMAX (16.34s -> 22.48s)
            # ----------------------------------------------------
            else:
                local_t = t - 16.34
                
                # Phase 1: Aur sabse majedaar baat (16.34s -> 18.0s)
                if local_t < 1.66:
                    draw.text((W // 2, 700), "और सबसे मजेदार बात...", font=font_hindi_lg, fill=TEXT_DARK, anchor="mm")
                
                # Phase 2: Launch Offer (18.0s -> 19.8s)
                elif local_t < 3.46:
                    draw_pill(draw, W // 2, 600, "🔥 KASGANJ LAUNCH OFFER 🔥", font_badge, (254, 243, 199), (180, 83, 9), px=40, py=18)
                    draw.text((W // 2, 760), "FLAT 20% OFF", font=font_title_large, fill=BRAND_GREEN, anchor="mm")
                    draw.text((W // 2, 880), "पहले 100 ऑर्डर्स पर!", font=font_hindi_lg, fill=TEXT_DARK, anchor="mm")
                
                # Phase 3: The Viral Comment Trigger (19.8s -> 22.48s)
                else:
                    pulse = math.sin((local_t - 3.46) * 8.0) * 10
                    draw.text((W // 2, 540), "डिस्काउंट कूपन पाने के लिए:", font=font_hindi_sm, fill=TEXT_MUTED, anchor="mm")
                    draw.text((W // 2, 640), "Follow @quickpress.in", font=font_badge, fill=TEXT_DARK, anchor="mm")
                    draw.text((W // 2, 730), "और नीचे कमेंट करो:", font=font_hindi_lg, fill=TEXT_DARK, anchor="mm")
                    
                    # Giant Crimson Pulsing Box
                    box_w = int(760 + pulse)
                    box_h = int(170 + pulse * 0.4)
                    bx = (W - box_w) // 2
                    by = 880
                    draw.rounded_rectangle([bx, by, bx + box_w, by + box_h], radius=32, fill=TEXT_RED)
                    draw.text((W // 2, by + box_h // 2 - 4), "COMMENT \"CLEAN\"", font=font_title, fill=WHITE, anchor="mm")
                    
                    # Explanatory helper
                    draw.text((W // 2, 1160), "👇 कमेंट में 'CLEAN' लिखो", font=font_hindi_lg, fill=TEXT_RED, anchor="mm")
                    draw.text((W // 2, 1240), "कूपन कोड और ऐप लिंक आपके DM में आ जाएगा!", font=font_hindi_sm, fill=TEXT_MUTED, anchor="mm")
            
            # Write raw frame to ffmpeg pipe
            proc.stdin.write(frame.tobytes())
            
            if f % 90 == 0 or f == total_frames - 1:
                pct = int((f / total_frames) * 100)
                print(f"Rendering: {pct}% complete (Frame {f}/{total_frames} @ {t:.1f}s)")
                
    except Exception as e:
        print("Rendering error:", e)
        proc.kill()
        raise e
    finally:
        proc.stdin.close()
        proc.wait()
        
    print("\n✅ Video rendering complete!")
    print(f"Saved to: {FINAL_VIDEO}")
    file_size_mb = os.path.getsize(FINAL_VIDEO) / (1024 * 1024)
    print(f"File Size: {file_size_mb:.2f} MB")

if __name__ == "__main__":
    asyncio.run(ensure_audio_assets())
    render_reel()
