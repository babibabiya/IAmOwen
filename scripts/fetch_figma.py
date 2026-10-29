#!/usr/bin/env python3
"""
从 Figma REST API 拉取指定节点的完整设计数据 + 高清渲染图。

用法:
  python3 scripts/fetch_figma.py --token <FIGMA_PAT> [--node 1-9]

产出:
  design/<node>/node.json    完整图层树（fills/fonts/layout/effects/文本）
  design/<node>/render@2x.png 2 倍图，用于视觉对照
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

FILE_KEY = "oBXhrIkiI7zY4gbvrEldke"


def api(path: str, token: str) -> bytes:
    url = f"https://api.figma.com/v1{path}"
    req = urllib.request.Request(url, headers={"X-Figma-Token": token})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:400]
        print(f"[HTTP {e.code}] {path}\n{body}", file=sys.stderr)
        if e.code == 403:
            print("→ token 无效或缺少 file_content:read 权限", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"[网络错误] {e.reason}", file=sys.stderr)
        sys.exit(1)


def walk(node: dict, out: list, depth: int = 0) -> None:
    """把图层树压平成可读清单，方便实现时逐层对照。"""
    box = node.get("absoluteBoundingBox") or {}
    out.append({
        "depth": depth,
        "id": node.get("id"),
        "name": node.get("name"),
        "type": node.get("type"),
        "box": {k: round(box[k], 1) for k in ("x", "y", "width", "height") if k in box},
        "fills": node.get("fills"),
        "strokes": node.get("strokes"),
        "cornerRadius": node.get("cornerRadius"),
        "layout": {
            k: node.get(k) for k in (
                "layoutMode", "itemSpacing", "paddingLeft", "paddingTop",
                "paddingRight", "paddingBottom", "primaryAxisAlignItems",
                "counterAxisAlignItems",
            ) if node.get(k) is not None
        } or None,
        "characters": node.get("characters"),
        "style": {
            k: (node.get("style") or {}).get(k) for k in (
                "fontFamily", "fontWeight", "fontSize", "lineHeightPx",
                "letterSpacing", "textAlignHorizontal",
            ) if (node.get("style") or {}).get(k) is not None
        } or None,
        "effects": node.get("effects"),
    })
    for child in node.get("children", []):
        walk(child, out, depth + 1)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--token", required=True)
    p.add_argument("--node", default="1-9")
    p.add_argument("--file", default=FILE_KEY)
    args = p.parse_args()

    outdir = os.path.join("design", args.node.replace(":", "-"))
    os.makedirs(outdir, exist_ok=True)

    # Figma API 的节点 id 用冒号（12:143），URL 里写作 12-143
    node_id = args.node.replace("-", ":")

    # 1. 节点树
    print(f"→ 拉取节点 {node_id} ...")
    raw = json.loads(api(f"/files/{args.file}/nodes?ids={urllib.parse.quote(node_id)}", args.token))
    nodes = raw.get("nodes", {})
    if not nodes:
        print("未返回任何节点，检查 node-id 是否正确", file=sys.stderr)
        sys.exit(1)

    doc = next(iter(nodes.values()))["document"]
    flat: list = []
    walk(doc, flat)

    with open(os.path.join(outdir, "node.json"), "w", encoding="utf-8") as f:
        json.dump({"raw": doc, "flat": flat}, f, ensure_ascii=False, indent=2)
    print(f"  ✓ node.json（{len(flat)} 个图层）")
    print(f"  根节点: {doc.get('name')} / {doc.get('type')} "
          f"{(doc.get('absoluteBoundingBox') or {}).get('width')}×"
          f"{(doc.get('absoluteBoundingBox') or {}).get('height')}")

    # 2. 渲染图
    print("→ 导出 2x 渲染图 ...")
    imgs = json.loads(api(
        f"/images/{args.file}?ids={urllib.parse.quote(node_id)}&format=png&scale=2",
        args.token,
    ))
    url = (imgs.get("images") or {}).get(node_id)
    if not url:
        print(f"  图片导出失败: {json.dumps(imgs)[:300]}", file=sys.stderr)
    else:
        with urllib.request.urlopen(url, timeout=120) as r:
            data = r.read()
        path = os.path.join(outdir, "render@2x.png")
        with open(path, "wb") as f:
            f.write(data)
        print(f"  ✓ render@2x.png（{len(data)//1024} KB）")

    print(f"\n完成 → {outdir}")


if __name__ == "__main__":
    main()
