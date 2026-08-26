import type { ReactNode } from 'react';
import {
  RequirementAnnotationDrawer,
  RequirementAnnotationMarker,
} from '@/components/requirementAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import { etlDataMonitoringAnnotations } from './data';

export function EtlDataMonitoringAnnotationMarker({
  noteId,
  children,
}: {
  noteId: string;
  children?: ReactNode;
}) {
  return (
    <RequirementAnnotationMarker
      requirementKey="etlDataMonitoringOptimization"
      annotations={etlDataMonitoringAnnotations}
      noteId={noteId}
    >
      {children}
    </RequirementAnnotationMarker>
  );
}

export function EtlDataMonitoringAnnotationDrawer({
  visible,
  onClose,
  onLocate,
}: {
  visible: boolean;
  onClose: () => void;
  onLocate: (annotation: RequirementAnnotation) => void;
}) {
  return (
    <RequirementAnnotationDrawer
      visible={visible}
      annotations={etlDataMonitoringAnnotations}
      pageLabel={(page) => page}
      onClose={onClose}
      onLocate={onLocate}
    />
  );
}

export { etlDataMonitoringAnnotations } from './data';
