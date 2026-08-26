import type { ReactNode } from 'react';
import {
  RequirementAnnotationDrawer,
  RequirementAnnotationMarker,
} from '@/components/requirementAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import { messageCenterAnnotations } from './data';

export function MessageCenterAnnotationMarker({
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
      requirementKey="messageCenter"
      annotations={messageCenterAnnotations}
      noteId={noteId}
      layout={layout}
    >
      {children}
    </RequirementAnnotationMarker>
  );
}

export function MessageCenterAnnotationDrawer({
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
      annotations={messageCenterAnnotations}
      onClose={onClose}
      onLocate={onLocate}
    />
  );
}

export { messageCenterAnnotations } from './data';
