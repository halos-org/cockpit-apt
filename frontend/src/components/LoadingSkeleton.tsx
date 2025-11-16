/**
 * LoadingSkeleton Component
 *
 * Provides skeleton loading states for different component types.
 * Matches the structure of actual components for smooth transition.
 *
 * Variants:
 * - table: Skeleton for table rows
 * - card: Skeleton for package/section cards
 * - details: Skeleton for package details page
 * - list: Skeleton for simple list items
 *
 * Usage:
 *   {loading ? (
 *     <LoadingSkeleton variant="table" rows={5} />
 *   ) : (
 *     <PackageTable packages={data} />
 *   )}
 */

import React from "react";
import { Skeleton, SkeletonProps, Card, CardBody, Grid, GridItem } from "@patternfly/react-core";

export interface LoadingSkeletonProps {
  /** Skeleton variant */
  variant: "table" | "card" | "details" | "list";

  /** Number of rows/items to show (default: 3) */
  rows?: number;

  /** Height of each skeleton (optional) */
  height?: SkeletonProps["height"];

  /** Width of each skeleton (optional) */
  width?: SkeletonProps["width"];

  /** Additional CSS class name */
  className?: string;
}

/**
 * Table row skeleton
 */
const TableRowSkeleton: React.FC<{ height?: string }> = ({ height }) => (
  <tr>
    <td>
      <Skeleton height={height} width="30%" />
    </td>
    <td>
      <Skeleton height={height} width="50%" />
    </td>
    <td>
      <Skeleton height={height} width="15%" />
    </td>
    <td>
      <Skeleton height={height} width="20%" />
    </td>
  </tr>
);

/**
 * Card skeleton
 */
const CardSkeleton: React.FC = () => (
  <Card>
    <CardBody>
      <Skeleton height="40px" width="40px" shape="circle" style={{ marginBottom: "1rem" }} />
      <Skeleton height="1.5rem" width="60%" style={{ marginBottom: "0.5rem" }} />
      <Skeleton height="1rem" width="80%" style={{ marginBottom: "0.5rem" }} />
      <Skeleton height="1rem" width="40%" />
    </CardBody>
  </Card>
);

/**
 * List item skeleton
 */
const ListItemSkeleton: React.FC<{ height?: string }> = ({ height }) => (
  <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
    <Skeleton height={height || "2rem"} width="30%" />
    <Skeleton height={height || "2rem"} width="50%" />
    <Skeleton height={height || "2rem"} width="15%" />
  </div>
);

/**
 * Details page skeleton
 */
const DetailsSkeleton: React.FC = () => (
  <div>
    {/* Header */}
    <div style={{ marginBottom: "2rem" }}>
      <Skeleton height="2rem" width="40%" style={{ marginBottom: "0.5rem" }} />
      <Skeleton height="1rem" width="60%" />
    </div>

    {/* Tabs */}
    <div style={{ marginBottom: "2rem", display: "flex", gap: "2rem" }}>
      <Skeleton height="2rem" width="100px" />
      <Skeleton height="2rem" width="120px" />
      <Skeleton height="2rem" width="80px" />
    </div>

    {/* Content */}
    <div>
      <Skeleton height="1rem" width="100%" style={{ marginBottom: "0.5rem" }} />
      <Skeleton height="1rem" width="95%" style={{ marginBottom: "0.5rem" }} />
      <Skeleton height="1rem" width="90%" style={{ marginBottom: "0.5rem" }} />
      <Skeleton height="1rem" width="85%" style={{ marginBottom: "1rem" }} />

      <Skeleton height="1rem" width="100%" style={{ marginBottom: "0.5rem" }} />
      <Skeleton height="1rem" width="92%" style={{ marginBottom: "0.5rem" }} />
      <Skeleton height="1rem" width="88%" />
    </div>

    {/* Actions */}
    <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
      <Skeleton height="2.5rem" width="120px" />
      <Skeleton height="2.5rem" width="100px" />
    </div>
  </div>
);

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant,
  rows = 3,
  height,
  width: _width,
  className,
}) => {
  if (variant === "table") {
    return (
      <table className={className}>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRowSkeleton key={index} height={height} />
          ))}
        </tbody>
      </table>
    );
  }

  if (variant === "card") {
    return (
      <Grid hasGutter className={className}>
        {Array.from({ length: rows }).map((_, index) => (
          <GridItem key={index} sm={6} md={4} lg={3} xl={2}>
            <CardSkeleton />
          </GridItem>
        ))}
      </Grid>
    );
  }

  if (variant === "details") {
    return (
      <div className={className}>
        <DetailsSkeleton />
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={className}>
        {Array.from({ length: rows }).map((_, index) => (
          <ListItemSkeleton key={index} height={height} />
        ))}
      </div>
    );
  }

  return null;
};
