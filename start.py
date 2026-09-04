#!/usr/bin/env python3
"""
RiskSentinel AI - Simple Unified Startup
Runs both FastAPI backend and Vite frontend.
Usage: python start.py
"""
import os
import sys
import subprocess
import time
import signal
import atexit
from pathlib import Path

# Global process holders
backend_proc = None
frontend_proc = None

def cleanup():
    """Kill child processes on exit."""
    global backend_proc, frontend_proc
    print("\nShutting down servers...")
    for proc, name in [(backend_proc, "Backend"), (frontend_proc, "Frontend")]:
        if proc and proc.poll() is None:
            print(f"Stopping {name} (PID: {proc.pid})...")
            try:
                if sys.platform == "win32":
                    subprocess.run(
                        f"taskkill /F /T /PID {proc.pid}",
                        shell=True,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
                else:
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except Exception as e:
                print(f"Error stopping {name}: {e}")

atexit.register(cleanup)

def kill_port_owners(port: int):
    """Release port if occupied by zombie processes."""
    if sys.platform == "win32":
        try:
            out = subprocess.check_output(
                f"powershell -Command \"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique\"",
                shell=True, text=True
            ).strip()
            for pid_str in out.splitlines():
                pid = pid_str.strip()
                if pid and pid.isdigit() and int(pid) != os.getpid():
                    subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

def run_backend():
    """Start FastAPI backend with uvicorn."""
    backend_dir = Path(__file__).parent / "backend"
    if not backend_dir.exists():
        print(f"Backend directory not found: {backend_dir}")
        return None

    kill_port_owners(8000)
    python_exe = sys.executable
    print(f"Starting FastAPI backend on http://localhost:8000")

    try:
        cmd = [python_exe, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
        proc = subprocess.Popen(
            cmd,
            cwd=str(backend_dir),
            stdout=None,
            stderr=None,
            shell=False,
        )
        return proc
    except Exception as e:
        print(f"Failed to start backend: {e}")
        return None

def run_frontend():
    """Start Vite frontend dev server."""
    frontend_dir = Path(__file__).parent / "frontend"
    if not frontend_dir.exists():
        print(f"Frontend directory not found: {frontend_dir}")
        return None

    kill_port_owners(5173)
    print(f"Starting Vite frontend on http://localhost:5173")
    
    try:
        if sys.platform == "win32":
            cmd = ["npm.cmd", "run", "dev"]
        else:
            cmd = ["npm", "run", "dev"]
            
        proc = subprocess.Popen(
            cmd,
            cwd=str(frontend_dir),
            stdout=None,
            stderr=None,
            shell=False,
        )
        return proc
    except Exception as e:
        print(f"Failed to start frontend: {e}")
        return None

def wait_for_server(url, name, timeout=60):
    """Wait for server to respond to health check."""
    import urllib.request
    import urllib.error
    
    print(f"Waiting for {name} at {url}...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "RiskSentinel-StartScript/2.0"}
            )
            with urllib.request.urlopen(req, timeout=2) as response:
                if response.status in (200, 204, 301, 302, 307, 308):
                    print(f"{name} is ready!")
                    return True
        except urllib.error.HTTPError as e:
            if e.code in (200, 404, 405):  # Server is alive and responding
                print(f"{name} is ready!")
                return True
            time.sleep(1)
        except Exception:
            time.sleep(1)
    print(f"{name} did not start within {timeout}s")
    return False

def main():
    global backend_proc, frontend_proc
    
    print("=========================================")
    print("     RiskSentinel AI - Unified Start")
    print("=========================================\n")
    
    # Start Backend
    print("Starting backend...")
    backend_proc = run_backend()
    if not backend_proc:
        print("Failed to start backend. Exiting.")
        return 1
    
    # Give backend a moment to start
    time.sleep(3)
    
    # Start Frontend
    print("Starting frontend...")
    frontend_proc = run_frontend()
    if not frontend_proc:
        print("Failed to start frontend. Exiting.")
        cleanup()
        return 1
    
    # Wait for servers to be ready
    print("Waiting for servers to initialize (backend loads ML models, this takes ~30s)...")
    backend_ready = wait_for_server("http://localhost:8000/api/health", "Backend API", timeout=60)
    frontend_ready = wait_for_server("http://localhost:5173", "Frontend", timeout=45)
    
    if not backend_ready or not frontend_ready:
        print("One or more servers failed to start properly")
        cleanup()
        return 1
    
    # Print access URLs
    print("\n=========================================")
    print("         Servers Running Successfully")
    print("=========================================")
    print("Backend API:   http://localhost:8000")
    print("API Docs:      http://localhost:8000/docs")
    print("Health Check:  http://localhost:8000/api/health")
    print("Frontend:      http://localhost:5173")
    print("Evaluator:     http://localhost:5173/evaluate")
    print("Command Center:http://localhost:5173/")
    print("Co-Pilot:      http://localhost:5173/copilot")
    print("\nPress Ctrl+C to stop both servers\n")
    
    # Keep main thread alive
    try:
        while True:
            if backend_proc.poll() is not None:
                print("Backend process died unexpectedly!")
                break
            if frontend_proc.poll() is not None:
                print("Frontend process died unexpectedly!")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutdown requested...")
    
    cleanup()
    return 0

if __name__ == "__main__":
    sys.exit(main())