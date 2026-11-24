import os
import subprocess
import json
import wave
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r"E:\hackathon"
FFMPEG = os.path.join(BASE_DIR, "server", "node_modules", "ffmpeg-static", "ffmpeg.exe")
CAPTURES_DIR = os.path.join(BASE_DIR, "demo_captures_extended")
WORK_DIR = os.path.join(BASE_DIR, "video_production_extended")
os.makedirs(WORK_DIR, exist_ok=True)

OUTPUT_MP4 = os.path.join(BASE_DIR, "changeflow_enterprise_demo_walkthrough.mp4")
ARTIFACT_MP4 = r"C:\Users\Jeeva\.gemini\antigravity\brain\25f83dcb-cb92-45cc-9fc7-9a7068af2905\changeflow_enterprise_demo_walkthrough.mp4"

SCENES = [
    {
        "frame": "frame_01.png",
        "title": "Act 1: Modern Landing Page & Platform Overview",
        "badge": "Landing Page • Public Entry",
        "script": "Welcome to ChangeFlow Enterprise, an integrated Industry 4.0 platform for 4M Change Management, capital expenditure, and procurement automation.",
        "callout": {
            "box": [260, 290, 1660, 560],
            "tag": "ENTERPRISE CORE",
            "label": "INDUSTRY 4.0 4M GOVERNANCE & MULTI-TIER REQUISITIONS",
            "color": (56, 189, 248) # sky
        }
    },
    {
        "frame": "frame_02.png",
        "title": "Act 1: 4M Change Governance & Industry Pillars",
        "badge": "Core Architecture",
        "script": "The platform is anchored on four pillars: Man, Machine, Material, and Method governance, standardizing modifications across the entire manufacturing lifecycle.",
        "callout": {
            "box": [260, 220, 1660, 780],
            "tag": "4M FRAMEWORK",
            "label": "MAN, MACHINE, MATERIAL & METHOD INDUSTRIAL CONTROL",
            "color": (52, 211, 153) # emerald
        }
    },
    {
        "frame": "frame_03.png",
        "title": "Act 1: CAPEX, Workflows & Procurement Engine",
        "badge": "Enterprise Automation",
        "script": "Equipped with automated financial modeling, discounted cash flow metrics, weighted vendor quotation scoring, and strict SLA escalation protocols.",
        "callout": {
            "box": [260, 200, 1660, 760],
            "tag": "FINANCIAL ENGINE",
            "label": "CAPEX MODELING, DISCOUNTED CASH FLOW & SLA ESCALATION",
            "color": (251, 191, 36) # amber
        }
    },
    {
        "frame": "frame_04.png",
        "title": "Act 1: Unified Authentication & Demo Personas",
        "badge": "Authentication & Roles",
        "script": "The authentication portal provides instant one-click switching across all nine industrial roles, from Board Directors and Department Managers to shopfloor operators.",
        "callout": {
            "box": [380, 410, 1540, 880],
            "tag": "AUTHENTICATION & RBAC",
            "label": "1-CLICK INSTANT DEMO SWITCHER ACROSS 9 ENTERPRISE PERSONAS",
            "color": (168, 85, 247) # purple
        }
    },
    {
        "frame": "frame_05.png",
        "title": "Act 2: Executive Board & Management Command Center",
        "badge": "Executive Tier • Aditya Birla",
        "script": "In the Executive Command Center, leadership gains company-wide visibility over total approved spend, board sanction queues, and real-time staff checklist compliance.",
        "callout": {
            "box": [290, 220, 1860, 460],
            "tag": "EXECUTIVE SPEND & SANCTIONS",
            "label": "TOTAL APPROVED SPEND ($4.8M) • BOARD QUEUE • 78% SHIFT AUDIT",
            "color": (52, 211, 153) # emerald
        }
    },
    {
        "frame": "frame_06.png",
        "title": "Act 2: Industrial Departments & HOD Assignments",
        "badge": "Department Organization",
        "script": "Each industrial department operates under a designated Department Manager, establishing a transparent chain of command and direct operational oversight.",
        "callout": {
            "box": [290, 320, 1860, 860],
            "tag": "CHAIN OF COMMAND",
            "label": "DEPARTMENTS & DESIGNATED MANAGERS (HODs) HIERARCHY",
            "color": (56, 189, 248) # sky
        }
    },
    {
        "frame": "frame_07.png",
        "title": "Act 2: Department Manager Appointment Modal",
        "badge": "Executive Governance",
        "script": "Management can appoint and reassign department managers with a single click, setting department heads and delegating budget approval authorities.",
        "callout": {
            "box": [620, 220, 1300, 800],
            "tag": "EXECUTIVE ACTION",
            "label": "APPOINT DEPARTMENT MANAGER (HOD) DELEGATION MODAL",
            "color": (99, 102, 241) # indigo
        }
    },
    {
        "frame": "frame_08.png",
        "title": "Act 2: Low Performance Staff & Disciplinary System",
        "badge": "Disciplinary Enforcement",
        "script": "Staff members whose daily shift checklist compliance drops below fifty percent are automatically flagged. Management can issue formal Warning or Termination letters directly to their dashboard.",
        "callout": {
            "box": [290, 360, 1860, 920],
            "tag": "SLA & DISCIPLINE ALERT",
            "label": "AUTOMATED LOW PERFORMER (<50%) DETECTION & NOTICE ISSUANCE",
            "color": (244, 63, 94) # rose
        }
    },
    {
        "frame": "frame_09.png",
        "title": "Act 3: Department Manager (HOD) Command Center",
        "badge": "Department Manager • Rajesh Sharma",
        "script": "Department Managers oversee daily operational shift output, team checklist compliance, and mandatory Environmental Health and Safety governance signoffs.",
        "callout": {
            "box": [290, 220, 1860, 600],
            "tag": "SHIFT GOVERNANCE",
            "label": "MANDATORY DAILY SHIFT GOVERNANCE & PRODUCTION REVIEWS",
            "color": (59, 130, 246) # blue
        }
    },
    {
        "frame": "frame_10.png",
        "title": "Act 3: Department Staff Proposals Review Queue",
        "badge": "Approval Workflow Queue",
        "script": "Requisitions and equipment proposals raised by department staff queue directly on the manager's dashboard. The manager reviews, approves, and forwards them upward to the Board.",
        "callout": {
            "box": [290, 320, 1860, 800],
            "tag": "APPROVAL PIPELINE",
            "label": "DEPARTMENT STAFF REQUISITIONS QUEUE & BOARD ESCALATION",
            "color": (251, 191, 36) # amber
        }
    },
    {
        "frame": "frame_11.png",
        "title": "Act 3: Department Staff Monitoring & Warning Controls",
        "badge": "Staff Performance Audit",
        "script": "Managers have granular oversight of every operator, engineer, and technician under their supervision, with the ability to issue formal disciplinary notices for non-compliance.",
        "callout": {
            "box": [290, 340, 1860, 880],
            "tag": "TEAM COMPLIANCE MONITOR",
            "label": "GRANULAR STAFF AUDIT & 1-CLICK DISCIPLINARY NOTICE DISPATCH",
            "color": (244, 63, 94) # rose
        }
    },
    {
        "frame": "frame_12.png",
        "title": "Act 4: Engineering & Tooling Specialist Workspace",
        "badge": "Engineering Lead • Ananya Verma",
        "script": "The Engineering workspace provides CAD schematic vault access, CPK tolerance validation, Engineering Change Notice tracking, and technical feasibility checklists.",
        "callout": {
            "box": [290, 210, 1860, 720],
            "tag": "ENGINEERING TOOLING",
            "label": "CPK 1.67 VALIDATION, CAD VAULT & ECN CHANGE PIPELINE",
            "color": (56, 189, 248) # sky
        }
    },
    {
        "frame": "frame_13.png",
        "title": "Act 4: Plant Maintenance Specialist Workspace",
        "badge": "Maintenance Lead • Manoj Kumar",
        "script": "Plant maintenance teams manage preventive maintenance schedules, MTBF and MTTR downtime metrics, critical spare parts inventory, and equipment overhaul requisitions.",
        "callout": {
            "box": [290, 210, 1860, 720],
            "tag": "PLANT MAINTENANCE",
            "label": "PREVENTIVE MAINTENANCE (94.2%), MTBF 420h, MTTR 1.4h & SPARES",
            "color": (251, 191, 36) # amber
        }
    },
    {
        "frame": "frame_14.png",
        "title": "Act 4: Finance & CAPEX Viability Workspace",
        "badge": "Finance Lead • Vikram Patel",
        "script": "Finance leads evaluate capital expenditure viability, computing Internal Rate of Return, Discounted Cash Flow, and Net Present Value for every machinery requisition.",
        "callout": {
            "box": [290, 210, 1860, 720],
            "tag": "CAPEX VIABILITY",
            "label": "IRR 24.8% • DISCOUNTED PAYBACK • NET PRESENT VALUE MODELING",
            "color": (52, 211, 153) # emerald
        }
    },
    {
        "frame": "frame_15.png",
        "title": "Act 4: Shopfloor Operator Workspace & Checklists",
        "badge": "Operator Workspace • Rahul Singh",
        "script": "Shopfloor operators complete their shift checklists covering job handover, batch milestones, cycle time analysis, and 5S workstation safety checks.",
        "callout": {
            "box": [290, 210, 1860, 720],
            "tag": "SHOPFLOOR OPERATOR",
            "label": "5S WORKSTATION SAFETY, BATCH MILESTONES & JOB HANDOVER",
            "color": (56, 189, 248) # sky
        }
    },
    {
        "frame": "frame_16.png",
        "title": "Act 5: Capital Equipment Requisition Dossier",
        "badge": "CAPEX Dossier Creation",
        "script": "When staff need new machinery or tooling, they initiate a comprehensive requisition dossier. The system automatically categorizes 4M impacts and calculates thresholds.",
        "callout": {
            "box": [300, 170, 1860, 920],
            "tag": "REQUISITION DOSSIER",
            "label": "CAPITAL EXPENDITURE PROPOSAL FORM & AUTOMATED 4M SCORING",
            "color": (99, 102, 241) # indigo
        }
    },
    {
        "frame": "frame_17.png",
        "title": "Act 5: Enterprise Proposals & Workflow Tracker",
        "badge": "Proposals Register",
        "script": "All capital proposals are tracked through a multi-stage approval lifecycle across 14 categories, complete with automated SLA escalations and financial payback matrices.",
        "callout": {
            "box": [290, 210, 1860, 880],
            "tag": "PROPOSALS PIPELINE",
            "label": "14-CATEGORY LIFECYCLE TRACKER & MULTI-TIER APPROVAL FLOW",
            "color": (56, 189, 248) # sky
        }
    },
    {
        "frame": "frame_18.png",
        "title": "Act 5: 4M Change Management Hub & Risk Matrix",
        "badge": "4M Change Governance",
        "script": "The 4M Change Management Hub categorizes every shopfloor modification by Man, Machine, Material, and Method, mapping 5 by 5 risk severity and technical mitigation plans.",
        "callout": {
            "box": [290, 210, 1860, 880],
            "tag": "4M GOVERNANCE",
            "label": "MAN, MACHINE, MATERIAL, METHOD REGISTER & 5x5 RISK MATRIX",
            "color": (244, 63, 94) # rose
        }
    },
    {
        "frame": "frame_19.png",
        "title": "Act 5: Procurement & Quotation Comparison Matrix",
        "badge": "Procurement & RFQ",
        "script": "Procurement teams issue Requests for Quotations, evaluate supplier bids against weighted scoring criteria, and rank best value vendor offerings.",
        "callout": {
            "box": [290, 210, 1860, 880],
            "tag": "PROCUREMENT RFQ",
            "label": "MULTI-VENDOR QUOTATION EVALUATION & WEIGHTED SCORING",
            "color": (52, 211, 153) # emerald
        }
    },
    {
        "frame": "frame_20.png",
        "title": "Act 5: Machinery Comparison & Technical Specs",
        "badge": "Machine Comparison Matrix",
        "script": "Engineering and Procurement perform side-by-side technical evaluations of competitive machinery models, power ratings, and tooling compatibility.",
        "callout": {
            "box": [290, 210, 1860, 880],
            "tag": "TECHNICAL COMPARISON",
            "label": "SIDE-BY-SIDE MACHINERY SPECIFICATIONS & COMPLIANCE MATRIX",
            "color": (251, 191, 36) # amber
        }
    },
    {
        "frame": "frame_21.png",
        "title": "Act 5: Purchase Orders Lifecycle & PO Dispatch",
        "badge": "Purchase Orders",
        "script": "Purchase orders are generated from approved vendor quotes, dispatched with milestone payment terms, and tracked through supplier acknowledgment.",
        "callout": {
            "box": [290, 210, 1860, 880],
            "tag": "PURCHASE ORDERS",
            "label": "AUTOMATED PO GENERATION, MILESTONES & DISPATCH TRACKING",
            "color": (99, 102, 241) # indigo
        }
    },
    {
        "frame": "frame_22.png",
        "title": "Act 5: Delivery, FAT & Commissioning Tracker",
        "badge": "Commissioning & FAT",
        "script": "Tracks factory acceptance test verification, delivery milestones, installation signoffs, and automatic asset tagging upon final commissioning.",
        "callout": {
            "box": [290, 210, 1860, 880],
            "tag": "FAT & COMMISSIONING",
            "label": "FACTORY ACCEPTANCE TESTS, INSTALLATION & ASSET TAGGING",
            "color": (52, 211, 153) # emerald
        }
    },
    {
        "frame": "frame_23.png",
        "title": "Act 5: Asset Register & AMC Maintenance Schedule",
        "badge": "Asset Register",
        "script": "The asset register provides a complete digital ledger of machinery assets, serial numbers, warranty coverage, and scheduled annual maintenance contracts.",
        "callout": {
            "box": [290, 210, 1860, 880],
            "tag": "ASSET REGISTER",
            "label": "ENTERPRISE DIGITAL ASSET LEDGER & AMC MAINTENANCE LOGS",
            "color": (56, 189, 248) # sky
        }
    },
    {
        "frame": "frame_24.png",
        "title": "Act 5: Staff Checklist Performance Analytics",
        "badge": "Performance Analytics",
        "script": "Executive leadership analyzes company-wide checklist compliance trends, department adherence rankings, and individual shift compliance leaderboards.",
        "callout": {
            "box": [290, 210, 1860, 880],
            "tag": "PERFORMANCE ANALYTICS",
            "label": "COMPANY-WIDE CHECKLIST COMPLIANCE TRENDS & AUDIT LOGS",
            "color": (168, 85, 247) # purple
        }
    },
    {
        "frame": "frame_25.png",
        "title": "Act 5: Workflow Rules & Threshold Gate Editor",
        "badge": "Workflow Admin",
        "script": "Platform administrators configure dynamic approval stages, define capital spend thresholds, and set SLA escalation targets for each proposal category.",
        "callout": {
            "box": [290, 210, 1860, 880],
            "tag": "WORKFLOW ENGINE",
            "label": "DYNAMIC STAGE GATES, CAPEX THRESHOLDS & SLA PROTOCOLS",
            "color": (251, 191, 36) # amber
        }
    },
    {
        "frame": "frame_26.png",
        "title": "Act 5: Immutable Audit Logs & Security Trail",
        "badge": "Enterprise Compliance",
        "script": "An immutable audit trail records every proposal change, approval decision, notice issuance, and login event with exact timestamps and IP addresses.",
        "callout": {
            "box": [290, 210, 1860, 880],
            "tag": "COMPLIANCE & AUDIT",
            "label": "IMMUTABLE AUDIT TRAIL, SECURITY EVENTS & TAMPER PROOF LOGS",
            "color": (56, 189, 248) # sky
        }
    },
    {
        "frame": "frame_27.png",
        "title": "Act 6: Mobile Responsive Experience & Drawer",
        "badge": "Mobile-First UX",
        "script": "ChangeFlow Enterprise is fully mobile responsive, featuring a slide-over navigation drawer, touch-friendly checklists, and a native bottom action bar.",
        "callout": {
            "box": [760, 90, 1160, 970],
            "tag": "MOBILE RESPONSIVENESS",
            "label": "SLIDE-OVER DRAWER, TOUCH CHECKLISTS & BOTTOM ACTION BAR",
            "color": (52, 211, 153) # emerald
        }
    },
    {
        "frame": "frame_28.png",
        "title": "Conclusion: Complete End-to-End Enterprise Governance",
        "badge": "ChangeFlow Enterprise 2026",
        "script": "ChangeFlow Enterprise delivers end-to-end industrial governance, connecting shopfloor execution with executive board sanctions in one unified platform.",
        "callout": {
            "box": [280, 180, 1860, 940],
            "tag": "ENTERPRISE PLATFORM",
            "label": "COMPLETE END-TO-END INDUSTRIAL GOVERNANCE UNIFIED",
            "color": (56, 189, 248) # sky
        }
    }
]

def synthesize_audio(text, output_wav):
    escaped_text = text.replace("'", "''")
    ps_cmd = f"""
    Add-Type -AssemblyName System.Speech;
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
    $synth.Rate = 0;
    $synth.SetOutputToWaveFile('{output_wav}');
    $synth.Speak('{escaped_text}');
    $synth.Dispose();
    """
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], check=True)

def get_audio_duration(wav_path):
    with wave.open(wav_path, 'r') as wf:
        frames = wf.getnframes()
        rate = wf.getframerate()
        return frames / float(rate)

def annotate_image(image_path, title, badge, scene_idx, total_scenes, callout_data, output_path):
    img = Image.open(image_path).convert("RGBA")
    target_w, target_h = 1920, 1080

    # If mobile screenshot, center on a dark 1920x1080 canvas
    if img.size != (target_w, target_h):
        bg = Image.new("RGBA", (target_w, target_h), (11, 15, 25, 255))
        scale = (target_h - 140) / float(img.size[1])
        new_w = int(img.size[0] * scale)
        new_h = int(img.size[1] * scale)
        resized_mobile = img.resize((new_w, new_h), Image.LANCZOS)
        offset_x = (target_w - new_w) // 2
        offset_y = 80
        bg.paste(resized_mobile, (offset_x, offset_y), resized_mobile)
        img = bg

    w, h = img.size

    # Fonts
    try:
        font_title = ImageFont.truetype("arialbd.ttf", 26)
        font_badge = ImageFont.truetype("arialbd.ttf", 16)
        font_callout_tag = ImageFont.truetype("arialbd.ttf", 13)
        font_callout_lbl = ImageFont.truetype("arialbd.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 15)
    except:
        font_title = font_badge = font_callout_tag = font_callout_lbl = font_small = ImageFont.load_default()

    # 1. Visual Callout Box Overlay (Spotlight & Glowing Border)
    if callout_data and "box" in callout_data:
        x1, y1, x2, y2 = callout_data["box"]
        color = callout_data.get("color", (56, 189, 248))
        tag = callout_data.get("tag", "HIGHLIGHT")
        label = callout_data.get("label", "")

        # Spotlight tint overlay
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)

        # Soft glow borders
        glow_alpha = [35, 70, 120]
        for idx_glow, glow_pad in enumerate([6, 4, 2]):
            overlay_draw.rounded_rectangle(
                [x1 - glow_pad, y1 - glow_pad, x2 + glow_pad, y2 + glow_pad],
                radius=12,
                outline=(color[0], color[1], color[2], glow_alpha[idx_glow]),
                width=2
            )

        # Subtle fill inside the highlight box to illuminate it
        overlay_draw.rounded_rectangle(
            [x1, y1, x2, y2],
            radius=10,
            fill=(color[0], color[1], color[2], 18),
            outline=(color[0], color[1], color[2], 255),
            width=3
        )

        # Corner Target Crosshair Accents
        corner_len = 24
        cw = 4
        # Top-Left
        overlay_draw.line([(x1, y1), (x1 + corner_len, y1)], fill=(255, 255, 255, 255), width=cw)
        overlay_draw.line([(x1, y1), (x1, y1 + corner_len)], fill=(255, 255, 255, 255), width=cw)
        # Top-Right
        overlay_draw.line([(x2 - corner_len, y1), (x2, y1)], fill=(255, 255, 255, 255), width=cw)
        overlay_draw.line([(x2, y1), (x2, y1 + corner_len)], fill=(255, 255, 255, 255), width=cw)
        # Bottom-Left
        overlay_draw.line([(x1, y2 - corner_len), (x1, y2)], fill=(255, 255, 255, 255), width=cw)
        overlay_draw.line([(x1, y2), (x1 + corner_len, y2)], fill=(255, 255, 255, 255), width=cw)
        # Bottom-Right
        overlay_draw.line([(x2 - corner_len, y2), (x2, y2)], fill=(255, 255, 255, 255), width=cw)
        overlay_draw.line([(x2, y2 - corner_len), (x2, y2)], fill=(255, 255, 255, 255), width=cw)

        # Floating Callout Badge Header above the box
        callout_y = max(y1 - 42, 85)
        callout_x = x1 + 10

        tag_w = int(overlay_draw.textlength(f"[{tag}]", font=font_callout_tag))
        lbl_w = int(overlay_draw.textlength(label, font=font_callout_lbl))
        pill_w = tag_w + lbl_w + 38
        pill_h = 36

        # Draw floating badge background
        overlay_draw.rounded_rectangle(
            [callout_x, callout_y, callout_x + pill_w, callout_y + pill_h],
            radius=8,
            fill=(15, 23, 42, 245),
            outline=(color[0], color[1], color[2], 255),
            width=2
        )

        # Draw tag
        overlay_draw.text(
            (callout_x + 14, callout_y + 9),
            f"[{tag}]",
            fill=(color[0], color[1], color[2], 255),
            font=font_callout_tag
        )

        # Draw label
        overlay_draw.text(
            (callout_x + 14 + tag_w + 10, callout_y + 8),
            label,
            fill=(255, 255, 255, 255),
            font=font_callout_lbl
        )

        # Downward pointer triangle connecting callout to box
        pointer_cx = callout_x + 30
        pointer_top = callout_y + pill_h
        overlay_draw.polygon(
            [(pointer_cx - 6, pointer_top), (pointer_cx + 6, pointer_top), (pointer_cx, pointer_top + 6)],
            fill=(color[0], color[1], color[2], 255)
        )

        img = Image.alpha_composite(img, overlay)

    draw = ImageDraw.Draw(img)

    # 2. Top banner overlay
    banner_h = 75
    banner = Image.new("RGBA", (w, banner_h), (11, 15, 25, 240))
    img.paste(banner, (0, 0), banner)

    # Accent line
    draw.rectangle([0, banner_h - 4, w, banner_h], fill=(37, 99, 235, 255))

    # Brand badge
    draw.rounded_rectangle([30, 18, 185, 54], radius=8, fill=(37, 99, 235, 255))
    draw.text((42, 24), "CHANGEFLOW", fill=(255, 255, 255, 255), font=font_badge)

    # Title text
    draw.text((205, 23), title, fill=(255, 255, 255, 255), font=font_title)

    # Role Badge on right
    badge_text = badge
    badge_w = int(draw.textlength(badge_text, font=font_badge)) + 26
    badge_x = w - badge_w - 30
    draw.rounded_rectangle([badge_x, 18, badge_x + badge_w, 54], radius=8, fill=(30, 41, 59, 230), outline=(59, 130, 246, 200), width=1)
    draw.text((badge_x + 13, 24), badge_text, fill=(147, 197, 253, 255), font=font_badge)

    # 3. Bottom footer ticker
    footer_h = 42
    footer = Image.new("RGBA", (w, footer_h), (15, 23, 42, 235))
    img.paste(footer, (0, h - footer_h), footer)

    footer_text = f"ChangeFlow Enterprise Demo Walkthrough  •  Scene {scene_idx} of {total_scenes}  •  Full System Verification"
    draw.text((30, h - footer_h + 12), footer_text, fill=(148, 163, 184, 255), font=font_small)

    img.convert("RGB").save(output_path, "PNG")

def main():
    print("🎬 Starting Extended 28-Scene MP4 Video Generation with Visual Highlights...")
    clip_files = []
    total_scenes = len(SCENES)

    for idx, scene in enumerate(SCENES, 1):
        print(f"\n▶ Processing Scene {idx}/{total_scenes}: {scene['title']}")
        raw_frame = os.path.join(CAPTURES_DIR, scene["frame"])
        if not os.path.exists(raw_frame):
            print(f"⚠️ Warning: Frame {raw_frame} not found! Skipping...")
            continue

        annotated_frame = os.path.join(WORK_DIR, f"frame_{idx:02d}_annotated.png")
        callout = scene.get("callout", None)
        annotate_image(raw_frame, scene["title"], scene["badge"], idx, total_scenes, callout, annotated_frame)

        audio_wav = os.path.join(WORK_DIR, f"audio_{idx:02d}.wav")
        print(f"  🎙️ Synthesizing narration...")
        synthesize_audio(scene["script"], audio_wav)

        audio_duration = get_audio_duration(audio_wav)
        clip_duration = max(audio_duration + 0.8, 3.5)
        print(f"  ⏱️ Audio Duration: {audio_duration:.2f}s, Clip Duration: {clip_duration:.2f}s")

        clip_mp4 = os.path.join(WORK_DIR, f"clip_{idx:02d}.mp4")
        ffmpeg_cmd = [
            FFMPEG, "-y",
            "-loop", "1",
            "-i", annotated_frame,
            "-i", audio_wav,
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-t", str(clip_duration),
            "-shortest",
            clip_mp4
        ]
        subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        clip_files.append(clip_mp4)
        print(f"  ✅ Rendered scene clip: {os.path.basename(clip_mp4)}")

    # Concat all clips
    print("\n📦 Concatenating all 28 scene clips into unified Master MP4...")
    clips_list_path = os.path.join(WORK_DIR, "clips.txt")
    with open(clips_list_path, "w") as f:
        for c in clip_files:
            escaped_path = c.replace("\\", "/")
            f.write(f"file '{escaped_path}'\n")

    concat_cmd = [
        FFMPEG, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", clips_list_path,
        "-c", "copy",
        OUTPUT_MP4
    ]
    subprocess.run(concat_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"\n🎉 Master Video created successfully at: {OUTPUT_MP4}")

    # Copy to artifacts directory
    try:
        import shutil
        shutil.copy2(OUTPUT_MP4, ARTIFACT_MP4)
        print(f"📁 Copied to artifact directory: {ARTIFACT_MP4}")
    except Exception as e:
        print(f"Note on artifact copy: {e}")

    file_size_mb = os.path.getsize(OUTPUT_MP4) / (1024 * 1024)
    print(f"📊 Final Video Size: {file_size_mb:.2f} MB")

if __name__ == "__main__":
    main()
