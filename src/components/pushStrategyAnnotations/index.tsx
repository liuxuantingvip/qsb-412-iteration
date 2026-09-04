import { RequirementAnnotationDrawer } from '@/components/requirementAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import { pushStrategyAnnotations } from './data';
import { PushAnnotationVisualExample, visualExampleKeys } from './VisualExample';

export function PushStrategyAnnotationDrawer(props: {
  visible: boolean;
  onClose: () => void;
  onLocate: (annotation: RequirementAnnotation) => void;
}) {
  return <RequirementAnnotationDrawer {...props} annotations={pushStrategyAnnotations} renderExample={(key) => {
    const name = visualExampleKeys.find((value) => value === key);
    return name ? <PushAnnotationVisualExample name={name} /> : null;
  }} />;
}

export { pushStrategyAnnotations } from './data';
