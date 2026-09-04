import { useEffect, useId, useState } from 'react';
import { Alert, Button, Spin } from '@arco-design/web-react';
import styles from './index.module.less';

let renderQueue: Promise<void> = Promise.resolve();

export default function FlowDiagram({ id, title, description, chart }: { id: string; title: string; description: string; chart: string }) {
  const instanceId = useId().replace(/:/g, '');
  const [result, setResult] = useState({ svg: '', width: 0 });
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState<number | null>(1);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    renderQueue = renderQueue.catch(() => undefined).then(async () => {
      if (cancelled) return;
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false, securityLevel: 'strict', theme: 'base',
        themeVariables: {
          primaryColor: '#E8F3FF', primaryBorderColor: '#165DFF', primaryTextColor: '#1D2129',
          lineColor: '#86909C', fontSize: '14px', fontFamily: 'Arial, PingFang SC, sans-serif',
        },
        flowchart: { curve: 'linear', nodeSpacing: 24, rankSpacing: 32 },
      });
      const { svg } = await mermaid.render(`push-${id}-${instanceId}-${retry}`, chart);
      if (cancelled) return;
      const element = new DOMParser().parseFromString(svg, 'text/html').querySelector('svg');
      const width = Number(element?.getAttribute('viewBox')?.split(/\s+/)[2]) || 1200;
      setResult({ svg, width });
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [chart, id, instanceId, retry]);

  return (
    <section className={styles.flow} aria-label={title} data-flow-id={id}>
      <div className={styles.flowHeader}>
        <h4>{title}</h4>
        <div className={styles.flowTools}>
          <Button size="mini" onClick={() => setZoom(null)}>适应宽度</Button>
          <Button size="mini" onClick={() => setZoom(1)}>原始大小</Button>
          <Button size="mini" aria-label={`${title}缩小`} onClick={() => setZoom(Math.max(0.25, (zoom ?? 1) - 0.25))}>−</Button>
          <Button size="mini" aria-label={`${title}放大`} onClick={() => setZoom(Math.min(2, (zoom ?? 1) + 0.25))}>＋</Button>
        </div>
      </div>
      <p className={`${styles.paragraph} ${styles.flowDescription}`}>{description}</p>
      {error ? <Alert type="error" content="流程图加载失败" action={<Button size="mini" onClick={() => setRetry((value) => value + 1)}>重试</Button>} /> : (
        <div className={styles.flowViewport} tabIndex={0}>
          {result.svg ? <div className={styles.flowSvg} style={{ width: zoom === null ? '100%' : result.width * zoom }} dangerouslySetInnerHTML={{ __html: result.svg }} /> : <Spin />}
        </div>
      )}
    </section>
  );
}
