import type { ReactNode } from 'react';
import {
  RequirementAnnotationDrawer,
  RequirementAnnotationMarker,
} from '@/components/requirementAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import { openApiAnnotations } from './data';

export function OpenApiAnnotationMarker({
  noteId,
  children,
}: {
  noteId: string;
  children?: ReactNode;
}) {
  return (
    <RequirementAnnotationMarker
      requirementKey="openApiOptimization"
      annotations={openApiAnnotations}
      noteId={noteId}
    >
      {children}
    </RequirementAnnotationMarker>
  );
}

export function OpenApiAnnotationDrawer({
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
      annotations={openApiAnnotations}
      pageLabel={(page) => page}
      onClose={onClose}
      onLocate={onLocate}
    />
  );
}

export { openApiAnnotations } from './data';
