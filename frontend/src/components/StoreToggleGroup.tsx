/**
 * Store selection toggle group component
 *
 * Displays a PatternFly ToggleGroup for selecting the active store.
 * Only renders if multiple stores are available (stores.length > 1).
 * Includes "All Stores" option to clear the filter.
 */

import { Label, ToggleGroup, ToggleGroupItem } from "@patternfly/react-core";
import React from "react";
import { useApp } from "../context/AppContext";

export function StoreToggleGroup() {
  const { state, actions } = useApp();
  const { stores, activeStore } = state;

  // Only show if there are multiple stores
  if (stores.length <= 1) {
    return null;
  }

  const handleStoreChange = (
    _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    isSelected: boolean,
    storeId: string
  ) => {
    if (isSelected) {
      // "all" means clear the filter
      actions.setActiveStore(storeId === "all" ? null : storeId);
    }
  };

  const selectedStore = activeStore || "all";

  return (
    <div className="store-toggle-group">
      <Label id="store-label">Store:</Label>
      <ToggleGroup aria-label="Store selection" aria-labelledby="store-label">
        <ToggleGroupItem
          text="All Stores"
          buttonId="store-all"
          isSelected={selectedStore === "all"}
          onChange={(event, isSelected) => handleStoreChange(event, isSelected, "all")}
        />
        {stores.map((store) => (
          <ToggleGroupItem
            key={store.id}
            text={store.name}
            buttonId={`store-${store.id}`}
            isSelected={selectedStore === store.id}
            onChange={(event, isSelected) => handleStoreChange(event, isSelected, store.id)}
          />
        ))}
      </ToggleGroup>
    </div>
  );
}
