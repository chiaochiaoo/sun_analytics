import type { Metadata } from 'next';
import { QuickStatsPage } from './QuickStatsPage';

export default function () {
  return <QuickStatsPage />;
}

export const metadata: Metadata = {
  title: 'QuickStats',
};
