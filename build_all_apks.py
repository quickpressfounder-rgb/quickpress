#!/usr/bin/env python3
import os
import shutil
import subprocess

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))

ARTIFACT_DIR = "/Users/himanshupal/.gemini/antigravity-ide/brain/3b6ce2cd-28f6-4eb0-a61c-f5e8e78f50a4"

def run_cmd(cmd, cwd=ROOT_DIR):
    print(f"\n===> Executing: {cmd} (in {cwd})")
    env = os.environ.copy()
    if "ANDROID_HOME" not in env or not env["ANDROID_HOME"]:
        sdk = os.path.expanduser("~/Library/Android/sdk")
        if os.path.exists(sdk):
            env["ANDROID_HOME"] = sdk
    res = subprocess.run(cmd, shell=True, cwd=cwd, env=env)
    if res.returncode != 0:
        raise RuntimeError(f"Command failed with code {res.returncode}: {cmd}")

def sync_assets(src_dir, dst_dir):
    print(f"Syncing web assets from {src_dir} -> {dst_dir}")
    if os.path.exists(dst_dir):
        shutil.rmtree(dst_dir)
    shutil.copytree(src_dir, dst_dir)

def main():
    print("============================================================")
    print("  QUICKPRESS 3-APP UPDATED APK BUILD AUTOMATION PROCESS")
    print("============================================================")

    apks_dir = os.path.join(ROOT_DIR, "apks")
    os.makedirs(apks_dir, exist_ok=True)

    # 1. CUSTOMER APP
    print("\n--- [1/3] Building Customer App ---")
    run_cmd("VITE_API_BASE_URL=https://quickpress-api-production.up.railway.app npm run build:customer", ROOT_DIR)
    cust_web_dist = os.path.join(ROOT_DIR, "customer-frontend", ".output", "public")
    cust_android_assets = os.path.join(ROOT_DIR, "customer-frontend", "android", "app", "src", "main", "assets", "public")
    sync_assets(cust_web_dist, cust_android_assets)

    cust_android_dir = os.path.join(ROOT_DIR, "customer-frontend", "android")
    run_cmd("./gradlew assembleDebug", cust_android_dir)

    cust_apk_src = os.path.join(cust_android_dir, "app", "build", "outputs", "apk", "debug", "app-debug.apk")
    if os.path.exists(cust_apk_src):
        shutil.copy2(cust_apk_src, os.path.join(ROOT_DIR, "QuickPress-Customer.apk"))
        shutil.copy2(cust_apk_src, os.path.join(apks_dir, "QuickPress-Customer.apk"))
        if os.path.exists(ARTIFACT_DIR):
            shutil.copy2(cust_apk_src, os.path.join(ARTIFACT_DIR, "QuickPress-Customer.apk"))
        print(f"✓ Customer APK updated: {os.path.getsize(cust_apk_src)} bytes")
    else:
        raise RuntimeError("Customer APK build artifact not found!")

    # 2. PARTNER APP
    print("\n--- [2/3] Building Partner App ---")
    run_cmd("VITE_API_BASE_URL=https://quickpress-api-production.up.railway.app npm run build:partner", ROOT_DIR)
    part_web_dist = os.path.join(ROOT_DIR, "partner-frontend", ".output", "public")
    part_android_assets = os.path.join(ROOT_DIR, "partner-frontend", "android", "app", "src", "main", "assets", "public")
    sync_assets(part_web_dist, part_android_assets)

    part_android_dir = os.path.join(ROOT_DIR, "partner-frontend", "android")
    run_cmd("./gradlew assembleDebug", part_android_dir)

    part_apk_src = os.path.join(part_android_dir, "app", "build", "outputs", "apk", "debug", "app-debug.apk")
    if os.path.exists(part_apk_src):
        shutil.copy2(part_apk_src, os.path.join(ROOT_DIR, "QuickPress-Partner.apk"))
        shutil.copy2(part_apk_src, os.path.join(apks_dir, "QuickPress-Partner.apk"))
        if os.path.exists(ARTIFACT_DIR):
            shutil.copy2(part_apk_src, os.path.join(ARTIFACT_DIR, "QuickPress-Partner.apk"))
        print(f"✓ Partner APK updated: {os.path.getsize(part_apk_src)} bytes")
    else:
        raise RuntimeError("Partner APK build artifact not found!")

    # 3. RIDER APP
    print("\n--- [3/3] Building Rider App ---")
    run_cmd("VITE_API_BASE_URL=https://quickpress-api-production.up.railway.app npm run build:rider", ROOT_DIR)
    rdr_web_dist = os.path.join(ROOT_DIR, "rider-frontend", ".output", "public")
    rdr_android_assets = os.path.join(ROOT_DIR, "rider-frontend", "android", "app", "src", "main", "assets", "public")
    sync_assets(rdr_web_dist, rdr_android_assets)

    rdr_android_dir = os.path.join(ROOT_DIR, "rider-frontend", "android")
    run_cmd("./gradlew assembleDebug", rdr_android_dir)

    rdr_apk_src = os.path.join(rdr_android_dir, "app", "build", "outputs", "apk", "debug", "app-debug.apk")
    if os.path.exists(rdr_apk_src):
        shutil.copy2(rdr_apk_src, os.path.join(ROOT_DIR, "QuickPress-Captain.apk"))
        shutil.copy2(rdr_apk_src, os.path.join(apks_dir, "QuickPress-Captain.apk"))
        if os.path.exists(ARTIFACT_DIR):
            shutil.copy2(rdr_apk_src, os.path.join(ARTIFACT_DIR, "QuickPress-Captain.apk"))
        print(f"✓ Rider APK updated: {os.path.getsize(rdr_apk_src)} bytes")
    else:
        raise RuntimeError("Rider APK build artifact not found!")

    print("\n============================================================")
    print("  ALL 3 UPDATED APKS BUILT AND DEPLOYED SUCCESSFULLY!")
    print("============================================================")

if __name__ == "__main__":
    main()
