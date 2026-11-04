#!/usr/bin/env python3
"""
QuickPress Unified iOS Build & Asset Synchronization Engine.
Generates production-grade native iOS bundles for Customer, Partner, and Captain apps.
"""

import os
import shutil
import subprocess
import sys
import time

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))

def run_cmd(cmd, cwd=ROOT_DIR):
    print(f"\n===> Executing: {cmd} (in {cwd})")
    env = os.environ.copy()
    node_bins = [
        "/Users/himanshupal/.nvm/versions/node/v22.23.2/bin",
        "/Users/himanshupal/.nvm/versions/node/v20.20.2/bin",
    ]
    node_path_prefix = ":".join(b for b in node_bins if os.path.exists(b))
    env["PATH"] = f"{node_path_prefix}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:{env.get('PATH', '')}"
    res = subprocess.run(cmd, shell=True, cwd=cwd, env=env)
    if res.returncode != 0:
        raise RuntimeError(f"Command failed with code {res.returncode}: {cmd}")

def patch_ssr_bundle(app_dir):
    ssr_dir = os.path.join(app_dir, ".output", "server", "_ssr")
    if not os.path.exists(ssr_dir):
        return
    for fname in os.listdir(ssr_dir):
        if fname.endswith(".mjs"):
            fpath = os.path.join(ssr_dir, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()
                modified = False
                if "var __exportAll = (all, no_symbols) => {" in content:
                    content = content.replace("var __exportAll = (all, no_symbols) => {", "function __exportAll(all, no_symbols) {")
                    modified = True
                if "__defProp(target" in content:
                    content = content.replace("__defProp(target", "Object.defineProperty(target")
                    modified = True
                if modified:
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"✓ Patched SSR runtime hoisting in {fname}")
            except Exception as e:
                print(f"Warning patching {fname}: {e}")

def generate_index_html(app_dir, port):
    print(f"Generating static index.html via SSR server on port {port}...")
    server_script = os.path.join(app_dir, ".output", "server", "index.mjs")
    if not os.path.exists(server_script):
        # Fallback to direct client index.html if already produced
        client_index = os.path.join(app_dir, ".output", "public", "index.html")
        if os.path.exists(client_index):
            print(f"✓ Using pre-existing client index.html at {client_index}")
            return
        raise RuntimeError(f"Server script not found: {server_script}")

    env = os.environ.copy()
    env["PORT"] = str(port)
    proc = subprocess.Popen(["node", server_script], cwd=app_dir, env=env)
    
    html = None
    try:
        for _ in range(30):
            time.sleep(0.4)
            res = subprocess.run(f"curl -s http://127.0.0.1:{port}/", shell=True, capture_output=True, text=True)
            if res.returncode == 0 and "<html" in res.stdout and "This page didn't load" not in res.stdout:
                html = res.stdout
                break
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

    if not html:
        raise RuntimeError(f"Failed to fetch valid rendered HTML from http://127.0.0.1:{port}/")

    if "<base " not in html and "<head>" in html:
        html = html.replace("<head>", '<head><base href="/" />', 1)

    target_index = os.path.join(app_dir, ".output", "public", "index.html")
    with open(target_index, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"✓ Generated index.html ({len(html)} chars) at {target_index}")

def sync_assets(src_dir, dst_dir):
    print(f"Syncing web assets from {src_dir} -> {dst_dir}")
    if os.path.exists(dst_dir):
        shutil.rmtree(dst_dir)
    shutil.copytree(src_dir, dst_dir)

def sanitize_ios_cap_config(app_dir):
    ios_public_dir = os.path.join(app_dir, "ios", "App", "App")
    cap_json = os.path.join(ios_public_dir, "capacitor.config.json")
    if os.path.exists(cap_json):
        import json
        with open(cap_json, "r") as f:
            cfg = json.load(f)
        if "server" in cfg:
            cfg.pop("server", None)
            with open(cap_json, "w") as f:
                json.dump(cfg, f, indent=2)
            print(f"✓ Sanitized server overrides in {cap_json}")

def build_customer_ios():
    print("\n============================================================")
    print("  [1/3] Building Customer iOS Bundle (com.quickpress.customer)")
    print("============================================================")
    cust_frontend_dir = os.path.join(ROOT_DIR, "customer-frontend")
    run_cmd("NITRO_PRESET=node-server VITE_API_BASE_URL=https://api.withquickpress.com npm run build:customer", ROOT_DIR)
    patch_ssr_bundle(cust_frontend_dir)
    generate_index_html(cust_frontend_dir, 8091)

    cust_web_dist = os.path.join(cust_frontend_dir, ".output", "public")
    cust_ios_assets = os.path.join(cust_frontend_dir, "ios", "App", "App", "public")
    sync_assets(cust_web_dist, cust_ios_assets)
    sanitize_ios_cap_config(cust_frontend_dir)

    print("Syncing Customer Capacitor iOS platform...")
    run_cmd("npx cap sync ios", cust_frontend_dir)
    print("✓ Customer App iOS Project Synchronized Successfully.")

def build_partner_ios():
    print("\n============================================================")
    print("  [2/3] Building Partner iOS Bundle (com.quickpress.partner)")
    print("============================================================")
    part_frontend_dir = os.path.join(ROOT_DIR, "partner-frontend")
    run_cmd("NITRO_PRESET=node-server VITE_API_BASE_URL=https://api.withquickpress.com npm run build:partner", ROOT_DIR)
    patch_ssr_bundle(part_frontend_dir)
    generate_index_html(part_frontend_dir, 8092)

    part_web_dist = os.path.join(part_frontend_dir, ".output", "public")
    part_ios_assets = os.path.join(part_frontend_dir, "ios", "App", "App", "public")
    sync_assets(part_web_dist, part_ios_assets)
    sanitize_ios_cap_config(part_frontend_dir)

    print("Syncing Partner Capacitor iOS platform...")
    run_cmd("npx cap sync ios", part_frontend_dir)
    print("✓ Partner App iOS Project Synchronized Successfully.")

def build_rider_ios():
    print("\n============================================================")
    print("  [3/3] Building Captain/Rider iOS Bundle (com.quickpress.rider)")
    print("============================================================")
    rdr_frontend_dir = os.path.join(ROOT_DIR, "rider-frontend")
    run_cmd("NITRO_PRESET=node-server VITE_API_BASE_URL=https://api.withquickpress.com npm run build:rider", ROOT_DIR)
    patch_ssr_bundle(rdr_frontend_dir)
    generate_index_html(rdr_frontend_dir, 8093)

    rdr_web_dist = os.path.join(rdr_frontend_dir, ".output", "public")
    rdr_ios_assets = os.path.join(rdr_frontend_dir, "ios", "App", "App", "public")
    sync_assets(rdr_web_dist, rdr_ios_assets)
    sanitize_ios_cap_config(rdr_frontend_dir)

    print("Syncing Rider Capacitor iOS platform...")
    run_cmd("npx cap sync ios", rdr_frontend_dir)
    print("✓ Captain App iOS Project Synchronized Successfully.")

def main():
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "all"

    print("============================================================")
    print(f"  QUICKPRESS iOS BUILD & SYNC AUTOMATION (Target: {target.upper()})")
    print("============================================================")

    if target in ("customer", "cust"):
        build_customer_ios()
    elif target in ("partner", "store"):
        build_partner_ios()
    elif target in ("rider", "captain"):
        build_rider_ios()
    else:
        build_customer_ios()
        build_partner_ios()
        build_rider_ios()

    print("\n============================================================")
    print(f"  ALL iOS NATIVE WORKSPACES READY & SYNCHRONIZED: {target.upper()}")
    print("============================================================")
    print("To open in Xcode:")
    print("  - Customer: open customer-frontend/ios/App/App.xcodeproj")
    print("  - Partner:  open partner-frontend/ios/App/App.xcodeproj")
    print("  - Captain:  open rider-frontend/ios/App/App.xcodeproj")

if __name__ == "__main__":
    main()

