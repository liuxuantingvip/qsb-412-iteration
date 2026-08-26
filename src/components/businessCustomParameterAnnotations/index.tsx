import type { ReactNode } from 'react';
import {
  RequirementAnnotationDrawer,
  RequirementAnnotationMarker,
} from '@/components/requirementAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import { businessCustomParameterAnnotations } from './data';

export function BusinessCustomParameterAnnotationMarker({
  noteId,
  children,
}: {
  noteId: string;
  children?: ReactNode;
}) {
  return (
    <RequirementAnnotationMarker
      requirementKey="businessCustomParameterExperience"
      annotations={businessCustomParameterAnnotations}
      noteId={noteId}
    >
      {children}
    </RequirementAnnotationMarker>
  );
}

export function BusinessCustomParameterAnnotationDrawer({
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
      annotations={businessCustomParameterAnnotations}
      pageLabel={(page) => page}
      onClose={onClose}
      onLocate={onLocate}
    />
  );
}

export { businessCustomParameterAnnotations } from './data';
