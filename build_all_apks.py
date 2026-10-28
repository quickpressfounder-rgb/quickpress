#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))

ARTIFACT_DIR = "/Users/himanshupal/.gemini/antigravity-ide/brain/a52b7436-8efd-4bee-8065-5cb031bc4852"
OLD_ARTIFACT_DIRS = [
    "/Users/himanshupal/.gemini/antigravity-ide/brain/2be060e2-3255-4260-8969-7501366a1753",
    "/Users/himanshupal/.gemini/antigravity-ide/brain/77318238-9621-42dc-99c7-efff7401c879",
    "/Users/himanshupal/.gemini/antigravity-ide/brain/bf9cca5c-94b7-4a2d-9ac5-b3a72ec05c29",
    "/Users/himanshupal/.gemini/antigravity-ide/brain/4d042ff9-b5fb-466e-9fd8-619baf1d44e8",
    "/Users/himanshupal/.gemini/antigravity-ide/brain/d9a17d27-557a-4305-95cf-5af07e62d93b",
    "/Users/himanshupal/.gemini/antigravity-ide/brain/5704e1e6-724e-4d52-b79d-6a75a3604744",
    "/Users/himanshupal/.gemini/antigravity-ide/brain/9ae7c0d2-c173-49e5-8148-83bbec7e4565",
    "/Users/himanshupal/.gemini/antigravity-ide/brain/3ab9df93-0c34-4b9b-8fdb-99d5f33cf43f",
]

def run_cmd(cmd, cwd=ROOT_DIR):
    print(f"\n===> Executing: {cmd} (in {cwd})")
    env = os.environ.copy()
    node_bins = [
        "/Users/himanshupal/.nvm/versions/node/v22.23.2/bin",
        "/Users/himanshupal/.nvm/versions/node/v20.20.2/bin",
    ]
    node_path_prefix = ":".join(b for b in node_bins if os.path.exists(b))
    env["PATH"] = f"{node_path_prefix}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:{env.get('PATH', '')}"
    if "ANDROID_HOME" not in env or not env["ANDROID_HOME"]:
        sdk = os.path.expanduser("~/Library/Android/sdk")
        if os.path.exists(sdk):
            env["ANDROID_HOME"] = sdk
            env["PATH"] = f"{sdk}/platform-tools:{sdk}/cmdline-tools/latest/bin:{env['PATH']}"
    res = subprocess.run(cmd, shell=True, cwd=cwd, env=env)
    if res.returncode != 0:
        raise RuntimeError(f"Command failed with code {res.returncode}: {cmd}")

def generate_index_html(app_dir, port):
    print(f"Generating static index.html via SSR server on port {port}...")
    server_script = os.path.join(app_dir, ".output", "server", "index.mjs")
    if not os.path.exists(server_script):
        raise RuntimeError(f"Server script not found: {server_script}")

    env = os.environ.copy()
    env["PORT"] = str(port)
    proc = subprocess.Popen(["node", server_script], cwd=app_dir, env=env)
    
    html = None
    try:
        import time
        for _ in range(30):
            time.sleep(0.4)
            res = subprocess.run(f"curl -s http://127.0.0.1:{port}/", shell=True, capture_output=True, text=True)
            if res.returncode == 0 and "<html" in res.stdout:
                html = res.stdout
                break
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

    if not html:
        raise RuntimeError(f"Failed to fetch rendered HTML from http://127.0.0.1:{port}/")

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

def copy_to_artifacts(src_apk, apk_name, apks_dir):
    target = os.path.join(apks_dir, apk_name)
    shutil.copy2(src_apk, target)
    print(f"✓ Saved to {target} ({os.path.getsize(src_apk)} bytes)")

    # Mirror APK to website public assets so withquickpress.com serves updated APKs
    website_apk_dir = os.path.join(ROOT_DIR, "website", "public", "apks")
    if os.path.exists(website_apk_dir) and apk_name.endswith(".apk"):
        shutil.copy2(src_apk, os.path.join(website_apk_dir, apk_name))
        print(f"✓ Mirrored to website public apks: {apk_name}")

    if os.path.exists(ARTIFACT_DIR):
        artifact_target = os.path.join(ARTIFACT_DIR, apk_name)
        shutil.copy2(src_apk, artifact_target)
        print(f"✓ Copied to artifact dir: {artifact_target}")

    for old_dir in OLD_ARTIFACT_DIRS:
        if os.path.exists(old_dir):
            try:
                shutil.copy2(src_apk, os.path.join(old_dir, apk_name))
            except Exception:
                pass

def build_customer(apks_dir):
    print("\n--- [Customer App] Building Customer App ---")
    run_cmd("NITRO_PRESET=node-server VITE_API_BASE_URL=https://api.withquickpress.com npm run build:customer", ROOT_DIR)
    cust_frontend_dir = os.path.join(ROOT_DIR, "customer-frontend")
    generate_index_html(cust_frontend_dir, 8091)

    cust_web_dist = os.path.join(cust_frontend_dir, ".output", "public")
    cust_android_assets = os.path.join(cust_frontend_dir, "android", "app", "src", "main", "assets", "public")
    sync_assets(cust_web_dist, cust_android_assets)

    # Ensure Capacitor config in Android assets does not load an external URL (pure native offline-ready assets)
    cust_cap_json = os.path.join(cust_frontend_dir, "android", "app", "src", "main", "assets", "capacitor.config.json")
    if os.path.exists(cust_cap_json):
        import json
        with open(cust_cap_json, "r") as f:
            cfg = json.load(f)
        cfg.pop("server", None)
        with open(cust_cap_json, "w") as f:
            json.dump(cfg, f, indent=2)

    cust_android_dir = os.path.join(ROOT_DIR, "customer-frontend", "android")
    run_cmd("./gradlew assembleDebug", cust_android_dir)

    cust_apk_src = os.path.join(cust_android_dir, "app", "build", "outputs", "apk", "debug", "app-debug.apk")
    if os.path.exists(cust_apk_src):
        copy_to_artifacts(cust_apk_src, "QuickPress-Customer.apk", apks_dir)
    else:
        raise RuntimeError("Customer APK build artifact not found!")

    # Build AAB for Play Store
    run_cmd("./gradlew bundleDebug", cust_android_dir)
    cust_aab_src = os.path.join(cust_android_dir, "app", "build", "outputs", "bundle", "debug", "app-debug.aab")
    if os.path.exists(cust_aab_src):
        copy_to_artifacts(cust_aab_src, "QuickPress-Customer.aab", apks_dir)

    # Sync iOS (Optional)
    cust_ios_dir = os.path.join(ROOT_DIR, "customer-frontend", "ios")
    if os.path.exists(cust_ios_dir):
        print("Syncing Customer iOS project...")
        try:
            run_cmd("npx cap sync ios", os.path.join(ROOT_DIR, "customer-frontend"))
        except Exception as e:
            print(f"⚠️ iOS sync skipped or failed (non-blocking for APK): {e}")

def build_partner(apks_dir):
    print("\n--- [Partner App] Building Partner App ---")
    run_cmd("VITE_API_BASE_URL=https://api.withquickpress.com npm run build:partner", ROOT_DIR)
    part_web_dist = os.path.join(ROOT_DIR, "partner-frontend", ".output", "public")
    part_android_assets = os.path.join(ROOT_DIR, "partner-frontend", "android", "app", "src", "main", "assets", "public")
    sync_assets(part_web_dist, part_android_assets)

    part_android_dir = os.path.join(ROOT_DIR, "partner-frontend", "android")
    run_cmd("./gradlew assembleDebug", part_android_dir)

    part_apk_src = os.path.join(part_android_dir, "app", "build", "outputs", "apk", "debug", "app-debug.apk")
    if os.path.exists(part_apk_src):
        copy_to_artifacts(part_apk_src, "QuickPress-Partner.apk", apks_dir)
    else:
        raise RuntimeError("Partner APK build artifact not found!")

    # Build AAB for Play Store
    print("\n--- [Partner App] Building Google Play Store AAB Bundle ---")
    run_cmd("./gradlew bundleDebug", part_android_dir)
    part_aab_src = os.path.join(part_android_dir, "app", "build", "outputs", "bundle", "debug", "app-debug.aab")
    if os.path.exists(part_aab_src):
        copy_to_artifacts(part_aab_src, "QuickPress-Partner.aab", apks_dir)

def build_rider(apks_dir):
    print("\n--- [Rider App] Building Rider / Captain App (APK + Play Store AAB) ---")
    run_cmd("NITRO_PRESET=node-server VITE_API_BASE_URL=https://api.withquickpress.com npm run build:rider", ROOT_DIR)
    rdr_frontend_dir = os.path.join(ROOT_DIR, "rider-frontend")
    generate_index_html(rdr_frontend_dir, 8092)

    rdr_web_dist = os.path.join(rdr_frontend_dir, ".output", "public")
    rdr_android_assets = os.path.join(rdr_frontend_dir, "android", "app", "src", "main", "assets", "public")
    sync_assets(rdr_web_dist, rdr_android_assets)

    # Ensure Capacitor config in Android assets does not load Partner Portal or external URL
    rdr_cap_json = os.path.join(rdr_frontend_dir, "android", "app", "src", "main", "assets", "capacitor.config.json")
    if os.path.exists(rdr_cap_json):
        import json
        with open(rdr_cap_json, "r") as f:
            cfg = json.load(f)
        cfg.pop("server", None)
        with open(rdr_cap_json, "w") as f:
            json.dump(cfg, f, indent=2)

    rdr_android_dir = os.path.join(ROOT_DIR, "rider-frontend", "android")
    # 1. Build APK (for direct device installation)
    run_cmd("./gradlew assembleDebug", rdr_android_dir)
    rdr_apk_src = os.path.join(rdr_android_dir, "app", "build", "outputs", "apk", "debug", "app-debug.apk")
    if os.path.exists(rdr_apk_src):
        copy_to_artifacts(rdr_apk_src, "QuickPress-Captain.apk", apks_dir)
    else:
        raise RuntimeError("Rider APK build artifact not found!")

    # 2. Build AAB (for Google Play Console)
    print("\n--- [Rider App] Building Google Play Store AAB Bundle ---")
    run_cmd("./gradlew bundleDebug", rdr_android_dir)
    rdr_aab_src = os.path.join(rdr_android_dir, "app", "build", "outputs", "bundle", "debug", "app-debug.aab")
    if os.path.exists(rdr_aab_src):
        copy_to_artifacts(rdr_aab_src, "QuickPress-Captain.aab", apks_dir)

    # 3. Sync iOS (Optional)
    rdr_ios_dir = os.path.join(ROOT_DIR, "rider-frontend", "ios")
    if os.path.exists(rdr_ios_dir):
        print("Syncing Rider iOS project...")
        try:
            run_cmd("npx cap sync ios", os.path.join(ROOT_DIR, "rider-frontend"))
        except Exception as e:
            print(f"⚠️ iOS sync skipped or failed (non-blocking for APK): {e}")

def main():
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "all"

    print("============================================================")
    print(f"  QUICKPRESS APK BUILD AUTOMATION PROCESS (Target: {target.upper()})")
    print("============================================================")

    apks_dir = os.path.join(ROOT_DIR, "apks")
    os.makedirs(apks_dir, exist_ok=True)
    if os.path.exists(ARTIFACT_DIR):
        os.makedirs(ARTIFACT_DIR, exist_ok=True)

    if target in ("rider", "captain"):
        build_rider(apks_dir)
    elif target == "customer":
        build_customer(apks_dir)
    elif target == "partner":
        build_partner(apks_dir)
    else:
        build_customer(apks_dir)
        build_partner(apks_dir)
        build_rider(apks_dir)

    print("\n============================================================")
    print(f"  BUILD FINISHED SUCCESSFULLY FOR: {target.upper()}")
    print("============================================================")

if __name__ == "__main__":
    main()

