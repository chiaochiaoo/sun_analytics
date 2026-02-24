'use client';
import { Column } from '@umami/react-zen';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useMessages, useNavigation } from '@/components/hooks';
import { QuickStatsDataTable } from './QuickStatsDataTable';

export function QuickStatsPage() {
  const { formatMessage, labels } = useMessages();
  const { teamId } = useNavigation();

  return (
    <PageBody>
      <Column gap="6" margin="2">
        <PageHeader title={formatMessage(labels.quickStats)} />
        <Panel>
          <QuickStatsDataTable teamId={teamId} />
        </Panel>
      </Column>
    </PageBody>
  );
}
