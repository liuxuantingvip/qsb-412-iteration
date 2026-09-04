import type { ReactNode } from 'react';
import { RequirementAnnotationDrawer, RequirementAnnotationMarker } from '@/components/requirementAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import { runDetailStorageLogAnnotations } from './data';

export function RunDetailStorageLogAnnotationMarker({ noteId, children, layout }: {
  noteId: string;
  children?: ReactNode;
  layout?: 'inline' | 'block' | 'fill';
}) {
  return (
    <RequirementAnnotationMarker
      requirementKey="runDetailStorageLog"
      annotations={runDetailStorageLogAnnotations}
      noteId={noteId}
      layout={layout}
    >
      {children}
    </RequirementAnnotationMarker>
  );
}

export function RunDetailStorageLogAnnotationDrawer({ visible, onClose, onLocate }: {
  visible: boolean;
  onClose: () => void;
  onLocate: (annotation: RequirementAnnotation) => void;
}) {
  return (
    <RequirementAnnotationDrawer
      visible={visible}
      annotations={runDetailStorageLogAnnotations}
      pageLabel={(page) => page}
      onClose={onClose}
      onLocate={onLocate}
    />
  );
}

export { runDetailStorageLogAnnotations } from './data';
