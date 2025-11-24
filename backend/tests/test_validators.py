"""
Unit tests for input validation functions.
"""

import pytest

from cockpit_apt.utils.errors import APTBridgeError
from cockpit_apt.utils.validators import validate_package_name, validate_section_name


class TestValidatePackageName:
    """Tests for validate_package_name function."""

    def test_valid_simple_name(self):
        """Test validation accepts simple package names."""
        # Should not raise
        validate_package_name("nginx")
        validate_package_name("python3")
        validate_package_name("libc6")

    def test_valid_with_hyphen(self):
        """Test validation accepts names with hyphens."""
        validate_package_name("python3-apt")
        validate_package_name("nginx-common")

    def test_valid_with_plus(self):
        """Test validation accepts names with plus signs."""
        validate_package_name("g++")
        validate_package_name("libstdc++6")

    def test_valid_with_dot(self):
        """Test validation accepts names with dots."""
        validate_package_name("libapt-pkg6.0")

    def test_valid_starts_with_digit(self):
        """Test validation accepts names starting with digits."""
        validate_package_name("2ping")
        validate_package_name("0ad")

    def test_empty_name(self):
        """Test validation rejects empty names."""
        with pytest.raises(APTBridgeError) as exc_info:
            validate_package_name("")

        assert exc_info.value.code == "INVALID_INPUT"
        assert "empty" in exc_info.value.message.lower()

    def test_too_long(self):
        """Test validation rejects names exceeding 255 characters."""
        long_name = "a" * 256

        with pytest.raises(APTBridgeError) as exc_info:
            validate_package_name(long_name)

        assert exc_info.value.code == "INVALID_INPUT"
        assert "255" in exc_info.value.message

    def test_uppercase_rejected(self):
        """Test validation rejects uppercase letters."""
        with pytest.raises(APTBridgeError) as exc_info:
            validate_package_name("NginX")

        assert exc_info.value.code == "INVALID_INPUT"

    def test_path_separator_rejected(self):
        """Test validation rejects path separators."""
        with pytest.raises(APTBridgeError) as exc_info:
            validate_package_name("../etc/passwd")

        assert exc_info.value.code == "INVALID_INPUT"

        with pytest.raises(APTBridgeError):
            validate_package_name("etc/passwd")

    def test_shell_metacharacters_rejected(self):
        """Test validation rejects shell metacharacters."""
        dangerous_chars = [";", "&", "|", "$", "`", "(", ")", "<", ">"]

        for char in dangerous_chars:
            with pytest.raises(APTBridgeError):
                validate_package_name(f"pkg{char}name")

    def test_newline_rejected(self):
        """Test validation rejects newlines."""
        with pytest.raises(APTBridgeError):
            validate_package_name("pkg\nname")

        with pytest.raises(APTBridgeError):
            validate_package_name("pkg\r\nname")

    def test_special_chars_rejected(self):
        """Test validation rejects other special characters."""
        with pytest.raises(APTBridgeError):
            validate_package_name("pkg@name")

        with pytest.raises(APTBridgeError):
            validate_package_name("pkg#name")

        with pytest.raises(APTBridgeError):
            validate_package_name("pkg name")  # space


class TestValidateSectionName:
    """Tests for validate_section_name function."""

    def test_valid_simple_name(self):
        """Test validation accepts simple section names."""
        validate_section_name("admin")
        validate_section_name("web")
        validate_section_name("utils")

    def test_valid_with_slash(self):
        """Test validation accepts names with slashes (e.g., contrib/net)."""
        validate_section_name("contrib/net")
        validate_section_name("non-free/games")

    def test_valid_with_hyphen(self):
        """Test validation accepts names with hyphens."""
        validate_section_name("non-free")
        validate_section_name("x11-utils")

    def test_valid_with_underscore(self):
        """Test validation accepts names with underscores."""
        validate_section_name("section_name")

    def test_valid_with_digits(self):
        """Test validation accepts names with digits."""
        validate_section_name("x11")

    def test_empty_name(self):
        """Test validation rejects empty names."""
        with pytest.raises(APTBridgeError) as exc_info:
            validate_section_name("")

        assert exc_info.value.code == "INVALID_INPUT"
        assert "empty" in exc_info.value.message.lower()

    def test_too_long(self):
        """Test validation rejects names exceeding 100 characters."""
        long_name = "a" * 101

        with pytest.raises(APTBridgeError) as exc_info:
            validate_section_name(long_name)

        assert exc_info.value.code == "INVALID_INPUT"
        assert "100" in exc_info.value.message

    def test_uppercase_rejected(self):
        """Test validation rejects uppercase letters."""
        with pytest.raises(APTBridgeError) as exc_info:
            validate_section_name("Admin")

        assert exc_info.value.code == "INVALID_INPUT"

    def test_special_chars_rejected(self):
        """Test validation rejects special characters."""
        with pytest.raises(APTBridgeError):
            validate_section_name("sect.ion")

        with pytest.raises(APTBridgeError):
            validate_section_name("sect+ion")

        with pytest.raises(APTBridgeError):
            validate_section_name("sect@ion")

    def test_path_traversal_rejected(self):
        """Test validation rejects path traversal attempts."""
        # While slash is allowed, we don't want path traversal
        # This is a security consideration
        with pytest.raises(APTBridgeError):
            validate_section_name("../etc")

        with pytest.raises(APTBridgeError):
            validate_section_name("../../")
