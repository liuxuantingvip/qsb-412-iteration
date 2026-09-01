import type { ReactNode } from 'react';
import {
  RequirementAnnotationDrawer,
  RequirementAnnotationMarker,
} from '@/components/requirementAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import { useActiveRequirement } from '@/context/RequirementContext';
import { portalOperationLogAnnotations } from './data';
import styles from './index.module.less';

export function PortalOperationLogAnnotationMarker({ noteId, children, layout }: {
  noteId: string;
  children?: ReactNode;
  layout?: 'inline' | 'block' | 'fill';
}) {
  const activeRequirement = useActiveRequirement();
  const annotation = portalOperationLogAnnotations.find((item) => item.noteId === noteId);

  return (
    <RequirementAnnotationMarker
      requirementKey="portalOperationLog"
      annotations={portalOperationLogAnnotations}
      noteId={noteId}
      layout={layout}
    >
      {activeRequirement === 'portalOperationLog' && annotation ? (
        <span
          aria-hidden="true"
          className={styles.numberAnchor}
          data-annotation-number={annotation.number}
        >
          {annotation.number}
        </span>
      ) : null}
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
