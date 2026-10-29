#!/usr/bin/env python3
"""生成单文件 index.single.html：styles.css / script.js / 图片 / 字体全部内联。
用于在只加载单文件的预览环境（如 WorkBuddy 预览面板的文件模式）中完整预览。"""
import base64, re, pathlib

base = pathlib.Path(__file__).resolve().parent.parent
MIME = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".svg": "image/svg+xml",
    ".woff2": "font/woff2", ".woff": "font/woff",
}

def datauri(rel: str) -> str:
    p = base / rel
    mime = MIME.get(p.suffix.lower(), "application/octet-stream")
    b64 = base64.b64encode(p.read_bytes()).decode()
    return f"data:{mime};base64,{b64}"

html = (base / "index.html").read_text(encoding="utf-8")
css  = (base / "styles.css").read_text(encoding="utf-8")
js   = (base / "script.js").read_text(encoding="utf-8")

# 1. CSS 里的字体等资源：url('assets/...') → data URI
css = re.sub(r"url\('(assets/[^']+)'\)", lambda m: f"url('{datauri(m.group(1))}')", css)

# 2. HTML 里的图片：src="assets/..." → data URI
html = re.sub(r'src="(assets/[^"]+)"', lambda m: f'src="{datauri(m.group(1))}"', html)

# 3. 内联 CSS / JS
html = html.replace(
    '<link rel="stylesheet" href="styles.css">',
    "<style>\n" + css + "\n</style>",
)
html = re.sub(
    r'<script src="script\.js"></script>',
    "<script>\n" + js + "\n</script>",
    html,
)

out = base / "index.single.html"
out.write_text(html, encoding="utf-8")
print("written:", out, f"({out.stat().st_size/1024/1024:.1f} MB)")
