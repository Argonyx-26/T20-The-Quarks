"""CLI entry point for running sensor adapters standalone.

Usage:
    python -m sensors.run vision   [--asset LAB-01] [--zone RESTRICTED-LAB] [--once] [--manual]
    python -m sensors.run endpoint [--asset LAB-01] [--zone RESTRICTED-LAB] [--once]
    python -m sensors.run network  [--asset LAB-01] [--zone RESTRICTED-LAB] [--once] [--spike]
    python -m sensors.run replay   <scenario_name> [--live] [--speed 1.0]
    python -m sensors.run replay   --list
"""
from __future__ import annotations

import argparse
import json
import sys
import time

from . import config
from .common.client import BackendClient, BackendUnreachable, EventRejected
from .endpoint_adapter import EndpointAdapter
from .network_adapter import NetworkAdapter
from .replay_adapter import ReplayAdapter
from .vision_adapter import VisionAdapter


def _common_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--asset", default=config.DEFAULT_ASSET_ID)
    p.add_argument("--zone", default=config.DEFAULT_ZONE_ID)
    p.add_argument("--once", action="store_true", help="poll a single time and exit")
    p.add_argument("--interval", type=float, default=None)


def _print_event(result: dict) -> None:
    print(json.dumps(result, indent=2, default=str))


def cmd_vision(args: argparse.Namespace) -> int:
    client = BackendClient()
    adapter = VisionAdapter(client, asset_id=args.asset, zone_id=args.zone)

    if args.manual:
        try:
            result = adapter.emit_manual_trigger()
        except (BackendUnreachable, EventRejected) as exc:
            print(f"[ERROR] {exc}", file=sys.stderr)
            return 1
        _print_event(result)
        return 0

    try:
        adapter.start()
    except RuntimeError as exc:
        print(f"[DEGRADED] vision: {exc} -- use --manual for an operator-triggered fallback", file=sys.stderr)
        return 1

    interval = args.interval or config.VISION_POLL_INTERVAL_SECONDS
    try:
        if args.once:
            result = adapter.poll_once()
            if result:
                _print_event(result)
            else:
                print("no person detected this frame")
        else:
            adapter.run_loop(interval=interval, on_event=_print_event)
    finally:
        adapter.stop()
    return 0


def cmd_endpoint(args: argparse.Namespace) -> int:
    client = BackendClient()
    adapter = EndpointAdapter(client, asset_id=args.asset, zone_id=args.zone)
    adapter.start()
    interval = args.interval or config.ENDPOINT_POLL_INTERVAL_SECONDS
    try:
        if args.once:
            result = adapter.poll_once()
            if result:
                _print_event(result)
            else:
                print("no new device detected")
        else:
            print(f"watching for USB attach events (fallback dir: {adapter.watch_dir})")
            adapter.run_loop(interval=interval, on_event=_print_event)
    finally:
        adapter.stop()
    return 0


def cmd_network(args: argparse.Namespace) -> int:
    client = BackendClient()
    adapter = NetworkAdapter(client, asset_id=args.asset, zone_id=args.zone)
    adapter.start()
    interval = args.interval or config.NETWORK_POLL_INTERVAL_SECONDS

    if args.spike:
        import threading

        threading.Thread(
            target=NetworkAdapter.generate_benign_spike, kwargs={"duration_seconds": 3.0}, daemon=True
        ).start()
        print("generating a real benign loopback traffic spike for 3s...")

    try:
        if args.once:
            result = adapter.poll_once()
            if result:
                _print_event(result)
            else:
                print("no anomaly (baseline warming up or within normal range)")
        else:
            adapter.run_loop(interval=interval, on_event=_print_event)
    finally:
        adapter.stop()
    return 0


def cmd_replay(args: argparse.Namespace) -> int:
    client = BackendClient()
    adapter = ReplayAdapter(client)
    if args.list:
        for name in adapter.list_scenarios():
            print(name)
        return 0
    if not args.scenario:
        print("scenario name required (or use --list)", file=sys.stderr)
        return 2
    result = adapter.run_scenario(args.scenario, live=args.live, speed=args.speed)
    _print_event(result)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="sensors.run")
    sub = parser.add_subparsers(dest="command", required=True)

    p_vision = sub.add_parser("vision")
    _common_args(p_vision)
    p_vision.add_argument("--manual", action="store_true", help="emit via operator trigger, skip camera")
    p_vision.set_defaults(func=cmd_vision)

    p_endpoint = sub.add_parser("endpoint")
    _common_args(p_endpoint)
    p_endpoint.set_defaults(func=cmd_endpoint)

    p_network = sub.add_parser("network")
    _common_args(p_network)
    p_network.add_argument("--spike", action="store_true", help="generate a real benign loopback traffic burst")
    p_network.set_defaults(func=cmd_network)

    p_replay = sub.add_parser("replay")
    p_replay.add_argument("scenario", nargs="?", default=None)
    p_replay.add_argument("--live", action="store_true", help="pace playback in real time")
    p_replay.add_argument("--speed", type=float, default=1.0)
    p_replay.add_argument("--list", action="store_true")
    p_replay.set_defaults(func=cmd_replay)

    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
