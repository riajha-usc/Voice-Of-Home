#!/usr/bin/env python3
"""
Register the Voices of Home uAgents on Agentverse.

This script keeps registration separate from the runtime swarm so you can
publish or refresh listings without changing how the agents talk to each other.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


AGENTVERSE_BASE_URL = os.getenv("AGENTVERSE_BASE_URL", "https://agentverse.ai")
AGENTVERSE_AGENTS_API = f"{AGENTVERSE_BASE_URL}/v2/agents"
AGENTVERSE_IDENTITY_API = f"{AGENTVERSE_BASE_URL}/v2/identity"
REPO_ROOT = Path(__file__).resolve().parent.parent
VENV_PYTHON = REPO_ROOT / ".venv" / "bin" / "python"


def ensure_venv_python() -> None:
    """Re-run the script with the repo virtualenv if it exists."""
    if VENV_PYTHON.exists() and Path(sys.executable).resolve() != VENV_PYTHON.resolve():
        os.execv(str(VENV_PYTHON), [str(VENV_PYTHON), *sys.argv])


@dataclass(frozen=True)
class AgentSpec:
    key: str
    name: str
    seed_suffix: str
    endpoint_env: str
    handle_env: str
    summary: str
    usage: str


AGENTS: tuple[AgentSpec, ...] = (
    AgentSpec(
        key="cultural_nlp",
        name="VoH Cultural NLP Agent",
        seed_suffix="",
        endpoint_env="VOH_CULTURAL_NLP_PUBLIC_URL",
        handle_env="VOH_CULTURAL_NLP_HANDLE",
        summary=(
            "Maps cultural symptom expressions to clinical insights using the "
            "Voices of Home cultural knowledge base."
        ),
        usage="Send symptom phrases in the form `expression|language_code`.",
    ),
    AgentSpec(
        key="dietary",
        name="VoH Dietary Agent",
        seed_suffix="_dietary",
        endpoint_env="VOH_DIETARY_PUBLIC_URL",
        handle_env="VOH_DIETARY_HANDLE",
        summary=(
            "Identifies familiar dishes and returns culturally adapted hospital "
            "meal guidance."
        ),
        usage="Send a dish name such as `pho`, `arroz con pollo`, or `congee`.",
    ),
    AgentSpec(
        key="voice",
        name="VoH Voice Synthesis Agent",
        seed_suffix="_voice",
        endpoint_env="VOH_VOICE_PUBLIC_URL",
        handle_env="VOH_VOICE_HANDLE",
        summary=(
            "Prepares care instructions for multilingual text-to-speech delivery."
        ),
        usage="Send care instructions and optionally append a language code.",
    ),
    AgentSpec(
        key="orchestrator",
        name="VoH Orchestrator Agent",
        seed_suffix="_orchestrator",
        endpoint_env="VOH_ORCHESTRATOR_PUBLIC_URL",
        handle_env="VOH_ORCHESTRATOR_HANDLE",
        summary=(
            "Routes incoming patient and family questions to the specialized swarm."
        ),
        usage="Send a general request and let the orchestrator direct it.",
    ),
)


def build_readme(spec: AgentSpec) -> str:
    return (
        f"# {spec.name}\n\n"
        f"{spec.summary}\n\n"
        "## What It Does\n\n"
        f"- {spec.usage}\n"
        "- Runs with mailbox support and published chat manifests.\n"
        "- Part of the Voices of Home healthcare swarm.\n"
    )


def request_json(method: str, url: str, token: str | None = None, payload: dict | None = None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method=method.upper())

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        parsed = None
        if raw:
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = raw
        return exc.code, parsed if parsed is not None else {}
    except urllib.error.URLError as exc:
        return -1, {"error": str(exc)}


def format_error(detail) -> str:
    if isinstance(detail, dict):
        return json.dumps(detail, ensure_ascii=False)
    return str(detail)


def load_env_file(path: str = ".env") -> None:
    """Load simple KEY=VALUE pairs from a local .env file if present."""
    if not os.path.exists(path):
        return

    with open(path, "r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("'").strip('"')
            os.environ.setdefault(key, value)


def iter_specs() -> Iterable[AgentSpec]:
    return AGENTS


def main() -> int:
    ensure_venv_python()

    from uagents_core.identity import Identity
    from uagents_core.contrib.protocols.chat import chat_protocol_spec
    from uagents_core.registration import (
        AgentProfile,
        AgentRegistrationAttestation,
        AgentverseConnectRequest,
        ChallengeResponse,
        IdentityProof,
        RegistrationRequest,
    )
    from uagents_core.types import AgentEndpoint

    load_env_file()

    token = os.getenv("FETCH_AGENTVERSE_API_KEY") or os.getenv("AGENTVERSE_API_KEY")
    if not token:
        print(
            "Missing FETCH_AGENTVERSE_API_KEY. Add your Agentverse API key to the "
            "environment before registering.",
            file=sys.stderr,
        )
        return 1

    base_seed = os.getenv("FETCH_AGENT_SEED_PHRASE")
    if not base_seed:
        print(
            "Missing FETCH_AGENT_SEED_PHRASE. The registration address must match the "
            "seed used by the running agent.",
            file=sys.stderr,
        )
        return 1

    exit_code = 0
    for spec in iter_specs():
        endpoint = os.getenv(spec.endpoint_env)
        if not endpoint:
            print(f"Skipping {spec.name}: {spec.endpoint_env} is not set.", file=sys.stderr)
            exit_code = 1
            continue

        identity = Identity.from_seed(base_seed + spec.seed_suffix, 0)
        handle = os.getenv(spec.handle_env)
        metadata = {
            "project": "Voices of Home",
            "summary": spec.summary,
            "readme": build_readme(spec),
            "usage": spec.usage,
        }
        if handle:
            metadata["handle"] = handle

        print(f"Registering {spec.name} -> {endpoint}")
        headers = {"Authorization": f"Bearer {token}"}
        agent_address = identity.address

        status, existing = request_json(
            "GET",
            f"{AGENTVERSE_AGENTS_API}/{agent_address}",
            token=token,
        )

        if status == -1:
            print(
                "  could not reach Agentverse from this environment. The service is currently blocking scripted access or DNS/network resolution is unavailable.",
                file=sys.stderr,
            )
            print(f"  details: {format_error(existing)}", file=sys.stderr)
            exit_code = 1
            continue

        if status == 403:
            print(
                "  Agentverse rejected the API key while checking the agent. "
                "That usually means the token is invalid, expired, or not scoped for Agentverse registration.",
                file=sys.stderr,
            )
            print(f"  details: {format_error(existing)}", file=sys.stderr)
            exit_code = 1
            continue

        if status not in (200, 404):
            print(f"  unexpected status while checking agent: {status} {format_error(existing)}", file=sys.stderr)
            exit_code = 1
            continue

        if status == 404:
            challenge_status, challenge_payload = request_json(
                "GET",
                f"{AGENTVERSE_IDENTITY_API}/{agent_address}/challenge",
                token=token,
            )
            if challenge_status != 200 or not isinstance(challenge_payload, dict):
                print(
                    f"  failed to fetch identity challenge: {challenge_status} {format_error(challenge_payload)}",
                    file=sys.stderr,
                )
                exit_code = 1
                continue

            challenge = ChallengeResponse.model_validate(challenge_payload)
            identity_proof = IdentityProof(
                address=agent_address,
                challenge=challenge.challenge,
                challenge_response=identity.sign(challenge.challenge.encode()),
            )

            proof_status, proof_payload = request_json(
                "POST",
                f"{AGENTVERSE_IDENTITY_API}",
                token=token,
                payload=identity_proof.model_dump(),
            )
            if proof_status not in (200, 201):
                print(
                    f"  failed to submit identity proof: {proof_status} {format_error(proof_payload)}",
                    file=sys.stderr,
                )
                exit_code = 1
                continue

        reg_request = RegistrationRequest(
            address=agent_address,
            name=spec.name,
            handle=handle,
            url=endpoint,
            agent_type="uagent",
            profile=AgentProfile(
                description=spec.summary,
                readme=build_readme(spec),
                avatar_url="",
            ),
            endpoints=[AgentEndpoint(url=endpoint, weight=1)],
            protocols=[chat_protocol_spec.digest],
            metadata=metadata,
        )

        reg_status, reg_payload = request_json(
            "POST",
            AGENTVERSE_AGENTS_API,
            token=token,
            payload=reg_request.model_dump(exclude_none=True),
        )
        if reg_status not in (200, 201):
            print(f"  registration failed: {reg_status} {format_error(reg_payload)}", file=sys.stderr)
            exit_code = 1
            continue

        print("  success: true")

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
