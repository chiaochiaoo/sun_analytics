'use client';
import { useQueries } from '@tanstack/react-query';
import { Text } from '@umami/react-zen';
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
// Inner table
// ---------------------------------------------------------------------------
function QuickStatsInner({ websites }: { websites: any[] }) {
  const { get } = useApi();
  const { renderUrl } = useNavigation();
  const [sortKey, setSortKey] = useState('views_24h');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const now = useMemo(() => Date.now(), []);

  const queries = useQueries({
    queries: websites.flatMap(site =>
      PERIODS.map(({ key, ms }) => ({
        queryKey: ['websites:quickstats', site.id, key],
        queryFn: () => get(`/websites/${site.id}/stats`, { startAt: now - ms, endAt: now }),
        staleTime: 5 * 60 * 1000,
      })),
    ),
  });

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

  const th: React.CSSProperties = {
    padding: '6px 12px',
    textAlign: 'right',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border-color, #e5e7eb)',
  };

  const td: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border-color, #e5e7eb)',
  };

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          {/* Row 1: metric group labels */}
          <tr>
            <th
              style={{
                ...th,
                textAlign: 'left',
                borderRight: '1px solid var(--border-color, #e5e7eb)',
              }}
              rowSpan={2}
            >
              Name
            </th>
            {METRICS.map(({ key, label }) => (
              <th
                key={key}
                colSpan={PERIODS.length}
                style={{
                  ...th,
                  textAlign: 'center',
                  borderLeft: '1px solid var(--border-color, #e5e7eb)',
                  paddingBottom: '2px',
                }}
              >
                {label}
              </th>
            ))}
          </tr>
          {/* Row 2: period sub-headers (clickable for sort) */}
          <tr>
            {METRICS.flatMap(({ key: mk, fmt: _ }) =>
              PERIODS.map(({ key: pk, label: pl }) => {
                const colKey = `${mk}_${pk}`;
                const active = sortKey === colKey;
                return (
                  <th
                    key={colKey}
                    style={{
                      ...th,
                      paddingTop: '2px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      opacity: active ? 1 : 0.55,
                      borderLeft:
                        pk === '24h' ? '1px solid var(--border-color, #e5e7eb)' : undefined,
                    }}
                    onClick={() => handleSort(colKey)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      {pl}
                      {active &&
                        (sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
                    </span>
                  </th>
                );
              }),
            )}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map(row => (
            <tr key={row.id} style={{ verticalAlign: 'middle' }}>
              <td
                style={{
                  ...td,
                  textAlign: 'left',
                  borderRight: '1px solid var(--border-color, #e5e7eb)',
                }}
              >
                <Link href={renderUrl(`/websites/${row.id}`, false)}>{row.name}</Link>
              </td>
              {METRICS.flatMap(({ key: mk, fmt }) =>
                PERIODS.map(({ key: pk }) => (
                  <td
                    key={`${mk}_${pk}`}
                    style={{
                      ...td,
                      borderLeft:
                        pk === '24h' ? '1px solid var(--border-color, #e5e7eb)' : undefined,
                    }}
                  >
                    <Text>{fmt(row[`${mk}_${pk}`] ?? 0)}</Text>
                  </td>
                )),
              )}
            </tr>
          ))}
          {sortedRows.length === 0 && (
            <tr>
              <td
                colSpan={1 + METRICS.length * PERIODS.length}
                style={{ ...td, textAlign: 'center', opacity: 0.5 }}
              >
                No websites found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public
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
