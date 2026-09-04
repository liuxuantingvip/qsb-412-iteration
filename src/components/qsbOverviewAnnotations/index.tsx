import type { ReactNode } from 'react';
import { ConfigProvider } from '@arco-design/web-react';
import {
  RequirementAnnotationDrawer,
  RequirementAnnotationMarker,
} from '@/components/requirementAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import { qsbOverviewAnnotations } from './data';
import { renderAccountExample } from './AccountExamples';
import { renderAnnouncementExample } from './AnnouncementExamples';
import { ErrorCodeExample } from './ErrorCodeExample';
import { renderRunTrendExample } from './RunTrendExamples';
import { renderAnomalyExample } from './AnomalyExamples';
import { RobotScheduleExample } from './RobotScheduleExample';

export function QsbOverviewAnnotationMarker({ noteId, children, layout }: {
  noteId: string;
  children?: ReactNode;
  layout?: 'inline' | 'block' | 'fill';
}) {
  return (
    <RequirementAnnotationMarker
      requirementKey="qsbOverview"
      annotations={qsbOverviewAnnotations}
      noteId={noteId}
      layout={layout}
    >
      {children}
    </RequirementAnnotationMarker>
  );
}

export function QsbOverviewAnnotationDrawer({ visible, onClose, onLocate }: {
  visible: boolean;
  onClose: () => void;
  onLocate: (annotation: RequirementAnnotation) => void;
}) {
  return (
    <ConfigProvider getPopupContainer={() => document.body}>
      <RequirementAnnotationDrawer
        visible={visible}
        annotations={qsbOverviewAnnotations}
        pageLabel={(page) => page}
        onClose={onClose}
        onLocate={onLocate}
        renderExample={(key) => key === 'robot-schedule' ? <RobotScheduleExample /> : key === 'error-code-mapping' ? <ErrorCodeExample /> : renderAccountExample(key) ?? renderAnnouncementExample(key) ?? renderRunTrendExample(key) ?? renderAnomalyExample(key)}
      />
    </ConfigProvider>
  );
}

export { qsbOverviewAnnotations } from './data';
