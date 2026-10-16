#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))

ARTIFACT_DIR = "/Users/himanshupal/.gemini/antigravity-ide/brain/4d042ff9-b5fb-466e-9fd8-619baf1d44e8"
OLD_ARTIFACT_DIRS = [
    "/Users/himanshupal/.gemini/antigravity-ide/brain/d9a17d27-557a-4305-95cf-5af07e62d93b",
    "/Users/himanshupal/.gemini/antigravity-ide/brain/5704e1e6-724e-4d52-b79d-6a75a3604744",
    "/Users/himanshupal/.gemini/antigravity-ide/brain/9ae7c0d2-c173-49e5-8148-83bbec7e4565",
    "/Users/himanshupal/.gemini/antigravity-ide/brain/3ab9df93-0c34-4b9b-8fdb-99d5f33cf43f",
]

def run_cmd(cmd, cwd=ROOT_DIR):
    print(f"\n===> Executing: {cmd} (in {cwd})")
    env = os.environ.copy()
    node22 = "/Users/himanshupal/.nvm/versions/node/v22.23.2/bin"
    env["PATH"] = f"{node22}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:{env.get('PATH', '')}"
    if "ANDROID_HOME" not in env or not env["ANDROID_HOME"]:
        sdk = os.path.expanduser("~/Library/Android/sdk")
        if os.path.exists(sdk):
            env["ANDROID_HOME"] = sdk
            env["PATH"] = f"{sdk}/platform-tools:{sdk}/cmdline-tools/latest/bin:{env['PATH']}"
    res = subprocess.run(cmd, shell=True, cwd=cwd, env=env)
    if res.returncode != 0:
        raise RuntimeError(f"Command failed with code {res.returncode}: {cmd}")

def sync_assets(src_dir, dst_dir):
    print(f"Syncing web assets from {src_dir} -> {dst_dir}")
    if os.path.exists(dst_dir):
        shutil.rmtree(dst_dir)
    shutil.copytree(src_dir, dst_dir)

def copy_to_artifacts(src_apk, apk_name, apks_dir):
    target = os.path.join(apks_dir, apk_name)
    shutil.copy2(src_apk, target)
    print(f"✓ Saved to {target} ({os.path.getsize(src_apk)} bytes)")

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
    run_cmd("VITE_API_BASE_URL=https://quickpress-api-production.up.railway.app npm run build:customer", ROOT_DIR)
    cust_web_dist = os.path.join(ROOT_DIR, "customer-frontend", ".output", "public")
    cust_android_assets = os.path.join(ROOT_DIR, "customer-frontend", "android", "app", "src", "main", "assets", "public")
    sync_assets(cust_web_dist, cust_android_assets)

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

    # Sync iOS
    cust_ios_dir = os.path.join(ROOT_DIR, "customer-frontend", "ios")
    if os.path.exists(cust_ios_dir):
        print("Syncing Customer iOS project...")
        run_cmd("npx cap sync ios", os.path.join(ROOT_DIR, "customer-frontend"))

def build_partner(apks_dir):
    print("\n--- [Partner App] Building Partner App ---")
    run_cmd("VITE_API_BASE_URL=https://quickpress-api-production.up.railway.app npm run build:partner", ROOT_DIR)
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

def build_rider(apks_dir):
    print("\n--- [Rider App] Building Rider / Captain App (APK + Play Store AAB) ---")
    run_cmd("VITE_API_BASE_URL=https://quickpress-api-production.up.railway.app npm run build:rider", ROOT_DIR)
    rdr_web_dist = os.path.join(ROOT_DIR, "rider-frontend", ".output", "public")
    rdr_android_assets = os.path.join(ROOT_DIR, "rider-frontend", "android", "app", "src", "main", "assets", "public")
    sync_assets(rdr_web_dist, rdr_android_assets)

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

    # 3. Sync iOS
    rdr_ios_dir = os.path.join(ROOT_DIR, "rider-frontend", "ios")
    if os.path.exists(rdr_ios_dir):
        print("Syncing Rider iOS project...")
        run_cmd("npx cap sync ios", os.path.join(ROOT_DIR, "rider-frontend"))

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

