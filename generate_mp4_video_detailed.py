import os
import subprocess
import json
import wave
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r"E:\hackathon"
FFMPEG = os.path.join(BASE_DIR, "server", "node_modules", "ffmpeg-static", "ffmpeg.exe")
CAPTURES_DIR = os.path.join(BASE_DIR, "demo_captures_detailed")
WORK_DIR = os.path.join(BASE_DIR, "video_production_detailed")
os.makedirs(WORK_DIR, exist_ok=True)

OUTPUT_MP4 = os.path.join(BASE_DIR, "changeflow_enterprise_demo_walkthrough.mp4")
ARTIFACT_MP4 = r"C:\Users\Jeeva\.gemini\antigravity\brain\25f83dcb-cb92-45cc-9fc7-9a7068af2905\changeflow_enterprise_demo_walkthrough.mp4"

SCENES = [
    {
        "frame": "frame_01.png",
        "title": "Act 1: Modern Landing Page & Platform Overview",
        "badge": "Landing Page • Public Entry",
        "script": "Welcome to ChangeFlow Enterprise, an integrated Industry 4.0 platform for 4M Change Management, capital expenditure, and procurement automation."
    },
    {
        "frame": "frame_02.png",
        "title": "Act 1: 4M Change Governance & Industry Pillars",
        "badge": "Core Architecture",
        "script": "The platform is anchored on four pillars: Man, Machine, Material, and Method governance, standardizing modifications across the entire manufacturing lifecycle."
    },
    {
        "frame": "frame_03.png",
        "title": "Act 1: CAPEX, Workflows & Procurement Engine",
        "badge": "Enterprise Automation",
        "script": "Equipped with automated financial modeling, discounted cash flow metrics, weighted vendor quotation scoring, and strict SLA escalation protocols."
    },
    {
        "frame": "frame_04.png",
        "title": "Act 1: Unified Authentication & Demo Personas",
        "badge": "Authentication & Roles",
        "script": "The authentication portal provides instant one-click switching across all nine industrial roles, from Board Directors and Department Managers to shopfloor operators."
    },
    {
        "frame": "frame_05.png",
        "title": "Act 2: Executive Board & Management Command Center",
        "badge": "Executive Tier • Aditya Birla",
        "script": "In the Executive Command Center, leadership gains company-wide visibility over total approved spend, board sanction queues, and real-time staff checklist compliance."
    },
    {
        "frame": "frame_06.png",
        "title": "Act 2: Industrial Departments & HOD Assignments",
        "badge": "Department Organization",
        "script": "Each industrial department operates under a designated Department Manager, establishing a transparent chain of command and direct operational oversight."
    },
    {
        "frame": "frame_07.png",
        "title": "Act 2: Department Manager Appointment Modal",
        "badge": "Executive Governance",
        "script": "Management can appoint and reassign department managers with a single click, setting department heads and delegating budget approval authorities."
    },
    {
        "frame": "frame_08.png",
        "title": "Act 2: Low Performance Staff & Disciplinary System",
        "badge": "Disciplinary Enforcement",
        "script": "Staff members whose daily shift checklist compliance drops below fifty percent are automatically flagged. Management can issue formal Warning or Termination letters directly to their dashboard."
    },
    {
        "frame": "frame_09.png",
        "title": "Act 3: Department Manager (HOD) Command Center",
        "badge": "Department Manager • Rajesh Sharma",
        "script": "Department Managers oversee daily operational shift output, team checklist compliance, and mandatory Environmental Health and Safety governance signoffs."
    },
    {
        "frame": "frame_10.png",
        "title": "Act 3: Department Staff Proposals Review Queue",
        "badge": "Approval Workflow Queue",
        "script": "Requisitions and equipment proposals raised by department staff queue directly on the manager's dashboard. The manager reviews, approves, and forwards them upward to the Board."
    },
    {
        "frame": "frame_11.png",
        "title": "Act 3: Department Staff Monitoring & Warning Controls",
        "badge": "Staff Performance Audit",
        "script": "Managers have granular oversight of every operator, engineer, and technician under their supervision, with the ability to issue formal disciplinary notices for non-compliance."
    },
    {
        "frame": "frame_12.png",
        "title": "Act 4: Engineering & Tooling Specialist Workspace",
        "badge": "Engineering Lead • Ananya Verma",
        "script": "The Engineering workspace provides CAD schematic vault access, CPK tolerance validation, Engineering Change Notice tracking, and technical feasibility checklists."
    },
    {
        "frame": "frame_13.png",
        "title": "Act 4: Plant Maintenance Specialist Workspace",
        "badge": "Maintenance Lead • Manoj Kumar",
        "script": "Plant maintenance teams manage preventive maintenance schedules, MTBF and MTTR downtime metrics, critical spare parts inventory, and equipment overhaul requisitions."
    },
    {
        "frame": "frame_14.png",
        "title": "Act 4: Finance & CAPEX Viability Workspace",
        "badge": "Finance Lead • Vikram Patel",
        "script": "Finance leads evaluate capital expenditure viability, computing Internal Rate of Return, Discounted Cash Flow, and Net Present Value for every machinery requisition."
    },
    {
        "frame": "frame_15.png",
        "title": "Act 4: Shopfloor Operator Workspace & Checklists",
        "badge": "Operator Workspace • Rahul Singh",
        "script": "Shopfloor operators complete their shift checklists covering job handover, batch milestones, cycle time analysis, and 5S workstation safety checks."
    },
    {
        "frame": "frame_16.png",
        "title": "Act 5: Capital Equipment Requisition Dossier",
        "badge": "CAPEX Dossier Creation",
        "script": "When staff need new machinery or tooling, they initiate a comprehensive requisition dossier. The system automatically categorizes 4M impacts and calculates thresholds."
    },
    {
        "frame": "frame_17.png",
        "title": "Act 5: Enterprise Proposals & Workflow Tracker",
        "badge": "Proposals Register",
        "script": "All capital proposals are tracked through a multi-stage approval lifecycle, complete with automated SLA escalations, financial payback matrices, and digital signatures."
    },
    {
        "frame": "frame_18.png",
        "title": "Act 5: 4M Change Management Hub & Risk Matrix",
        "badge": "4M Change Governance",
        "script": "The 4M Change Management Hub categorizes every shopfloor modification by Man, Machine, Material, and Method, mapping risk severity and technical mitigation plans."
    },
    {
        "frame": "frame_19.png",
        "title": "Act 5: Procurement & Vendor Evaluation Matrix",
        "badge": "Procurement & RFQ",
        "script": "Procurement teams issue Requests for Quotations, evaluate supplier bids against weighted scoring criteria, and dispatch approved Purchase Orders."
    },
    {
        "frame": "frame_20.png",
        "title": "Act 5: Delivery, FAT & Commissioning Tracker",
        "badge": "Commissioning & FAT",
        "script": "Tracks factory acceptance test verification, delivery milestones, installation signoffs, and automatic asset tagging upon final commissioning."
    },
    {
        "frame": "frame_21.png",
        "title": "Act 5: Immutable Audit Logs & Security",
        "badge": "Enterprise Compliance",
        "script": "An immutable audit trail records every proposal change, approval decision, notice issuance, and login event with exact timestamps and IP addresses."
    },
    {
        "frame": "frame_22.png",
        "title": "Conclusion: Complete End-to-End Enterprise Governance",
        "badge": "ChangeFlow Enterprise 2026",
        "script": "ChangeFlow Enterprise delivers end-to-end industrial governance, connecting shopfloor execution with executive board sanctions in one unified platform."
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

def annotate_image(image_path, title, badge, scene_idx, total_scenes, output_path):
    img = Image.open(image_path).convert("RGBA")
    draw = ImageDraw.Draw(img)
    w, h = img.size

    # 1. Top banner overlay
    banner_h = 75
    banner = Image.new("RGBA", (w, banner_h), (11, 15, 25, 235))
    img.paste(banner, (0, 0), banner)

    # Accent line
    draw.rectangle([0, banner_h - 4, w, banner_h], fill=(37, 99, 235, 255))

    # Fonts
    try:
        font_title = ImageFont.truetype("arialbd.ttf", 26)
        font_badge = ImageFont.truetype("arialbd.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 15)
    except:
        font_title = font_badge = font_small = ImageFont.load_default()

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

    # Bottom footer ticker
    footer_h = 42
    footer = Image.new("RGBA", (w, footer_h), (15, 23, 42, 220))
    img.paste(footer, (0, h - footer_h), footer)

    footer_text = f"ChangeFlow Enterprise Demo Walkthrough  •  Scene {scene_idx} of {total_scenes}  •  Full System Verification"
    draw.text((30, h - footer_h + 12), footer_text, fill=(148, 163, 184, 255), font=font_small)

    img.convert("RGB").save(output_path, "PNG")

def main():
    print("🎬 Starting Ultra-Detailed MP4 Demonstration Video Generation...")
    clip_files = []
    total_scenes = len(SCENES)

    for idx, scene in enumerate(SCENES, 1):
        print(f"\n▶ Processing Scene {idx}/{total_scenes}: {scene['title']}")
        raw_frame = os.path.join(CAPTURES_DIR, scene["frame"])
        if not os.path.exists(raw_frame):
            print(f"⚠️ Warning: Frame {raw_frame} not found! Skipping...")
            continue

        annotated_frame = os.path.join(WORK_DIR, f"frame_{idx:02d}_annotated.png")
        annotate_image(raw_frame, scene["title"], scene["badge"], idx, total_scenes, annotated_frame)

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
    print("\n📦 Concatenating all scene clips into unified Master MP4...")
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
