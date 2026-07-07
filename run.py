import os
import sys
import subprocess
import time
import threading

def install_backend_deps():
    print("Checking backend dependencies...")
    required = ["fastapi", "uvicorn", "sqlalchemy"]
    
    # Try importing, if failure, install
    missing = []
    for pkg in required:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
            
    if missing:
        print(f"Missing dependencies: {missing}. Installing via pip...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
            print("Backend dependencies installed successfully.")
        except Exception as e:
            print(f"Failed to install dependencies: {e}. Please run 'pip install fastapi uvicorn sqlalchemy' manually.")

def run_backend():
    print("Starting AURA Backend (FastAPI on http://localhost:8000)...")
    # Change working dir to workspace root
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Set pythonpath
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.dirname(os.path.abspath(__file__))
    
    subprocess.run([
        sys.executable, "-m", "uvicorn", "backend.main:app", 
        "--host", "0.0.0.0", "--port", "8000", "--reload"
    ], env=env)

def run_frontend():
    print("Starting AURA Frontend (Vite on http://localhost:5173)...")
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    os.chdir(frontend_dir)
    
    # Run npm run dev
    # Check if windows
    shell = True if os.name == 'nt' else False
    subprocess.run(["npm", "run", "dev", "--", "--port", "5173"], shell=shell)

if __name__ == "__main__":
    install_backend_deps()
    
    # Start backend thread
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    backend_thread.start()
    
    # Give backend a second to boot up
    time.sleep(2)
    
    # Run frontend in main thread
    try:
        run_frontend()
    except KeyboardInterrupt:
        print("\nStopping AURA Nervous System. Goodbye!")
        sys.exit(0)
