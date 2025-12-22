"""
Unit tests for CLI command dispatcher.
"""

from unittest.mock import MagicMock, patch

import pytest

from cockpit_apt import cli


class TestCLIDispatcher:
    """Tests for the main CLI dispatcher."""

    def test_search_command(self, mock_apt_cache):
        """Test dispatching search command."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "search", "nginx"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_details_command(self, mock_apt_cache):
        """Test dispatching details command."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "details", "nginx"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_sections_command(self, mock_apt_cache):
        """Test dispatching sections command."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "sections"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_list_section_command(self, mock_apt_cache):
        """Test dispatching list-section command."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "list-section", "web"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_list_installed_command(self, mock_apt_cache):
        """Test dispatching list-installed command."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "list-installed"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_list_upgradable_command(self, mock_apt_cache):
        """Test dispatching list-upgradable command."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "list-upgradable"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_dependencies_command(self, mock_apt_cache):
        """Test dispatching dependencies command."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "dependencies", "nginx"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_reverse_dependencies_command(self, mock_apt_cache):
        """Test dispatching reverse-dependencies command."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "reverse-dependencies", "libc6"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_help_command(self, capsys):
        """Test help command."""
        with patch("sys.argv", ["cockpit-apt-bridge", "help"]):
            with pytest.raises(SystemExit) as exc_info:
                cli.main()

            assert exc_info.value.code == 0

        captured = capsys.readouterr()
        assert "Usage:" in captured.err
        assert "search" in captured.err

    def test_no_arguments(self, capsys):
        """Test error when no arguments provided."""
        with patch("sys.argv", ["cockpit-apt-bridge"]):
            with pytest.raises(SystemExit) as exc_info:
                cli.main()

            assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert "Usage:" in captured.err

    def test_unknown_command(self, capsys):
        """Test error for unknown command."""
        with patch("sys.argv", ["cockpit-apt-bridge", "unknown-command"]):
            with pytest.raises(SystemExit) as exc_info:
                cli.main()

            assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert "Unknown command" in captured.err

    def test_search_missing_argument(self, capsys):
        """Test error when search is missing query argument."""
        with patch("sys.argv", ["cockpit-apt-bridge", "search"]):
            with pytest.raises(SystemExit) as exc_info:
                cli.main()

            assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert "query argument" in captured.err

    def test_details_missing_argument(self, capsys):
        """Test error when details is missing package argument."""
        with patch("sys.argv", ["cockpit-apt-bridge", "details"]):
            with pytest.raises(SystemExit) as exc_info:
                cli.main()

            assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert "package name argument" in captured.err

    def test_list_section_missing_argument(self, capsys):
        """Test error when list-section is missing section argument."""
        with patch("sys.argv", ["cockpit-apt-bridge", "list-section"]):
            with pytest.raises(SystemExit) as exc_info:
                cli.main()

            assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert "section name argument" in captured.err

    def test_unexpected_error(self, capsys):
        """Test handling of unexpected errors."""
        with (
            patch("sys.argv", ["cockpit-apt-bridge", "search", "test"]),
            patch(
                "cockpit_apt.commands.search.execute", side_effect=RuntimeError("Unexpected")
            ),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 2
        captured = capsys.readouterr()
        assert "Unexpected error" in captured.err

    def test_filter_packages_no_args(self, mock_apt_cache):
        """Test filter-packages command with no arguments."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "filter-packages"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_filter_packages_with_tab(self, mock_apt_cache):
        """Test filter-packages command with --tab argument."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "filter-packages", "--tab", "installed"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_filter_packages_with_search(self, mock_apt_cache):
        """Test filter-packages command with --search argument."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "filter-packages", "--search", "nginx"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_filter_packages_with_all_args(self, mock_apt_cache):
        """Test filter-packages command with all arguments."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch(
                "sys.argv",
                [
                    "cockpit-apt-bridge",
                    "filter-packages",
                    "--repo",
                    "debian:stable",
                    "--tab",
                    "installed",
                    "--search",
                    "nginx",
                    "--limit",
                    "50",
                ],
            ),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        assert exc_info.value.code == 0

    def test_filter_packages_invalid_tab(self, mock_apt_cache, capsys):
        """Test filter-packages command with invalid tab value."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "filter-packages", "--tab", "invalid"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        # argparse validation should catch this
        assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert "Invalid filter-packages arguments" in captured.err

    def test_filter_packages_invalid_limit(self, mock_apt_cache, capsys):
        """Test filter-packages command with invalid limit value."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "filter-packages", "--limit", "notanumber"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        # argparse type validation should catch this
        assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert "Invalid filter-packages arguments" in captured.err

    def test_filter_packages_dash_prefixed_search_combined_format(self, mock_apt_cache):
        """Test filter-packages command with dash-prefixed search using --search=VALUE format.

        This tests the fix for the bug where searching for strings starting with
        a dash (e.g., "-test") would fail because argparse would interpret the
        value as a separate flag. The frontend now uses --search=VALUE format
        to prevent this.
        """
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "filter-packages", "--search=-test"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        # Should succeed - argparse correctly interprets --search=-test as search value "-test"
        assert exc_info.value.code == 0

    def test_filter_packages_dash_prefixed_search_separate_format(self, mock_apt_cache, capsys):
        """Test filter-packages command with dash-prefixed search using --search VALUE format.

        This documents the original bug: when passing --search and -test as separate
        arguments, argparse interprets -test as a flag, not a value.
        """
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

        with (
            patch.dict("sys.modules", {"apt": mock_apt}),
            patch("sys.argv", ["cockpit-apt-bridge", "filter-packages", "--search", "-test"]),
            pytest.raises(SystemExit) as exc_info,
        ):
            cli.main()

        # This fails because argparse treats "-test" as a flag, not a value
        # The frontend fix uses --search=VALUE format to avoid this
        assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert "Invalid filter-packages arguments" in captured.err
