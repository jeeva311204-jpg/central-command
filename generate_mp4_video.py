import os
import subprocess
import json
import wave
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r"E:\hackathon"
FFMPEG = os.path.join(BASE_DIR, "server", "node_modules", "ffmpeg-static", "ffmpeg.exe")
CAPTURES_DIR = os.path.join(BASE_DIR, "demo_captures")
WORK_DIR = os.path.join(BASE_DIR, "video_production")
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
        "title": "Act 1: Enterprise Architecture & Four Pillars",
        "badge": "Core Architecture",
        "script": "The platform is anchored on four pillars: Man, Machine, Material, and Method governance, a dynamic approval workflow engine, precision financial modeling, and procurement."
    },
    {
        "frame": "frame_03.png",
        "title": "Act 1: Unified Authentication & Demo Personas",
        "badge": "Authentication & Roles",
        "script": "The authentication portal provides instant one-click persona switching across all nine industrial roles, from Board Directors and Department Managers to shopfloor operators."
    },
    {
        "frame": "frame_04.png",
        "title": "Act 2: Executive Board & Management Command Center",
        "badge": "Executive Tier • Aditya Birla",
        "script": "In the Executive Management Command Center, leadership gains company-wide visibility over total approved capital spend, high-value sanction queues, and enterprise staff compliance."
    },
    {
        "frame": "frame_05.png",
        "title": "Act 2: Industrial Departments & Hierarchy Management",
        "badge": "Department Organization",
        "script": "Management can appoint and reassign Department Managers with a single click, establishing clear organizational hierarchy and operational accountability."
    },
    {
        "frame": "frame_06.png",
        "title": "Act 2: Low Performance Staff & Disciplinary System",
        "badge": "Performance Enforcement",
        "script": "Staff members whose daily shift checklist compliance drops below fifty percent are automatically flagged. Management can issue formal Warning or Termination notices directly to their dashboard."
    },
    {
        "frame": "frame_07.png",
        "title": "Act 3: Department Manager (HOD) Command Center",
        "badge": "Department Manager • Rajesh Sharma",
        "script": "Department Managers oversee daily operational shift output, team checklist compliance, and mandatory Environmental Health and Safety governance signoffs."
    },
    {
        "frame": "frame_08.png",
        "title": "Act 3: Department Staff Proposals Review Queue",
        "badge": "Approval Workflow Queue",
        "script": "Requisitions and equipment proposals raised by department staff queue directly on the manager's dashboard. The manager reviews, approves, and forwards them upward to the Board."
    },
    {
        "frame": "frame_09.png",
        "title": "Act 4: Shopfloor Operator Workspace & Checklists",
        "badge": "Operator Workspace • Rahul Singh",
        "script": "Shopfloor operators have a focused workspace featuring daily operational checklists: Job Done, Production Milestone, Cycle Time analysis, and 5S safety check."
    },
    {
        "frame": "frame_10.png",
        "title": "Act 4: Engineering Specialist Workspace",
        "badge": "Engineering Specialist • Ananya Verma",
        "script": "Engineering specialists track CAD modeling, technical feasibility, process capability tolerances, tooling specifications, and prototype trial runs."
    },
    {
        "frame": "frame_11.png",
        "title": "Act 4: Plant Maintenance & Equipment Health",
        "badge": "Plant Maintenance • Manoj Kumar",
        "script": "Maintenance leads manage preventive maintenance schedules, breakdown repairs, sensor calibrations, lubrication cycles, and critical spare parts inventory."
    },
    {
        "frame": "frame_12.png",
        "title": "Act 4: Finance Controller Workspace",
        "badge": "Finance Controller • Vikram Patel",
        "script": "Finance controllers conduct real-time evaluations of capital lines, Net Present Value, Internal Rate of Return, simple and discounted payback periods, and quotation variances."
    },
    {
        "frame": "frame_13.png",
        "title": "Act 5: 4M Change Control & 5x5 Risk Matrix",
        "badge": "4M Risk Governance",
        "script": "Change requests across Man, Machine, Material, and Method are evaluated through an interactive five-by-five severity and probability risk matrix with verification checklists."
    },
    {
        "frame": "frame_14.png",
        "title": "Act 5: Multi-Vendor Quotation Comparison",
        "badge": "Procurement Matrix",
        "script": "Procurement leads compare multi-vendor bids side by side with customizable weighted scoring across price, warranty, power consumption, and vendor ratings."
    },
    {
        "frame": "frame_15.png",
        "title": "Act 5: Machine Comparison Benchmark Matrix",
        "badge": "Machinery Benchmarking",
        "script": "Technical specifications across competing machinery are compared row by row, automatically highlighting the best value per parameter to guide investment decisions."
    },
    {
        "frame": "frame_16.png",
        "title": "Act 5: Commissioned Asset Register & Conclusion",
        "badge": "Asset Register & Closure",
        "script": "Approved and commissioned machinery auto-registers in the digital asset ledger, complete with warranty expiry alerts and scheduled preventive maintenance."
    }
]

def synthesize_audio(idx, text, wav_path):
    safe_text = text.replace("'", "''")
    safe_path = wav_path.replace("'", "''")
    ps_cmd = f"""
    Add-Type -AssemblyName System.Speech;
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
    $synth.Rate = 0;
    $synth.SetOutputToWaveFile('{safe_path}');
    $synth.Speak('{safe_text}');
    $synth.Dispose();
    """
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], check=True)

def get_wav_duration(wav_path):
    with wave.open(wav_path, "rb") as wf:
        frames = wf.getnframes()
        rate = wf.getframerate()
        return frames / float(rate)

def create_annotated_frame(src_img_path, title, badge, script_text, out_path):
    im = Image.open(src_img_path).convert("RGBA")
    w, h = im.size
    
    # Create dark banner overlay at bottom
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    banner_height = 140
    banner_y = h - banner_height
    draw.rectangle([(0, banner_y), (w, h)], fill=(9, 14, 26, 235))
    draw.line([(0, banner_y), (w, banner_y)], fill=(59, 130, 246, 255), width=3)
    
    # Simple default font
    draw.rectangle([(40, banner_y + 16), (280, banner_y + 44)], fill=(30, 58, 138, 255))
    draw.text((50, banner_y + 22), badge, fill=(147, 197, 253, 255))
    
    draw.text((300, banner_y + 20), title, fill=(255, 255, 255, 255))
    draw.text((40, banner_y + 60), f'"{script_text}"', fill=(203, 213, 225, 255))
    
    final_im = Image.alpha_composite(im, overlay).convert("RGB")
    final_im.save(out_path, "PNG")

def main():
    print("🎬 Starting High-Definition MP4 Video Generation Pipeline...")
    clip_list_path = os.path.join(WORK_DIR, "clips.txt")
    clip_files = []
    
    for i, scene in enumerate(SCENES, 1):
        idx_str = str(i).zfill(2)
        print(f"Processing Scene {i}/16: {scene['title']}...")
        
        # 1. Synthesize Audio
        wav_path = os.path.join(WORK_DIR, f"audio_{idx_str}.wav")
        synthesize_audio(i, scene["script"], wav_path)
        duration = get_wav_duration(wav_path) + 0.6  # Add 0.6s padding for natural pause
        print(f"  Audio Duration: {duration:.2f}s")
        
        # 2. Annotate Frame
        src_frame = os.path.join(CAPTURES_DIR, scene["frame"])
        annotated_frame = os.path.join(WORK_DIR, f"frame_{idx_str}_annotated.png")
        create_annotated_frame(src_frame, scene["title"], scene["badge"], scene["script"], annotated_frame)
        
        # 3. Render video segment with FFmpeg
        clip_path = os.path.join(WORK_DIR, f"clip_{idx_str}.mp4")
        cmd = [
            FFMPEG, "-y",
            "-loop", "1", "-i", annotated_frame,
            "-i", wav_path,
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-t", str(duration),
            "-shortest",
            clip_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        clip_files.append(clip_path)

    # 4. Concatenate all clips
    with open(clip_list_path, "w") as f:
        for clip in clip_files:
            # Escape path for ffmpeg concat demuxer
            safe_clip = clip.replace("\\", "/")
            f.write(f"file '{safe_clip}'\n")

    print("🎞️ Concatenating all 16 scenes into final broadcast MP4...")
    concat_cmd = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0",
        "-i", clip_list_path,
        "-c:v", "copy",
        "-c:a", "copy",
        OUTPUT_MP4
    ]
    subprocess.run(concat_cmd, check=True)
    
    # Copy to artifact folder
    import shutil
    shutil.copy2(OUTPUT_MP4, ARTIFACT_MP4)
    
    file_size_mb = os.path.getsize(OUTPUT_MP4) / (1024 * 1024)
    print(f"✅ Full Screen Recorded MP4 Video Generated Successfully! Size: {file_size_mb:.2f} MB")
    print(f"Saved to: {OUTPUT_MP4}")

if __name__ == "__main__":
    main()
