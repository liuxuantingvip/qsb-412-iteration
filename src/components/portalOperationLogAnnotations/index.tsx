import type { ReactNode } from 'react';
import {
  RequirementAnnotationDrawer,
  RequirementAnnotationMarker,
} from '@/components/requirementAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import { portalOperationLogAnnotations } from './data';

export function PortalOperationLogAnnotationMarker({ noteId, children, layout }: {
  noteId: string;
  children?: ReactNode;
  layout?: 'inline' | 'block' | 'fill';
}) {
  return (
    <RequirementAnnotationMarker
      requirementKey="portalOperationLog"
      annotations={portalOperationLogAnnotations}
      noteId={noteId}
      layout={layout}
    >
      {children}
    </RequirementAnnotationMarker>
  );
}

export function PortalOperationLogAnnotationDrawer({ visible, onClose, onLocate }: {
  visible: boolean;
  onClose: () => void;
  onLocate: (annotation: RequirementAnnotation) => void;
}) {
  return (
    <RequirementAnnotationDrawer
      visible={visible}
      annotations={portalOperationLogAnnotations}
      pageLabel={(page) => page}
      onClose={onClose}
      onLocate={onLocate}
    />
  );
}

export { portalOperationLogAnnotations } from './data';
