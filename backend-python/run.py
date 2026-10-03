import os
import uvicorn

if __name__ == "__main__":
    port_str = os.environ.get("PORT", "8000")
    try:
        port = int(port_str)
    except (ValueError, TypeError):
        port = 8000

    print(f"Starting QuickPress API on 0.0.0.0:{port} with high-throughput engine...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        timeout_keep_alive=65,
        access_log=False,
    )
