'use client';
import { useQueries } from '@tanstack/react-query';
import { DataColumn, DataTable, Text } from '@umami/react-zen';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DataGrid } from '@/components/common/DataGrid';
import { useApi, useLoginQuery, useNavigation, useUserWebsitesQuery } from '@/components/hooks';
import { ChevronDown, ChevronUp } from '@/components/icons';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '–';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PERIODS = [
  { key: '24h', label: '24H', ms: 1 * 24 * 3_600_000 },
  { key: '7d', label: '7D', ms: 7 * 24 * 3_600_000 },
  { key: '30d', label: '30D', ms: 30 * 24 * 3_600_000 },
  { key: '90d', label: '90D', ms: 90 * 24 * 3_600_000 },
] as const;

const METRICS = [
  { key: 'views', label: 'Views', fmt: (v: number) => v.toLocaleString() },
  { key: 'visitors', label: 'Visitors', fmt: (v: number) => v.toLocaleString() },
  { key: 'visits', label: 'Visits', fmt: (v: number) => v.toLocaleString() },
  { key: 'bounce', label: 'Bounce', fmt: (v: number) => (v > 0 ? `${v}%` : '–') },
  { key: 'avgtime', label: 'Avg Time', fmt: (v: number) => (v > 0 ? formatDuration(v) : '–') },
] as const;

// ---------------------------------------------------------------------------
// Clickable sort header
// ---------------------------------------------------------------------------
function SortHeader({
  metric,
  period,
  colKey,
  sortKey,
  sortDir,
  onSort,
}: {
  metric: string;
  period: string;
  colKey: string;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
}) {
  const active = sortKey === colKey;
  return (
    <button
      onClick={() => onSort(colKey)}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '1px',
        opacity: active ? 1 : 0.7,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
        {metric}
        {active && (sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
      </span>
      <span style={{ opacity: 0.6, fontSize: '0.75em' }}>{period}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Inner table (receives already-loaded websites list)
// ---------------------------------------------------------------------------
function QuickStatsInner({ websites }: { websites: any[] }) {
  const { get } = useApi();
  const { renderUrl } = useNavigation();
  const [sortKey, setSortKey] = useState('views_24h');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const now = useMemo(() => Date.now(), []);

  // Fetch all (website × period) combinations in parallel
  const queries = useQueries({
    queries: websites.flatMap(site =>
      PERIODS.map(({ key, ms }) => ({
        queryKey: ['websites:quickstats', site.id, key],
        queryFn: () => get(`/websites/${site.id}/stats`, { startAt: now - ms, endAt: now }),
        staleTime: 5 * 60 * 1000,
      })),
    ),
  });

  // Build flat row per website
  const rows = useMemo(() => {
    return websites.map((site, si) => {
      const row: Record<string, any> = { id: site.id, name: site.name };
      PERIODS.forEach(({ key }, pi) => {
        const d = queries[si * PERIODS.length + pi]?.data as any;
        const visits = d?.visits ?? 0;
        const bounces = d?.bounces ?? 0;
        row[`views_${key}`] = d?.pageviews ?? 0;
        row[`visitors_${key}`] = d?.visitors ?? 0;
        row[`visits_${key}`] = visits;
        row[`bounce_${key}`] = visits > 0 ? +((bounces / visits) * 100).toFixed(1) : 0;
        row[`avgtime_${key}`] = visits > 0 ? Math.round((d?.totaltime ?? 0) / visits) : 0;
      });
      return row;
    });
  }, [websites, queries]);

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        return sortDir === 'desc' ? bv - av : av - bv;
      }),
    [rows, sortKey, sortDir],
  );

  return (
    <DataTable data={sortedRows}>
      <DataColumn id="name" label="Name" width="150px">
        {(row: any) => <Link href={renderUrl(`/websites/${row.id}`, false)}>{row.name}</Link>}
      </DataColumn>

      {/* One column per (metric × period), grouped by metric */}
      {METRICS.flatMap(({ key: mk, label: ml, fmt }) =>
        PERIODS.map(({ key: pk, label: pl }) => {
          const colKey = `${mk}_${pk}`;
          return (
            <DataColumn
              key={colKey}
              id={colKey}
              label={
                (
                  <SortHeader
                    metric={ml}
                    period={pl}
                    colKey={colKey}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                ) as any
              }
              align="end"
            >
              {(row: any) => <Text>{fmt(row[colKey] ?? 0)}</Text>}
            </DataColumn>
          );
        }),
      )}
    </DataTable>
  );
}

// ---------------------------------------------------------------------------
// Public: loads website list, then delegates to QuickStatsInner
// ---------------------------------------------------------------------------
export function QuickStatsDataTable({ teamId }: { teamId?: string }) {
  const { user } = useLoginQuery();
  const queryResult = useUserWebsitesQuery({ userId: user?.id, teamId });

  return (
    <DataGrid query={queryResult} allowSearch allowPaging>
      {({ data }) => <QuickStatsInner websites={data} />}
    </DataGrid>
  );
}
