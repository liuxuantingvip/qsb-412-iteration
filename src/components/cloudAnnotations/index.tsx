import type { ReactNode } from 'react';
import {
  RequirementAnnotationDrawer,
  RequirementAnnotationMarker,
} from '@/components/requirementAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import { cloudAnnotations as sourceAnnotations } from './data';

export const cloudAnnotations: RequirementAnnotation[] = sourceAnnotations.map((item) => ({
  ...item,
  topTab: '后台管理',
}));

export function AnnotationMarker({ noteId, children }: { noteId: string; children?: ReactNode }) {
  return (
    <RequirementAnnotationMarker
      requirementKey="cloudResourceAutomation"
      annotations={cloudAnnotations}
      noteId={noteId}
    >
      {children}
    </RequirementAnnotationMarker>
  );
}

export function CloudAnnotationDrawer({
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
      annotations={cloudAnnotations}
      pageLabel={(page) => page === '租户管理 / 新增授权'
        ? '新增授权'
        : page === '租户管理 / 编辑授权'
          ? '编辑授权'
          : page}
      onClose={onClose}
      onLocate={onLocate}
    />
  );
}
