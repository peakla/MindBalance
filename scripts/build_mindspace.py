#!/usr/bin/env python3
import os
import shutil
import re
import json

SOURCE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(SOURCE_DIR, "mindspace-build")

EXCLUDE_DIRS = {
    "docs",
    "scripts",
    "mindspace-build",
    ".git",
    ".cache",
    ".config",
    ".upm",
    ".pythonlibs",
    "node_modules",
    "__pycache__",
    "attached_assets",
    ".local",
}

EXCLUDE_FILES = {
    "main.py",
    "replit.md",
    ".replit",
    "replit.nix",
    ".gitignore",
    "poetry.lock",
    "pyproject.toml",
    ".replit.nix",
    "docs.css",
    "server.py",
    "uv.lock",
    "translations.csv",
    "analytics.py",
    ".replit.backup",
    ".gititnore",
    "mindspace-favicon.png",
    "mindspace-preload.gif",
}

TEXT_EXTENSIONS = {
    ".html", ".css", ".js", ".json", ".py", ".md", ".txt", ".svg",
}

NAVBAR_DOCS_PATTERN = re.compile(
    r'<li\s+class="navbar-item">\s*'
    r'<a\s+href="/docs/"[^>]*>\s*'
    r'<div\s+class="separator"></div>\s*'
    r'<span[^>]*data-translate="nav_docs"[^>]*>[^<]*</span>\s*'
    r'</a>\s*'
    r'</li>',
    re.DOTALL
)

VERCEL_DOCS_REWRITE = re.compile(
    r'\s*\{\s*"source"\s*:\s*"/docs/"\s*,\s*"destination"\s*:\s*"/docs/index\.html"\s*\}\s*,?',
)

CSS_DOCS_LINK = re.compile(
    r'<link\s+rel="stylesheet"\s+href="/css/docs\.css"\s*/?>\s*\n?',
)


def should_exclude(path):
    parts = path.split(os.sep)
    for part in parts:
        if part in EXCLUDE_DIRS:
            return True
    basename = os.path.basename(path)
    if basename in EXCLUDE_FILES:
        return True
    return False


def is_text_file(filepath):
    _, ext = os.path.splitext(filepath)
    return ext.lower() in TEXT_EXTENSIONS


COLOR_REPLACEMENTS = [
    ("#af916d", "#5BA4E6"),
    ("#9d8260", "#4893D4"),
    ("#d4a574", "#7BBDF7"),
    ("#b89b5e", "#1A4F85"),
    ("#a08550", "#163F6E"),
    ("#c9a227", "#3B8DD4"),
    ("#d4aa00", "#3B8DD4"),
    ("#c49464", "#4893D4"),
    ("#c49466", "#4893D4"),
    ("#d4b896", "#A8D4FF"),
    ("#e4c094", "#A8D4FF"),
    ("#e8dfd4", "#D6EBFF"),

    ("#d6bd9f", "#2068A8"),
    ("#c4a985", "#1B5A94"),
    ("#c4a67a", "#1B5A94"),
    ("#8b7355", "#143E6B"),
    ("#d4a853", "#2068A8"),

    ("#f2a33b", "#4A93D4"),
    ("#e8943a", "#3B8DD4"),
    ("#f2c200", "#5BA4E6"),
    ("#e6b800", "#4893D4"),
    ("#e5a800", "#4893D4"),
    ("#d49600", "#3B8DD4"),

    ("#f5f0e8", "#EBF3FC"),
    ("#f8f6f2", "#EFF5FC"),
    ("#fbf4e8", "#EBF3FC"),
    ("#e8e4dc", "#D6E8F8"),
    ("#e8e4df", "#D6E8F8"),
    ("#f8f6f3", "#EFF5FC"),

    ("#9b7ed9", "#6DB3F2"),
    ("#7c5fc4", "#4A93D4"),
    ("#8a6dc8", "#5CA3E6"),
    ("#b794f6", "#8ECAFF"),
    ("#7c5fb8", "#4A93D4"),
    ("#7c5cbf", "#4A93D4"),
    ("#6366f1", "#3B8DD4"),
    ("#7a5dc7", "#4A93D4"),

    ("175, 145, 109", "91, 164, 230"),
    ("155, 126, 217", "109, 179, 242"),
]


def transform_content(content, filepath):
    basename = os.path.basename(filepath)
    _, ext = os.path.splitext(filepath)

    content = NAVBAR_DOCS_PATTERN.sub("", content)

    content = CSS_DOCS_LINK.sub("", content)

    if basename == "vercel.json":
        content = VERCEL_DOCS_REWRITE.sub("", content)

    content = content.replace("MindBalance", "MindSpace")
    content = content.replace("mindbalance", "mindspace")
    content = content.replace("MINDBALANCE", "MINDSPACE")
    content = content.replace("Mindbalance", "Mindspace")

    if ext.lower() in {".css", ".html", ".js"}:
        for old_color, new_color in COLOR_REPLACEMENTS:
            content = content.replace(old_color, new_color)

    if ext.lower() == ".js":
        content = re.sub(
            r"blue: \{ hex: '#4a90d9', hover: '#3d7fc8', rgb: '74, 144, 217' \}",
            "sky: { hex: '#4a90d9', hover: '#3d7fc8', rgb: '74, 144, 217' }",
            content
        )
        content = re.sub(
            r"blue: \{ hex: '#4a90d9', hover: '#3d7fc8', rgb: '74, 144, 217', name: 'Blue' \}",
            "sky: { hex: '#4a90d9', hover: '#3d7fc8', rgb: '74, 144, 217', name: 'Sky' }",
            content
        )
        content = content.replace("data-accent-color=\"blue\"", "data-accent-color=\"sky\"")

        content = content.replace(
            "gold: { hex: '#5BA4E6', hover: '#4893D4', rgb: '91, 164, 230' }",
            "blue: { hex: '#5BA4E6', hover: '#4893D4', rgb: '91, 164, 230' }"
        )
        content = content.replace(
            "gold: { hex: '#5BA4E6', hover: '#4893D4', rgb: '91, 164, 230', name: 'Gold' }",
            "blue: { hex: '#5BA4E6', hover: '#4893D4', rgb: '91, 164, 230', name: 'Blue' }"
        )
        content = content.replace("DEFAULT_ACCENT = 'gold'", "DEFAULT_ACCENT = 'blue'")
        content = content.replace("ACCENT_COLORS.gold", "ACCENT_COLORS.blue")
        content = content.replace("accentColor, 'gold'", "accentColor, 'blue'")
        content = content.replace("applyAccentColor?.('gold')", "applyAccentColor?.('blue')")
        content = content.replace("accent: 'gold'", "accent: 'blue'")

    if ext.lower() == ".html":
        content = re.sub(
            r'data-accent-color="blue"(.*?)style="--btn-color: #4a90d9"',
            r'data-accent-color="sky"\1style="--btn-color: #4a90d9"',
            content
        )
        content = content.replace('data-accent-color="gold"', 'data-accent-color="blue"')
        content = content.replace("title=\"Gold\"", "title=\"Blue\"")
        content = content.replace("--gold-crayola", "--blue-crayola")

    if ext.lower() == ".css":
        content = content.replace("--gold-crayola", "--blue-crayola")
        content = content.replace("#f8a29e", "#38b6ff")

        if basename == "style.css":
            footer_btn_override = """
/* MindSpace: white-on-blue footer buttons */
.mb-footer__btn {
  background: linear-gradient(135deg, #2068A8 0%, #1B5A94 100%) !important;
  color: #fff !important;
  box-shadow: 0 4px 15px rgba(32, 104, 168, 0.3) !important;
}
.mb-footer__btn:hover {
  box-shadow: 0 6px 20px rgba(32, 104, 168, 0.4) !important;
}
"""
            content += footer_btn_override

    return content


def build():
    git_dir = os.path.join(OUTPUT_DIR, ".git")
    git_backup = None
    if os.path.exists(git_dir):
        git_backup = os.path.join(SOURCE_DIR, ".mindspace-git-backup")
        if os.path.exists(git_backup):
            shutil.rmtree(git_backup)
        shutil.move(git_dir, git_backup)

    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR)

    if git_backup and os.path.exists(git_backup):
        shutil.move(git_backup, git_dir)

    file_count = 0
    skipped = 0

    for root, dirs, files in os.walk(SOURCE_DIR):
        rel_root = os.path.relpath(root, SOURCE_DIR)

        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for filename in files:
            rel_path = os.path.join(rel_root, filename) if rel_root != "." else filename

            if should_exclude(rel_path):
                skipped += 1
                continue

            src_path = os.path.join(root, filename)
            dst_path = os.path.join(OUTPUT_DIR, rel_path)

            os.makedirs(os.path.dirname(dst_path), exist_ok=True)

            if is_text_file(src_path):
                try:
                    with open(src_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    content = transform_content(content, src_path)
                    with open(dst_path, "w", encoding="utf-8") as f:
                        f.write(content)
                except (UnicodeDecodeError, PermissionError):
                    shutil.copy2(src_path, dst_path)
            else:
                shutil.copy2(src_path, dst_path)

            file_count += 1

    rename_map = {
        "MindBalanceLogo.svg": "MindSpaceLogo.svg",
        "MindBalanceVideo.mp4": "MindSpaceVideo.mp4",
        "MindBalanceHub.mp4": "MindSpaceHub.mp4",
    }
    images_dir = os.path.join(OUTPUT_DIR, "assets", "images")
    for old_name, new_name in rename_map.items():
        old_path = os.path.join(images_dir, old_name)
        if os.path.exists(old_path):
            os.rename(old_path, os.path.join(images_dir, new_name))
            print(f"  Renamed: {old_name} -> {new_name}")

    ms_favicon_src = os.path.join(SOURCE_DIR, "assets", "images", "mindspace-favicon.png")
    ms_favicon_dst = os.path.join(images_dir, "favicon.png")
    if os.path.exists(ms_favicon_src):
        shutil.copy2(ms_favicon_src, ms_favicon_dst)
        print("  Replaced: favicon.png with MindSpace logo")

    ms_preload_src = os.path.join(SOURCE_DIR, "assets", "images", "mindspace-preload.gif")
    ms_preload_dst = os.path.join(images_dir, "preload.gif")
    if os.path.exists(ms_preload_src):
        shutil.copy2(ms_preload_src, ms_preload_dst)
        print("  Replaced: preload.gif with MindSpace preloader")

    print(f"MindSpace build complete!")
    print(f"  Output: {OUTPUT_DIR}")
    print(f"  Files copied: {file_count}")
    print(f"  Files skipped: {skipped}")


if __name__ == "__main__":
    build()
