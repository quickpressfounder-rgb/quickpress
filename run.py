import os
import sys

# Ensure backend-python is in python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend-python")
if os.path.exists(backend_dir):
    sys.path.insert(0, backend_dir)
    os.chdir(backend_dir)

import uvicorn

if __name__ == "__main__":
    port_str = os.environ.get("PORT", "8000")
    try:
        port = int(port_str)
    except (ValueError, TypeError):
        port = 8000

    print(f"Starting QuickPress API on 0.0.0.0:{port} with high-throughput engine...")

    loop_engine = "auto"
    try:
        import uvloop  # noqa: F401
        loop_engine = "uvloop"
    except ImportError:
        pass

    http_engine = "auto"
    try:
        import httptools  # noqa: F401
        http_engine = "httptools"
    except ImportError:
        pass

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        loop=loop_engine,
        http=http_engine,
        timeout_keep_alive=75,
        limit_concurrency=2048,
        backlog=4096,
        access_log=False,
    )
