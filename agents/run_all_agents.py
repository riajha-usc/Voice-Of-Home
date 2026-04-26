import os
import signal
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
VENV_PYTHON = REPO_ROOT / ".venv" / "bin" / "python"
AGENT_FILES = [
    "cultural_nlp_agent.py",
    "dietary_agent.py",
    "voice_agent.py",
    "orchestrator_agent.py",
]


def main():
    processes = []
    env = os.environ.copy()
    python_exec = str(VENV_PYTHON if VENV_PYTHON.exists() else Path(sys.executable))

    try:
        for agent_file in AGENT_FILES:
            proc = subprocess.Popen([python_exec, str(ROOT / agent_file)], cwd=str(ROOT), env=env)
            processes.append(proc)

        for proc in processes:
            proc.wait()
    except KeyboardInterrupt:
        pass
    finally:
        for proc in processes:
            if proc.poll() is None:
                proc.send_signal(signal.SIGINT)
        for proc in processes:
            if proc.poll() is None:
                proc.wait(timeout=5)


if __name__ == "__main__":
    main()
