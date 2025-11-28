/**
 * SearchBar Component
 *
 * Debounced search input with clear button and loading indicator.
 * Provides visual feedback for minimum query length and search state.
 *
 * Features:
 * - 300ms debounce delay to reduce API calls
 * - Clear button to reset search
 * - Loading indicator during search
 * - Minimum length hint (2+ characters)
 * - Keyboard support (Enter to search, Escape to clear)
 *
 * Usage:
 *   <SearchBar
 *     value={query}
 *     onChange={setQuery}
 *     onSearch={handleSearch}
 *     loading={isSearching}
 *     placeholder="Search packages..."
 *   />
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  TextInput,
  InputGroup,
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from "@patternfly/react-core";
import { SearchIcon } from "@patternfly/react-icons";

export interface SearchBarProps {
  /** Current search value */
  value: string;

  /** Callback when value changes */
  onChange: (value: string) => void;

  /** Callback when search should be executed (after debounce) */
  onSearch?: (query: string) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;

  /** Minimum query length (default: 2) */
  minLength?: number;

  /** Additional CSS class name */
  className?: string;

  /** Optional style object */
  style?: React.CSSProperties;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search packages...",
  debounceMs = 300,
  minLength = 2,
  className,
}) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Debounce the search value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  // Trigger search when debounced value changes
  useEffect(() => {
    if (debouncedValue.length >= minLength && onSearch) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, minLength, onSearch]);

  const handleChange = useCallback(
    (_event: React.FormEvent<HTMLInputElement>, value: string) => {
      onChange(value);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange("");
    if (onSearch) {
      onSearch("");
    }
  }, [onChange, onSearch]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClear();
      } else if (event.key === "Enter" && value.length >= minLength && onSearch) {
        // Force immediate search on Enter
        onSearch(value);
      }
    },
    [handleClear, value, minLength, onSearch]
  );

  const showMinLengthHint = value.length > 0 && value.length < minLength;

  return (
    <div className={className}>
      <InputGroup>
        <TextInput
          type="search"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search packages"
          validated={showMinLengthHint ? "warning" : "default"}
        />
        <Button variant="plain" isDisabled aria-label="Search">
          <SearchIcon />
        </Button>
      </InputGroup>

      {showMinLengthHint && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="warning">
              Type at least {minLength} characters to search
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </div>
  );
};
