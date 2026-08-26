import type { ReactNode } from 'react';
import {
  RequirementAnnotationDrawer,
  RequirementAnnotationMarker,
} from '@/components/requirementAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import { autoRetryAnnotations } from './data';

export function AutoRetryAnnotationMarker({
  noteId,
  children,
  layout,
}: {
  noteId: string;
  children?: ReactNode;
  layout?: 'inline' | 'block' | 'fill';
}) {
  return (
    <RequirementAnnotationMarker
      requirementKey="autoRetryOptimization"
      annotations={autoRetryAnnotations}
      noteId={noteId}
      layout={layout}
    >
      {children}
    </RequirementAnnotationMarker>
  );
}

export function AutoRetryAnnotationDrawer({
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
      annotations={autoRetryAnnotations}
      onClose={onClose}
      onLocate={onLocate}
    />
  );
}

export { autoRetryAnnotations } from './data';
