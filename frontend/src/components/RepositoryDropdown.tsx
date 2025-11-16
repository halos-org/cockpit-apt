/**
 * Repository selection dropdown component
 *
 * Displays a PatternFly Dropdown for selecting the active repository.
 * Only renders if repositories are available (repositories.length > 0).
 * Includes "All Repositories" option to clear the filter.
 */

import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from "@patternfly/react-core";
import React, { useState } from "react";
import { useApp } from "../context/AppContext";

export function RepositoryDropdown() {
  const { state, actions } = useApp();
  const { repositories, activeRepository } = state;
  const [isOpen, setIsOpen] = useState(false);

  // Only show if there are repositories
  if (repositories.length === 0) {
    return null;
  }

  const handleSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined
  ) => {
    const repoId = value === "all" ? null : String(value);
    actions.setActiveRepository(repoId);
    setIsOpen(false);
  };

  const getSelectedLabel = () => {
    if (!activeRepository) {
      return "All Repositories";
    }
    const repo = repositories.find((r) => r.id === activeRepository);
    return repo ? repo.name : "All Repositories";
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={handleSelect}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
      aria-label="Repository selection"
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle ref={toggleRef} onClick={() => setIsOpen(!isOpen)} isExpanded={isOpen}>
          {getSelectedLabel()}
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem value="all" key="all">
          All Repositories
        </DropdownItem>
        {repositories.map((repo) => (
          <DropdownItem value={repo.id} key={repo.id}>
            {repo.name} ({repo.package_count} packages)
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  );
}
