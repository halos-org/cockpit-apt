"""
Entry point for running cockpit_apt_bridge as a module.

Usage: python -m cockpit_apt_bridge <command> [args]
"""

from cockpit_apt_bridge.cli import main

if __name__ == "__main__":
    main()
