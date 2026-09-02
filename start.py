#!/usr/bin/env python3
"""Start the RiskSentinel backend and frontend with a single command."""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
VENV_DIR = ROOT / ".venv"


def log(message: str) -> None:
    print(f"[launch] {message}")


def run_command(command: list[str], cwd: Path | None = None) -> int:
    log(f"{' '.join(command)}")
    result = subprocess.run(command, cwd=str(cwd) if cwd else None)
    return result.returncode


def get_venv_python() -> Path:
    if platform.system() == "Windows":
        candidate = VENV_DIR / "Scripts" / "python.exe"
    else:
        candidate = VENV_DIR / "bin" / "python"

    if candidate.exists():
        return candidate

    log("Creating Python virtual environment at .venv")
    if run_command([sys.executable, "-m", "venv", str(VENV_DIR)], cwd=ROOT) != 0:
        raise RuntimeError("Failed to create the virtual environment.")

    if not candidate.exists():
        raise RuntimeError(f"Virtual environment python not found: {candidate}")

    return candidate


def ensure_backend_dependencies(python_path: Path) -> None:
    requirements_file = BACKEND_DIR / "requirements.txt"
    if not requirements_file.exists():
        raise FileNotFoundError(f"Missing backend requirements file: {requirements_file}")

    log("Installing backend Python requirements")
    if run_command([str(python_path), "-m", "pip", "install", "-r", str(requirements_file)], cwd=ROOT) != 0:
        raise RuntimeError("Failed to install backend requirements.")


def ensure_frontend_dependencies() -> None:
    if not FRONTEND_DIR.exists():
        raise FileNotFoundError(f"Missing frontend folder: {FRONTEND_DIR}")

    if not (FRONTEND_DIR / "node_modules").exists():
        log("Installing frontend Node dependencies")
        if run_command(["npm", "install"], cwd=FRONTEND_DIR) != 0:
            raise RuntimeError("Failed to install frontend dependencies.")


def start_attached(command: list[str], cwd: Path) -> subprocess.Popen:
    log(f"Starting: {' '.join(command)} in {cwd}")
    return subprocess.Popen(
        command,
        cwd=str(cwd),
        stdin=sys.stdin,
        stdout=sys.stdout,
        stderr=sys.stderr,
    )


def stop_process(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return

    log(f"Stopping PID {process.pid}")
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=10)


def main() -> int:
    if not BACKEND_DIR.exists():
        raise FileNotFoundError(f"Missing backend folder: {BACKEND_DIR}")

    if not FRONTEND_DIR.exists():
        raise FileNotFoundError(f"Missing frontend folder: {FRONTEND_DIR}")

    if shutil.which("npm") is None:
        raise RuntimeError("Node.js/npm is required but was not found in PATH.")

    python_path = get_venv_python()
    ensure_backend_dependencies(python_path)
    ensure_frontend_dependencies()

    backend_proc = start_attached([str(python_path), "run.py"], BACKEND_DIR)
    frontend_cmd = ["npm.cmd", "run", "dev"] if os.name == "nt" else ["npm", "run", "dev"]
    frontend_proc = start_attached(frontend_cmd, FRONTEND_DIR)

    try:
        print("\nRiskSentinel started in the current IDE terminal.")
        print("Backend: http://localhost:8000")
        print("Frontend: http://localhost:5173")
        print("Press Ctrl+C once to stop both services.\n")

        while True:
            if backend_proc.poll() is not None:
                print("\nBackend exited unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("\nFrontend exited unexpectedly.")
                break
            import time
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
    finally:
        stop_process(frontend_proc)
        stop_process(backend_proc)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - CLI convenience script
        print(f"[launch] ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
