"""
Default entry: local Chinese web dashboard.

From repository root:
    python -m polymarket_monitor

Same as: python polymarket_monitor/monitor.py --web
"""

from __future__ import annotations

import sys


def _main() -> int:
    argv = sys.argv[1:]
    if argv and argv[0] in ("-h", "--help"):
        pass
    elif "--web" not in argv and "--json" not in argv:
        if not any(a == "--loop-sec" or a.startswith("--loop-sec=") for a in argv):
            sys.argv.insert(1, "--web")
    from polymarket_monitor.monitor import main

    return main()


if __name__ == "__main__":
    raise SystemExit(_main())
