/**
 * Example React Hooks for APT Package Management
 *
 * These hooks demonstrate how to use the API wrapper functions with React.
 * They provide state management, loading states, and error handling for
 * common package management operations.
 *
 * Usage:
 *   import { usePackageDetails, useSearch } from './hooks/usePackages';
 *
 *   function PackageDetailsView({ packageName }) {
 *     const { data, loading, error } = usePackageDetails(packageName);
 *
 *     if (loading) return <div>Loading...</div>;
 *     if (error) return <div>Error: {error.message}</div>;
 *     return <div>{data.description}</div>;
 *   }
 *
 * Note: These are basic example implementations. For production use, consider
 * using a data fetching library like React Query or SWR for better caching,
 * revalidation, and optimization.
 */

import { useEffect, useState } from "react";
import * as api from "../lib/api";
import { APTError } from "../lib/error-handler";
import type { Package, PackageDetails, Section, UpgradablePackage } from "../lib/types";

/**
 * Hook state interface
 */
interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: APTError | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for searching packages
 *
 * @param query Search query (minimum 2 characters)
 * @param enabled Whether to run the query (default: true)
 * @returns Query result with packages, loading state, and error
 *
 * @example
 * function SearchResults() {
 *   const [query, setQuery] = useState('');
 *   const { data, loading, error } = useSearch(query, query.length >= 2);
 *
 *   return (
 *     <>
 *       <input value={query} onChange={e => setQuery(e.target.value)} />
 *       {loading && <div>Searching...</div>}
 *       {data?.map(pkg => <div key={pkg.name}>{pkg.name}</div>)}
 *     </>
 *   );
 * }
 */
export function useSearch(query: string, enabled: boolean = true): UseQueryResult<Package[]> {
  const [data, setData] = useState<Package[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<APTError | null>(null);

  const fetchData = async () => {
    if (!enabled || query.length < 2) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.searchPackages(query);
      setData(result);
    } catch (err) {
      setError(err as APTError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, enabled]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching package details
 *
 * @param packageName Name of the package
 * @param enabled Whether to fetch details (default: true)
 * @returns Query result with package details, loading state, and error
 *
 * @example
 * function PackageView({ packageName }) {
 *   const { data, loading, error, refetch } = usePackageDetails(packageName);
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Alert>{error.message}</Alert>;
 *
 *   return (
 *     <Card>
 *       <Title>{data.name}</Title>
 *       <Description>{data.description}</Description>
 *       <Button onClick={refetch}>Refresh</Button>
 *     </Card>
 *   );
 * }
 */
export function usePackageDetails(
  packageName: string,
  enabled: boolean = true
): UseQueryResult<PackageDetails> {
  const [data, setData] = useState<PackageDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<APTError | null>(null);

  const fetchData = async (forceRefresh: boolean = false, silent: boolean = false) => {
    if (!enabled || !packageName) {
      setData(null);
      return;
    }

    // Only set loading state if not a silent refetch
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      // Use cache by default, but allow forcing fresh data
      const result = await api.getPackageDetails(packageName, !forceRefresh);
      setData(result);
    } catch (err) {
      setError(err as APTError);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageName, enabled]);

  // Return refetch that forces fresh data silently (without showing loading skeleton)
  return { data, loading, error, refetch: () => fetchData(true, true) };
}

/**
 * Hook for listing Debian sections
 *
 * @param enabled Whether to fetch sections (default: true)
 * @returns Query result with sections, loading state, and error
 *
 * @example
 * function SectionList() {
 *   const { data, loading } = useSections();
 *
 *   if (loading) return <Spinner />;
 *
 *   return (
 *     <List>
 *       {data?.map(section => (
 *         <ListItem key={section.name}>
 *           {section.name} ({section.count} packages)
 *         </ListItem>
 *       ))}
 *     </List>
 *   );
 * }
 */
export function useSections(enabled: boolean = true): UseQueryResult<Section[]> {
  const [data, setData] = useState<Section[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<APTError | null>(null);

  const fetchData = async () => {
    if (!enabled) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.listSections();
      setData(result);
    } catch (err) {
      setError(err as APTError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for checking if a package is installed
 *
 * @param packageName Name of the package
 * @param enabled Whether to check (default: true)
 * @returns Query result with installation status, loading state, and error
 *
 * @example
 * function InstallButton({ packageName }) {
 *   const { data: isInstalled, loading } = useIsInstalled(packageName);
 *
 *   if (loading) return <Button disabled>Checking...</Button>;
 *
 *   return (
 *     <Button onClick={handleInstall}>
 *       {isInstalled ? 'Installed' : 'Install'}
 *     </Button>
 *   );
 * }
 */
export function useIsInstalled(
  packageName: string,
  enabled: boolean = true
): UseQueryResult<boolean> {
  const [data, setData] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<APTError | null>(null);

  const fetchData = async () => {
    if (!enabled || !packageName) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.isInstalled(packageName);
      setData(result);
    } catch (err) {
      setError(err as APTError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageName, enabled]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for listing installed packages
 *
 * @param enabled Whether to fetch (default: true)
 * @returns Query result with installed packages, loading state, and error
 *
 * @example
 * function InstalledPackages() {
 *   const { data, loading, refetch } = useInstalledPackages();
 *
 *   return (
 *     <>
 *       <Button onClick={refetch}>Refresh</Button>
 *       {loading ? <Spinner /> : (
 *         <PackageList packages={data || []} />
 *       )}
 *     </>
 *   );
 * }
 */
export function useInstalledPackages(enabled: boolean = true): UseQueryResult<Package[]> {
  const [data, setData] = useState<Package[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<APTError | null>(null);

  const fetchData = async () => {
    if (!enabled) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.listInstalledPackages();
      setData(result);
    } catch (err) {
      setError(err as APTError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for listing upgradable packages
 *
 * @param enabled Whether to fetch (default: true)
 * @returns Query result with upgradable packages, loading state, and error
 *
 * @example
 * function UpgradesBadge() {
 *   const { data, loading } = useUpgradablePackages();
 *
 *   if (loading) return null;
 *
 *   const count = data?.length || 0;
 *   return count > 0 ? <Badge>{count} updates</Badge> : null;
 * }
 */
export function useUpgradablePackages(
  enabled: boolean = true
): UseQueryResult<UpgradablePackage[]> {
  const [data, setData] = useState<UpgradablePackage[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<APTError | null>(null);

  const fetchData = async () => {
    if (!enabled) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.listUpgradablePackages();
      setData(result);
    } catch (err) {
      setError(err as APTError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { data, loading, error, refetch: fetchData };
}
