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
    "mindspace-logo.png",
    "wellness_insights.py",
    "__init__.py",
}

TEXT_EXTENSIONS = {
    ".html", ".css", ".js", ".json", ".py", ".md", ".txt", ".svg",
}

NAVBAR_DOCS_PATTERN = re.compile(
    r'<li\s+class="navbar-item">\s*'
    r'<a\s+href="/docs/"[^>]*>.*?'
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
    ("#8c7455", "#112D4E"),
    ("#a08565", "#143A5E"),
    ("#d4a853", "#2068A8"),

    ("#f2a33b", "#4A93D4"),
    ("#e8943a", "#3B8DD4"),
    ("#f2c200", "#5BA4E6"),
    ("#e6b800", "#4893D4"),
    ("#e5a800", "#4893D4"),
    ("#d49600", "#3B8DD4"),

    ("#d4c4a8", "#a3c8ed"),
    ("#7a6548", "#2d6ab0"),
    ("#6b5635", "#245a8c"),
    ("#f0ede8", "#e0f0ff"),

    ("#e8c9a0", "#a3d1f7"),
    ("#d4c4b0", "#a3c8ed"),
    ("#c9ad8c", "#7BBDF7"),
    ("#d0c8bc", "#b8d8f8"),
    ("#a09080", "#6b9cc4"),
    ("#b5844f", "#2d6ab0"),
    ("#e4b584", "#7BBDF7"),
    ("#c99640", "#2d6ab0"),
    ("#d6a756", "#4A93D4"),
    ("#e8c074", "#7BBDF7"),
    ("#e8b060", "#5BA4E6"),
    ("#e8c77b", "#7BBDF7"),
    ("#d9940a", "#2d6ab0"),
    ("#f0a500", "#3B8DD4"),

    ("#f5f0e8", "#bde0fe"),
    ("#f8f6f2", "#d4ecff"),
    ("#fbf4e8", "#bde0fe"),
    ("#e8e4dc", "#a3d1f7"),
    ("#e8e4df", "#a3d1f7"),
    ("#f8f6f3", "#d4ecff"),

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

    ("242, 163, 59", "32, 104, 168"),
    ("242, 194, 0", "32, 104, 168"),

    ("#e8c87a", "#7BBDF7"),
    ("#EBF3FC", "#bde0fe"),
    ("#EFF5FC", "#d4ecff"),
    ("#D6E8F8", "#a3d1f7"),

    ("#f79f9b", "#38b6ff"),
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

    content = content.replace("gold-crayola", "blue-crayola")
    content = content.replace("gold_crayola", "blue_crayola")

    SETTINGS_FILES = {"settings.js", "settings-modal.js"}
    is_settings_file = basename in SETTINGS_FILES

    if ext.lower() in {".css", ".html", ".js"} and not is_settings_file:
        for old_color, new_color in COLOR_REPLACEMENTS:
            content = re.sub(re.escape(old_color), new_color, content, flags=re.IGNORECASE)

    if ext.lower() == ".js":
        if is_settings_file:
            MINDSPACE_ACCENT_COLORS_SETTINGS = """  const ACCENT_COLORS = {
    blue:   { hex: '#5BA4E6', hover: '#4893D4', rgb: '91, 164, 230', light: '#a3c8ed', soft: '#bde0fe', dark: '#2d6ab0', gradEnd: '#7BBDF7', text: '#245a8c' },
    purple: { hex: '#9b7ed9', hover: '#8a6dc8', rgb: '155, 126, 217', light: '#c9b8ec', soft: '#f3eefb', dark: '#6b4fb5', gradEnd: '#b99ae6', text: '#5a3d9e' },
    sky:    { hex: '#4a90d9', hover: '#3d7fc8', rgb: '74, 144, 217',  light: '#a3c8ed', soft: '#eaf2fb', dark: '#2d6ab0', gradEnd: '#6daeed', text: '#245a8c' },
    green:  { hex: '#4db896', hover: '#3fa884', rgb: '77, 184, 150',  light: '#a3dbc7', soft: '#e8f7f1', dark: '#2e8a6a', gradEnd: '#6fd4aa', text: '#267558' },
    teal:   { hex: '#38b2ac', hover: '#2d9d98', rgb: '56, 178, 172',  light: '#96d8d4', soft: '#e6f5f4', dark: '#238079', gradEnd: '#5fccc6', text: '#1d6b65' },
    pink:   { hex: '#d97eab', hover: '#c86d9a', rgb: '217, 126, 171', light: '#ecbdd5', soft: '#fbeef4', dark: '#b4547f', gradEnd: '#e9a3c3', text: '#993f6a' },
    orange: { hex: '#e09c5c', hover: '#d08b4b', rgb: '224, 156, 92',  light: '#f0cca3', soft: '#fdf3e8', dark: '#b87430', gradEnd: '#edb87a', text: '#9a6228' },
    red:    { hex: '#e07070', hover: '#d05f5f', rgb: '224, 112, 112', light: '#f0b3b3', soft: '#fdeaea', dark: '#b84444', gradEnd: '#ed9494', text: '#9a3535' }
  };"""

            MINDSPACE_ACCENT_COLORS_MODAL = """  const ACCENT_COLORS = {
    blue:   { hex: '#5BA4E6', hover: '#4893D4', rgb: '91, 164, 230', light: '#a3c8ed', soft: '#bde0fe', dark: '#2d6ab0', gradEnd: '#7BBDF7', text: '#245a8c', name: 'Blue' },
    purple: { hex: '#9b7ed9', hover: '#8a6dc8', rgb: '155, 126, 217', light: '#c9b8ec', soft: '#f3eefb', dark: '#6b4fb5', gradEnd: '#b99ae6', text: '#5a3d9e', name: 'Purple' },
    sky:    { hex: '#4a90d9', hover: '#3d7fc8', rgb: '74, 144, 217',  light: '#a3c8ed', soft: '#eaf2fb', dark: '#2d6ab0', gradEnd: '#6daeed', text: '#245a8c', name: 'Sky' },
    green:  { hex: '#4db896', hover: '#3fa884', rgb: '77, 184, 150',  light: '#a3dbc7', soft: '#e8f7f1', dark: '#2e8a6a', gradEnd: '#6fd4aa', text: '#267558', name: 'Green' },
    teal:   { hex: '#38b2ac', hover: '#2d9d98', rgb: '56, 178, 172',  light: '#96d8d4', soft: '#e6f5f4', dark: '#238079', gradEnd: '#5fccc6', text: '#1d6b65', name: 'Teal' },
    pink:   { hex: '#d97eab', hover: '#c86d9a', rgb: '217, 126, 171', light: '#ecbdd5', soft: '#fbeef4', dark: '#b4547f', gradEnd: '#e9a3c3', text: '#993f6a', name: 'Pink' },
    orange: { hex: '#e09c5c', hover: '#d08b4b', rgb: '224, 156, 92',  light: '#f0cca3', soft: '#fdf3e8', dark: '#b87430', gradEnd: '#edb87a', text: '#9a6228', name: 'Orange' },
    red:    { hex: '#e07070', hover: '#d05f5f', rgb: '224, 112, 112', light: '#f0b3b3', soft: '#fdeaea', dark: '#b84444', gradEnd: '#ed9494', text: '#9a3535', name: 'Red' }
  };"""

            content = re.sub(
                r'const ACCENT_COLORS\s*=\s*\{.*?\};',
                lambda m: MINDSPACE_ACCENT_COLORS_MODAL.strip() if "name:" in m.group() else MINDSPACE_ACCENT_COLORS_SETTINGS.strip(),
                content,
                count=1,
                flags=re.DOTALL
            )

        content = content.replace("data-accent-color=\"blue\"", "data-accent-color=\"sky\"")

        content = content.replace("DEFAULT_ACCENT = 'gold'", "DEFAULT_ACCENT = 'blue'")
        content = content.replace("ACCENT_COLORS.gold", "ACCENT_COLORS.blue")
        content = content.replace("accentColor, 'gold'", "accentColor, 'blue'")
        content = content.replace("applyAccentColor?.('gold')", "applyAccentColor?.('blue')")
        content = content.replace("accent: 'gold'", "accent: 'blue'")
        content = content.replace("colorName : 'gold'", "colorName : 'blue'")
        content = content.replace("? colorName : 'gold'", "? colorName : 'blue'")
        content = content.replace("accentColor, 'gold')", "accentColor, 'blue')")
        content = re.sub(r"getPreference\(STORAGE_KEYS\.accentColor,\s*'gold'\)", "getPreference(STORAGE_KEYS.accentColor, 'blue')", content)
        content = content.replace("|| '#af916d'", "|| '#5BA4E6'")
        content = content.replace("|| '#AF916D'", "|| '#5BA4E6'")

    if ext.lower() == ".html":
        content = re.sub(
            r'data-accent-color="blue"(.*?)style="--btn-color: #4a90d9"',
            r'data-accent-color="sky"\1style="--btn-color: #4a90d9"',
            content
        )
        content = content.replace('data-accent-color="gold"', 'data-accent-color="blue"')
        content = content.replace("title=\"Gold\"", "title=\"Blue\"")
        content = content.replace("--gold-crayola", "--blue-crayola")
        content = content.replace(
            'data-accent-color="purple" title="Purple" style="--btn-color: #6DB3F2"',
            'data-accent-color="purple" title="Purple" style="--btn-color: #9b7ed9"'
        )
        content = content.replace("#f8a29e", "#38b6ff")
        content = content.replace("MindSpaceLogo.svg", "MindSpaceLogo.png")
        content = content.replace("MindBalanceLogo.svg", "MindSpaceLogo.png")

        if basename == "index.html" and "auth" in os.path.dirname(filepath).replace("\\", "/"):
            content = content.replace(
                "redirectTo: window.location.origin + '/auth/'",
                "redirectTo: 'https://mindspace.site/auth/'"
            )
            content = content.replace(
                "var targetUrl = 'https://mind' + 'space.site/auth/' + search + hash;",
                "/* redirect handler not needed on MindSpace */"
            )
            content = content.replace(
                "if (isOAuthCallback && !hasOAuthOrigin && !isMindSpaceDomain) {",
                "if (false) {"
            )

    if ext.lower() == ".css":
        content = content.replace("--gold-crayola", "--blue-crayola")
        content = content.replace("#f8a29e", "#38b6ff")
        content = content.replace("#AF916D", "#2068A8")
        content = content.replace("#af916d", "#2068a8")


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
        "MindBalanceHub.mp4": "MindSpaceHub.mp4",
    }
    images_dir = os.path.join(OUTPUT_DIR, "assets", "images")
    for old_name, new_name in rename_map.items():
        old_path = os.path.join(images_dir, old_name)
        if os.path.exists(old_path):
            os.rename(old_path, os.path.join(images_dir, new_name))
            print(f"  Renamed: {old_name} -> {new_name}")

    ms_logo_src = os.path.join(SOURCE_DIR, "assets", "images", "mindspace-logo.png")
    ms_logo_dst = os.path.join(images_dir, "MindSpaceLogo.png")
    if os.path.exists(ms_logo_src):
        shutil.copy2(ms_logo_src, ms_logo_dst)
        print("  Replaced: logo with MindSpace PNG logo")
    old_svg_logo = os.path.join(images_dir, "MindSpaceLogo.svg")
    if os.path.exists(old_svg_logo):
        os.remove(old_svg_logo)

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
