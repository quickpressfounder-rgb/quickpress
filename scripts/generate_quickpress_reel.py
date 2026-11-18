import os
import sys
import math
import subprocess
import asyncio
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg
import edge_tts

# -------------------------------------------------------------
# Configuration & Specifications
# -------------------------------------------------------------
W, H = 1080, 1920
FPS = 30
OUTPUT_DIR = "output"
FINAL_VIDEO = os.path.join(OUTPUT_DIR, "quickpress_promo_reel.mp4")

# Theme Palette: Modern Vibrant Yellow Theme with Deep Green & White Text
BG_YELLOW_TOP = (255, 226, 77)      # Vibrant Sunny Yellow (#FFE24D)
BG_YELLOW_BOTTOM = (245, 185, 20)   # Deep Golden Yellow (#F5B914)
GREEN_DARK = (10, 80, 48)           # Deep QuickPress Emerald (#0A5030)
GREEN_ACCENT = (16, 140, 75)        # Vibrant Green (#108C4B)
GREEN_MINT = (228, 248, 236)        # Soft Mint Green (#E4F8EC)
WHITE = (255, 255, 255)
WHITE_TRANSLUCENT = (255, 255, 255, 45)
BLACK_TEXT = (25, 30, 25)
RED_ACCENT = (210, 30, 30)

# Real User Credentials
INSTAGRAM_FOUNDER = "@unfiltered_himanshu_._"
INSTAGRAM_OFFICIAL = "@with.quickpress"

# System Fonts
FONT_VARSITY = "/System/Library/Fonts/Supplemental/Impact.ttf"
FONT_SANS_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_SANS_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_HINDI_FALLBACK = "/Library/Fonts/Arial Unicode.ttf"

font_title = ImageFont.truetype(FONT_VARSITY, 106)
font_title_large = ImageFont.truetype(FONT_VARSITY, 128)
font_hinglish_lg = ImageFont.truetype(FONT_SANS_BLACK, 44)
font_hinglish_md = ImageFont.truetype(FONT_SANS_BOLD, 36)
font_hinglish_sm = ImageFont.truetype(FONT_SANS_BOLD, 28)
font_badge = ImageFont.truetype(FONT_SANS_BLACK, 32)
font_meta = ImageFont.truetype(FONT_SANS_BOLD, 26)

# -------------------------------------------------------------
# Physics-Based Easing Functions
# -------------------------------------------------------------
def ease_out_back(x, c1=1.70158):
    """Elastic overshoot bounce easing."""
    c3 = c1 + 1
    return 1 + c3 * math.pow(x - 1, 3) + c1 * math.pow(x - 1, 2)

def ease_out_cubic(x):
    """Smooth cubic deceleration."""
    return 1 - math.pow(1 - x, 3)

def ease_in_out_sine(x):
    return -(math.cos(math.pi * x) - 1) / 2

# -------------------------------------------------------------
# Motion Graphic Background with Rotating Sunburst & Floating Orbs
# -------------------------------------------------------------
def create_base_yellow_gradient():
    bg = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(bg)
    for y in range(H):
        r_val = y / H
        r = int(BG_YELLOW_TOP[0] + (BG_YELLOW_BOTTOM[0] - BG_YELLOW_TOP[0]) * r_val)
        g = int(BG_YELLOW_TOP[1] + (BG_YELLOW_BOTTOM[1] - BG_YELLOW_TOP[1]) * r_val)
        b = int(BG_YELLOW_TOP[2] + (BG_YELLOW_BOTTOM[2] - BG_YELLOW_TOP[2]) * r_val)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    return bg

BASE_YELLOW_BG = create_base_yellow_gradient()

def draw_motion_background(t, center_y=860):
    """Renders a dynamic yellow motion graphic canvas with rotating rays and floating particles."""
    frame = BASE_YELLOW_BG.copy()
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    
    # Rotating Sunburst Motion Graphics (16 translucent rays)
    cx, cy = W // 2, center_y
    base_angle = (t * 8.0) % 360
    max_len = 1200
    for i in range(16):
        a1 = math.radians(base_angle + i * 22.5)
        a2 = math.radians(base_angle + i * 22.5 + 10.0)
        p1 = (cx, cy)
        p2 = (cx + max_len * math.cos(a1), cy + max_len * math.sin(a1))
        p3 = (cx + max_len * math.cos(a2), cy + max_len * math.sin(a2))
        odraw.polygon([p1, p2, p3], fill=(255, 255, 255, 22))
    
    # Floating Animated Orbs & Particles
    particles = [
        (160, 420, 65, 1.2),
        (920, 560, 45, 0.9),
        (120, 1420, 75, 1.4),
        (940, 1380, 55, 1.1),
        (220, 980, 38, 0.8),
        (880, 920, 42, 1.3),
    ]
    for px, py, radius, speed in particles:
        oy = int(py - (t * 40 * speed)) % 1800
        ox = int(px + math.sin(t * speed + px) * 20)
        odraw.ellipse([ox - radius, oy - radius, ox + radius, oy + radius], fill=(255, 255, 255, 36))
        sp_size = 14
        odraw.line([(ox - sp_size, oy), (ox + sp_size, oy)], fill=(255, 255, 255, 90), width=3)
        odraw.line([(ox, oy - sp_size), (ox, oy + sp_size)], fill=(255, 255, 255, 90), width=3)
    
    frame.paste(overlay, (0, 0), overlay)
    return frame

# -------------------------------------------------------------
# Asset Preparation: High-Definition Rounded Real Image Cards
# -------------------------------------------------------------
def prepare_real_image_card(img_path, target_w=680, target_h=680, corner_r=38, border_color=WHITE, border_w=8):
    """Loads a real photograph, adds rounded corners, crisp high-contrast border, and depth drop shadow."""
    if not os.path.exists(img_path):
        card = Image.new("RGB", (target_w, target_h), (240, 240, 240))
    else:
        src = Image.open(img_path).convert("RGBA")
        # Center-crop or fit preserving aspect
        sw, sh = src.size
        crop_dim = min(sw, sh)
        left = (sw - crop_dim) // 2
        top = (sh - crop_dim) // 2
        src_cropped = src.crop((left, top, left + crop_dim, top + crop_dim))
        card_raw = src_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
        card = card_raw.convert("RGB")
    
    # Mask
    mask = Image.new("L", (target_w, target_h), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, target_w, target_h], radius=corner_r, fill=255)
    
    # Base RGBA
    card_rgba = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    card_rgba.paste(card, (0, 0), mask)
    
    # Border
    bdraw = ImageDraw.Draw(card_rgba)
    bdraw.rounded_rectangle([0, 0, target_w, target_h], radius=corner_r, outline=border_color, width=border_w)
    
    # Depth Shadow
    pad = 55
    sw_c, sh_c = target_w + pad * 2, target_h + pad * 2
    shadow_img = Image.new("RGBA", (sw_c, sh_c), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_img)
    # Double layered shadow for photorealistic realism
    sdraw.rounded_rectangle([pad + 6, pad + 24, pad + target_w - 6, pad + target_h + 36], radius=corner_r + 6, fill=(15, 35, 20, 85))
    sdraw.rounded_rectangle([pad + 2, pad + 12, pad + target_w - 2, pad + target_h + 18], radius=corner_r + 2, fill=(15, 35, 20, 45))
    shadow_blurred = shadow_img.filter(ImageFilter.GaussianBlur(24))
    
    shadow_blurred.paste(card_rgba, (pad, pad), card_rgba)
    return shadow_blurred, target_w, target_h, pad

def draw_pill(draw, x, y, text, font, bg_color, text_color, px=34, py=14, radius=24, outline=None, outline_w=3):
    """Draws a modern rounded pill badge with centered typography."""
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    w = tw + px * 2
    h = th + py * 2
    left = x - w // 2
    top = y - h // 2
    draw.rounded_rectangle([left, top, left + w, top + h], radius=radius, fill=bg_color, outline=outline, width=outline_w)
    draw.text((x, y - 2), text, font=font, fill=text_color, anchor="mm")
    return w, h

def draw_3d_title(draw, text, x, y, font, fill_color=WHITE, shadow_color=GREEN_DARK, depth=7):
    """Draws bold collegiate varsity typography with deep 3D block extrusion for maximum pop."""
    # 3D block shadow
    for d in range(depth, 0, -1):
        draw.text((x + d, y + d), text, font=font, fill=shadow_color, anchor="mm")
    # Front fill
    draw.text((x, y), text, font=font, fill=fill_color, anchor="mm")

# -------------------------------------------------------------
# Audio Pipeline: Pan-India Hinglish Voiceover
# -------------------------------------------------------------
async def ensure_pan_india_audio():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    full_audio = os.path.join(OUTPUT_DIR, "pan_india_narration.mp3")
    existing_full = os.path.join(OUTPUT_DIR, "full_narration.mp3")
    
    if os.path.exists(existing_full) and not os.path.exists(full_audio):
        import shutil
        shutil.copy(existing_full, full_audio)
        print("Using existing pan-India audio:", full_audio)
        return
    elif os.path.exists(full_audio):
        print("Using existing pan-India audio:", full_audio)
        return
        print("Generating Pan-India neural voice audio clips...")
        for name, text in scenes:
            path = os.path.join(OUTPUT_DIR, f"{name}.mp3")
            comm = edge_tts.Communicate(text, "hi-IN-MadhurNeural", rate="+14%")
            await comm.save(path)
            
        with open(concat_list, "w") as f:
            for name, _ in scenes:
                f.write(f"file {name}.mp3\n")
        
        subprocess.run([
            ffmpeg_exe, "-y", "-f", "concat", "-safe", "0",
            "-i", concat_list, "-c", "copy", full_audio
        ], check=True)
        print("Concatenated Pan-India narration audio created!")
    else:
        print("Reusing existing audio files.")

# -------------------------------------------------------------
# Main Video Renderer
# -------------------------------------------------------------
def render_reel():
    print("--- Starting QuickPress Pan-India Animated Reel Rendering ---")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    # Load Real Photographic Assets
    print("Loading real photography assets...")
    card_suit, _, _, _ = prepare_real_image_card(
        "customer-frontend/src/shared/assets/item-dry-clean.jpg", 680, 680, border_color=WHITE
    )
    card_jacket, _, _, _ = prepare_real_image_card(
        "customer-frontend/src/shared/assets/item-blanket.jpg", 680, 680, border_color=WHITE
    )
    card_wash, _, _, _ = prepare_real_image_card(
        "customer-frontend/src/shared/assets/item-wash-fold.jpg", 680, 680, border_color=(240, 240, 240)
    )
    card_courier, _, _, _ = prepare_real_image_card(
        "customer-frontend/public/images/courier-real.png", 680, 680, border_color=WHITE
    )
    
    # Brand Logo
    logo_path = "customer-frontend/public/quickpress-brand-logo-transparent.png"
    if not os.path.exists(logo_path):
        logo_path = "customer-frontend/public/quickpress-logo-transparent.png"
    logo_img = None
    if os.path.exists(logo_path):
        raw_logo = Image.open(logo_path).convert("RGBA")
        lw = 340
        lh = int(raw_logo.size[1] * (lw / raw_logo.size[0]))
        logo_img = raw_logo.resize((lw, lh), Image.Resampling.LANCZOS)
    
    # Timestamps (Pan-India speech sync)
    # Total duration = ~22.48s
    total_duration = 22.48
    total_frames = int(total_duration * FPS)
    print(f"Total Video Length: {total_duration:.2f}s ({total_frames} frames @ {FPS} fps)")
    
    audio_path = os.path.join(OUTPUT_DIR, "pan_india_narration.mp3")
    if not os.path.exists(audio_path):
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
        "-crf", "19",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        FINAL_VIDEO
    ]
    
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    
    try:
        for f in range(total_frames):
            t = f / FPS
            
            # Dynamic Motion Graphic Canvas (Animated rays & drifting particles)
            frame = draw_motion_background(t, center_y=860)
            draw = ImageDraw.Draw(frame)
            
            # ---------------------------------------------------------
            # Top National Branding Header (White & Green on Yellow)
            # ---------------------------------------------------------
            # Pill: "QUICKPRESS • INDIA'S #1 LAUNDRY APP"
            draw_pill(
                draw, W // 2, 95,
                "QUICKPRESS  •  INDIA'S #1 LAUNDRY APP",
                font_meta,
                bg_color=GREEN_DARK,
                text_color=WHITE,
                px=36, py=12, radius=22,
                outline=WHITE, outline_w=2
            )
            
            # Bottom Pan-India Delivery Meta
            draw.text(
                (W // 2, H - 75),
                "WITHQUICKPRESS.COM  •  15-MIN PICKUP ACROSS INDIA",
                font=font_meta, fill=GREEN_DARK, anchor="mm"
            )
            
            # ---------------------------------------------------------
            # SCENE 1: SUITS & BLAZERS (0.00s -> 4.39s)
            # ---------------------------------------------------------
            if t < 4.39:
                st = t
                # Real Entrance Animation: Bounce & Scale
                progress = min(1.0, st / 0.5)
                scale_anim = 0.7 + 0.3 * ease_out_back(progress)
                y_slide = (1.0 - ease_out_cubic(progress)) * 140
                
                # Floating hover after landing
                float_y = math.sin(st * 3.2) * 10
                base_card_y = 540 + y_slide + float_y
                
                # Title with 3D White on Green effect
                draw_3d_title(draw, "SUITS & BLAZERS", W // 2, 280, font_title, fill_color=WHITE, shadow_color=GREEN_DARK, depth=8)
                
                # Scale real card
                cw = int(card_suit.size[0] * scale_anim)
                ch = int(card_suit.size[1] * scale_anim)
                if scale_anim < 0.99:
                    scaled_card = card_suit.resize((cw, ch), Image.Resampling.BILINEAR)
                else:
                    scaled_card = card_suit
                card_x = (W - scaled_card.size[0]) // 2
                frame.paste(scaled_card, (card_x, int(base_card_y)), scaled_card)
                
                # Subtitle & Badges in White & Green
                draw_pill(draw, W // 2 - 195, 1370, "Zero Shrinkage", font_badge, bg_color=GREEN_DARK, text_color=WHITE)
                draw_pill(draw, W // 2 + 195, 1370, "Italian Clean", font_badge, bg_color=WHITE, text_color=GREEN_DARK, outline=GREEN_DARK)
                draw_pill(draw, W // 2, 1450, "Doorstep Pickup Across India", font_badge, bg_color=GREEN_DARK, text_color=WHITE)
                
                # Hinglish Subtitle
                draw.text((W // 2, 1610), "Mehnge Suits Aur Blazers?", font=font_hinglish_lg, fill=GREEN_DARK, anchor="mm")
            
            # ---------------------------------------------------------
            # SCENE 2: WINTER JACKETS (4.39s -> 7.46s)
            # ---------------------------------------------------------
            elif t < 7.46:
                st = t - 4.39
                progress = min(1.0, st / 0.5)
                scale_anim = 0.7 + 0.3 * ease_out_back(progress)
                y_slide = (1.0 - ease_out_cubic(progress)) * 140
                float_y = math.sin(st * 3.2) * 10
                base_card_y = 540 + y_slide + float_y
                
                draw_3d_title(draw, "WINTER JACKETS", W // 2, 280, font_title, fill_color=WHITE, shadow_color=GREEN_DARK, depth=8)
                
                cw = int(card_jacket.size[0] * scale_anim)
                ch = int(card_jacket.size[1] * scale_anim)
                scaled_card = card_jacket.resize((cw, ch), Image.Resampling.BILINEAR) if scale_anim < 0.99 else card_jacket
                card_x = (W - scaled_card.size[0]) // 2
                frame.paste(scaled_card, (card_x, int(base_card_y)), scaled_card)
                
                draw_pill(draw, W // 2 - 195, 1370, "Leather & Suede", font_badge, bg_color=WHITE, text_color=GREEN_DARK, outline=GREEN_DARK)
                draw_pill(draw, W // 2 + 195, 1370, "Down Jackets", font_badge, bg_color=GREEN_DARK, text_color=WHITE)
                draw_pill(draw, W // 2, 1450, "Gentle Hydrocarbon Wash", font_badge, bg_color=GREEN_DARK, text_color=WHITE)
                
                draw.text((W // 2, 1610), "Winter Leather & Bomber Jackets?", font=font_hinglish_lg, fill=GREEN_DARK, anchor="mm")
            
            # ---------------------------------------------------------
            # SCENE 3: DON'T WASH AT HOME (7.46s -> 11.25s)
            # ---------------------------------------------------------
            elif t < 11.25:
                st = t - 7.46
                progress = min(1.0, st / 0.45)
                scale_anim = 0.7 + 0.3 * ease_out_back(progress)
                y_slide = (1.0 - ease_out_cubic(progress)) * 140
                float_y = math.sin(st * 3.6) * 8
                base_card_y = 540 + y_slide + float_y
                
                draw_3d_title(draw, "DON'T RUIN THEM!", W // 2, 280, font_title, fill_color=WHITE, shadow_color=RED_ACCENT, depth=8)
                
                cw = int(card_wash.size[0] * scale_anim)
                ch = int(card_wash.size[1] * scale_anim)
                scaled_card = card_wash.resize((cw, ch), Image.Resampling.BILINEAR) if scale_anim < 0.99 else card_wash
                card_x = (W - scaled_card.size[0]) // 2
                frame.paste(scaled_card, (card_x, int(base_card_y)), scaled_card)
                
                # High-Impact Warning Pills in White & Red/Green
                draw_pill(draw, W // 2, 1360, "❌ Normal Water Destroys Costly Wool", font_badge, bg_color=WHITE, text_color=RED_ACCENT, outline=RED_ACCENT, px=38)
                draw_pill(draw, W // 2, 1445, "❌ Collars & Linings Lose Original Shape", font_badge, bg_color=WHITE, text_color=RED_ACCENT, outline=RED_ACCENT, px=38)
                
                draw.text((W // 2, 1610), "Ghar Par Wash Karke Spoil Mat Karo!", font=font_hinglish_lg, fill=GREEN_DARK, anchor="mm")
            
            # ---------------------------------------------------------
            # SCENE 4: 15-MIN DOORSTEP PICKUP (11.25s -> 16.34s)
            # ---------------------------------------------------------
            elif t < 16.34:
                st = t - 11.25
                progress = min(1.0, st / 0.5)
                scale_anim = 0.7 + 0.3 * ease_out_back(progress)
                y_slide = (1.0 - ease_out_cubic(progress)) * 140
                float_y = math.sin(st * 3.2) * 10
                base_card_y = 540 + y_slide + float_y
                
                draw_3d_title(draw, "15-MIN PICKUP", W // 2, 280, font_title, fill_color=WHITE, shadow_color=GREEN_DARK, depth=8)
                
                cw = int(card_courier.size[0] * scale_anim)
                ch = int(card_courier.size[1] * scale_anim)
                scaled_card = card_courier.resize((cw, ch), Image.Resampling.BILINEAR) if scale_anim < 0.99 else card_courier
                card_x = (W - scaled_card.size[0]) // 2
                frame.paste(scaled_card, (card_x, int(base_card_y)), scaled_card)
                
                draw_pill(draw, W // 2 - 195, 1370, "⚡ 15-Min Pickup", font_badge, bg_color=GREEN_DARK, text_color=WHITE)
                draw_pill(draw, W // 2 + 195, 1370, "🔒 4-Way Secure OTP", font_badge, bg_color=WHITE, text_color=GREEN_DARK, outline=GREEN_DARK)
                draw_pill(draw, W // 2, 1450, "Available Pan-India", font_badge, bg_color=GREEN_DARK, text_color=WHITE)
                
                draw.text((W // 2, 1610), "QuickPress Dega Doorstep Italian Clean", font=font_hinglish_lg, fill=GREEN_DARK, anchor="mm")
            
            # ---------------------------------------------------------
            # SCENE 5: THE VIRAL CTA CLIMAX (16.34s -> 22.48s)
            # ---------------------------------------------------------
            else:
                st = t - 16.34
                
                # Sub-phase 1: Hook ("Aur Sabse Mazedaar Baat...")
                if st < 1.7:
                    anim_y = 780 + (1.0 - ease_out_cubic(min(1.0, st / 0.4))) * 80
                    draw_pill(draw, W // 2, int(anim_y - 80), "👀 LISTEN CLOSELY 👀", font_badge, bg_color=WHITE, text_color=GREEN_DARK, px=40)
                    draw.text((W // 2, int(anim_y + 20)), "Aur Sabse Mazedaar Baat...", font=font_hinglish_lg, fill=GREEN_DARK, anchor="mm")
                
                # Sub-phase 2: Pan-India Launch Offer (1.7s -> 3.4s)
                elif st < 3.4:
                    draw_pill(draw, W // 2, 540, "🇮🇳 PAN-INDIA LAUNCH OFFER 🇮🇳", font_badge, bg_color=WHITE, text_color=GREEN_DARK, px=45, py=16, outline=GREEN_DARK)
                    draw_3d_title(draw, "FLAT 20% OFF", W // 2, 700, font_title_large, fill_color=WHITE, shadow_color=GREEN_DARK, depth=10)
                    draw.text((W // 2, 840), "On Your First Doorstep Laundry Order!", font=font_hinglish_lg, fill=GREEN_DARK, anchor="mm")
                    draw_pill(draw, W // 2, 940, "Valid Across All Indian Cities", font_badge, bg_color=GREEN_DARK, text_color=WHITE)
                
                # Sub-phase 3: Real Instagram Profile + Giant Pulsing CTA
                else:
                    cta_st = st - 3.4
                    pulse = math.sin(cta_st * 6.5) * 12
                    
                    # Instagram Follow Header
                    draw.text((W // 2, 490), "Discounts & Free Pickups Ke Liye:", font=font_hinglish_md, fill=GREEN_DARK, anchor="mm")
                    
                    # Real Instagram Profile Card (White & Green Card)
                    card_w, card_h = 760, 200
                    cx_left = (W - card_w) // 2
                    cy_top = 540
                    draw.rounded_rectangle([cx_left, cy_top, cx_left + card_w, cy_top + card_h], radius=32, fill=WHITE, outline=GREEN_DARK, width=5)
                    
                    # Profile Details
                    draw.text((W // 2, cy_top + 48), f"Follow {INSTAGRAM_FOUNDER}  ✓", font=font_hinglish_lg, fill=GREEN_DARK, anchor="mm")
                    draw.text((W // 2, cy_top + 104), f"Official: {INSTAGRAM_OFFICIAL}", font=font_hinglish_md, fill=GREEN_ACCENT, anchor="mm")
                    draw.text((W // 2, cy_top + 155), "Tap Follow & Check DM Immediately!", font=font_hinglish_sm, fill=(80, 100, 85), anchor="mm")
                    
                    # Call to Action Label
                    draw.text((W // 2, 800), "Aur Abhi Niche Comment Karo:", font=font_hinglish_lg, fill=GREEN_DARK, anchor="mm")
                    
                    # Giant Pulsing Dark Green CTA Box with White 3D Text
                    box_w = int(820 + pulse)
                    box_h = int(180 + pulse * 0.4)
                    bx = (W - box_w) // 2
                    by = 860
                    draw.rounded_rectangle([bx, by, bx + box_w, by + box_h], radius=38, fill=GREEN_DARK, outline=WHITE, width=6)
                    draw.text((W // 2, by + box_h // 2 - 4), "COMMENT \"CLEAN\"", font=font_title, fill=WHITE, anchor="mm")
                    
                    # Rotating Sparkle Accents around CTA Box
                    for i in range(6):
                        sp_angle = cta_st * 3.0 + i * (math.pi / 3)
                        sp_x = W // 2 + (box_w // 2 + 55) * math.cos(sp_angle)
                        sp_y = (by + box_h // 2) + (box_h // 2 + 45) * math.sin(sp_angle)
                        draw.line([(sp_x - 12, sp_y), (sp_x + 12, sp_y)], fill=WHITE, width=4)
                        draw.line([(sp_x, sp_y - 12), (sp_x, sp_y + 12)], fill=WHITE, width=4)
                    
                    # Explanatory helper in Hinglish
                    draw.text((W // 2, 1140), "👇 Comment 'CLEAN' in comments", font=font_hinglish_lg, fill=GREEN_DARK, anchor="mm")
                    draw.text((W // 2, 1220), "20% OFF Coupon Code will be sent to your DM instantly!", font=font_hinglish_sm, fill=GREEN_DARK, anchor="mm")
            
            # Pipe frame directly to ffmpeg
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
        
    print("\n✅ Upgraded Reel rendering complete!")
    print(f"Saved to: {FINAL_VIDEO}")
    file_size_mb = os.path.getsize(FINAL_VIDEO) / (1024 * 1024)
    print(f"File Size: {file_size_mb:.2f} MB")

if __name__ == "__main__":
    asyncio.run(ensure_pan_india_audio())
    render_reel()
