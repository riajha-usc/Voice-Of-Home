"""Shared helpers for running Voices of Home uAgents."""

from __future__ import annotations

import os


def get_agent_port(default_port: int) -> int:
    """Use AGENT_PORT locally, or PORT in hosted environments."""
    return int(os.getenv("AGENT_PORT", os.getenv("PORT", str(default_port))))
