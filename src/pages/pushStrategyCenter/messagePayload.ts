// Protocol examples for the prototype, not a webhook sender. Callers supply
// uploaded image resources and the resolved portal URL; no local URLs are sent.
export interface MessageModel {
  title: string;
  time: string;
  strategy: string;
  tone: 'danger' | 'warning' | 'success';
  groups: Array<{ title: string; metrics: Array<{ label: string; value: number }> }>;
  facts: string[][];
  issues: string[][];
  failure?: string;
  emptyText?: string;
  monitor: boolean;
  monitorViews?: Array<{ id: string; name: string; startTime: string; failure?: string }>;
}

export interface MessageAssets {
  portalUrl: string;
  monitorImages?: Record<string, { feishuImageKey?: string; imageUrl?: string }>;
}

type Json = string | number | boolean | Json[] | { [key: string]: Json };
type Payload = { [key: string]: Json };
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
const elementCount = (value: Json): number => typeof value !== 'object' ? 0
  : Array.isArray(value) ? value.reduce<number>((sum, item) => sum + elementCount(item), 0)
    : (typeof value.tag === 'string' ? 1 : 0) + Object.values(value).reduce<number>((sum, item) => sum + elementCount(item), 0);
const escapeMarkdown = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_\[\]]/g, '\\$&');
const md = (content: string, extra: Payload = {}): Payload => ({ tag: 'markdown', content, ...extra });
const plain = (content: string) => ({ tag: 'plain_text', content });

function metricColor(label: string) {
  if (label.includes('异常') || label === '失败') return 'red';
  if (label === '成功' || label === '全部完成') return 'green';
  return label === '运行中' ? 'orange' : 'default';
}

function textBody(model: MessageModel, markdown: boolean) {
  const text = markdown ? escapeMarkdown : (value: string) => value;
  const strong = (value: string) => markdown ? `**${text(value)}**` : value;
  const sections = model.groups.map((group) => [
    ...(group.title ? [strong(group.title)] : []),
    group.metrics.map(({ label, value }) => {
      const valueText = `${label} ${value}`;
      return ['成功', '失败'].includes(label) || label.includes('异常') ? strong(valueText) : text(valueText);
    }).join(!markdown && !group.title && group.metrics.every(({ label }) => label.includes('异常')) ? '\n' : ' · '),
  ].join('\n'));
  if (model.facts.length) sections.push(model.facts.map(([label, value]) => `${strong(label)}：${text(value)}`).join('\n\n'));
  if (model.failure) sections.push(`${strong('失败原因')}\n${text(model.failure)}`);
  if (model.emptyText) sections.push(text(model.emptyText));
  if (model.issues.length) sections.push([
    strong('异常列表'),
    ...model.issues.map(([name, detail], index) => `${index + 1}. ${strong(name)}\n${text(detail)}`),
  ].join('\n\n'));
  return sections.join('\n\n');
}

function feishu(model: MessageModel, assets: MessageAssets, issues = model.issues, omitted = false): Payload {
  const elements: Json[] = [];
  for (const group of model.groups) {
    if (group.title) elements.push(md(`**${escapeMarkdown(group.title)}**`));
    elements.push({
      tag: 'column_set', flex_mode: 'none', horizontal_spacing: '8px', horizontal_align: group.metrics.length === 3 ? 'center' : 'left',
      columns: group.metrics.map(({ label, value }) => ({
        tag: 'column', width: group.metrics.length < 4 ? '128px' : 'weighted', weight: 1, background_style: 'grey-50', padding: '8px',
        elements: [
          md(escapeMarkdown(label), { text_align: 'center', text_size: 'notation' }),
          md(`**<font color='${metricColor(label)}'>${value}</font>**`, { text_align: 'center', text_size: 'heading-2' }),
        ],
      })),
    });
  }
  for (const [label, value] of model.facts) elements.push(md(`**${escapeMarkdown(label)}：**${escapeMarkdown(value)}`));
  if (model.failure) elements.push({ tag: 'column_set', columns: [{
    tag: 'column', width: 'weighted', background_style: 'red-50', padding: '12px',
    elements: [md(`**失败原因**\n${escapeMarkdown(model.failure)}`)],
  }] });
  if (model.emptyText) elements.push(md(escapeMarkdown(model.emptyText)));
  if (model.monitor) {
    for (const [index, view] of (model.monitorViews ?? []).entries()) {
      if (index) elements.push({ tag: 'hr' });
      elements.push(md(`**${escapeMarkdown(view.name)}**\n业务日期：${escapeMarkdown(view.startTime.slice(0, 10))}`));
      if (view.failure) elements.push(md(`图片不可用：${escapeMarkdown(view.failure)}`));
      else {
        const image = assets.monitorImages?.[view.id];
        if (!image?.feishuImageKey) throw new Error('飞书图片需要上传后的 img_key');
        elements.push({ tag: 'img', img_key: image.feishuImageKey, alt: plain(view.name), scale_type: 'fit_horizontal', preview: true });
      }
    }
    if (omitted) elements.push(md('…'));
  }
  if (model.issues.length) {
    elements.push({ tag: 'column_set', columns: [{
      tag: 'column', width: 'weighted', background_style: 'grey-50', padding: '8px 12px', elements: [md('**异常列表**')],
    }] });
    for (const [index, [name, detail]] of issues.entries()) {
      const indexText = index < 99 ? `<number_tag background_color='red-50' font_color='red'>${index + 1}</number_tag>` : `${index + 1}.`;
      elements.push(md(`${indexText} **${escapeMarkdown(name)}**\n${escapeMarkdown(detail)}`));
    }
    if (omitted) elements.push(md('…'));
  }
  elements.push(md(`策略名称 ${escapeMarkdown(model.strategy)}`, { text_size: 'notation' }));
  elements.push({ tag: 'button', text: plain('前往门户'), type: 'primary_text', behaviors: [{ type: 'open_url', default_url: assets.portalUrl }] });
  return {
    msg_type: 'interactive',
    card: {
      schema: '2.0',
      header: { title: plain(model.title), subtitle: plain(model.time), template: model.tone === 'danger' ? 'red' : model.tone === 'success' ? 'green' : 'orange' },
      body: { direction: 'vertical', padding: '16px', elements },
    },
  };
}

export function buildChannelMessages(channel: 'FEISHU' | 'WECOM' | 'DINGTALK', model: MessageModel, assets: MessageAssets, onPrepared?: (sent: MessageModel, omitted: boolean) => void): Payload[] {
  if (!/^https?:\/\//.test(assets.portalUrl)) throw new Error('需要门户完整 URL');
  if (model.monitor && !model.monitorViews?.length && !model.emptyText) return [];
  if (channel === 'FEISHU') {
    if (model.monitor) {
      const views = model.monitorViews!;
      let count = views.length;
      let result = feishu(model, assets);
      while ((bytes(result) > 20 * 1024 || elementCount(result) > 200) && count > 0) {
        count -= 1;
        result = feishu({ ...model, monitorViews: views.slice(0, count) }, assets, [], true);
      }
      if (bytes(result) > 20 * 1024) throw new Error('飞书基础消息超过 20 KB');
      onPrepared?.({ ...model, monitorViews: views.slice(0, count) }, count < views.length);
      return [result];
    }
    let count = model.issues.length;
    let result = feishu(model, assets);
    // Measure the entire UTF-8 request, including JSON escaping and card layout.
    while ((bytes(result) > 20 * 1024 || elementCount(result) > 200) && count > 0) {
      count -= 1;
      result = feishu(model, assets, model.issues.slice(0, count), true);
    }
    if (bytes(result) > 20 * 1024) throw new Error('飞书基础消息超过 20 KB，无法仅省略异常明细');
    onPrepared?.({ ...model, issues: model.issues.slice(0, count) }, count < model.issues.length);
    return [result];
  }
  if (channel === 'WECOM') {
    if (model.monitor) {
      const sections = monitorMarkdown(model, assets);
      const content = (count: number) => [
        `### ${escapeMarkdown(model.title)}`, escapeMarkdown(model.time),
        sections.slice(0, count).join('\n\n---\n\n'),
        count < sections.length ? '…' : '',
        `策略名称 ${escapeMarkdown(model.strategy)}`, `[前往门户](${markdownUrl(assets.portalUrl)})`,
      ].filter(Boolean).join('\n\n');
      let count = sections.length;
      while (new TextEncoder().encode(content(count)).length > 4096 && count > 0) count -= 1;
      if (new TextEncoder().encode(content(count)).length > 4096) throw new Error('企微基础消息超过 4096 字节');
      onPrepared?.({ ...model, monitorViews: model.monitorViews!.slice(0, count) }, count < sections.length);
      return [{ msgtype: 'markdown_v2', markdown_v2: { content: content(count) } }];
    }
    const notice: Payload = {
      msgtype: 'template_card',
      template_card: {
        card_type: 'text_notice',
        main_title: { title: model.title, desc: model.time },
        sub_title_text: textBody(model, false),
        horizontal_content_list: [{ keyname: '策略名称', value: model.strategy }],
        jump_list: [{ type: 1, title: '前往门户', url: assets.portalUrl }],
        card_action: { type: 1, url: assets.portalUrl },
      },
    };
    onPrepared?.(model, false);
    return [notice];
  }
  const parts = [`### ${escapeMarkdown(model.title)}`, escapeMarkdown(model.time), textBody(model, true)];
  if (model.monitor) {
    parts.push(monitorMarkdown(model, assets).join('\n\n---\n\n'));
  }
  parts.push(`策略名称 ${escapeMarkdown(model.strategy)}`);
  onPrepared?.(model, false);
  return [{ msgtype: 'actionCard', actionCard: { title: model.title, text: parts.filter(Boolean).join('\n\n'), singleTitle: '前往门户', singleURL: assets.portalUrl } }];
}

const markdownUrl = (url: string) => url.replace(/\(/g, '%28').replace(/\)/g, '%29');

function monitorMarkdown(model: MessageModel, assets: MessageAssets) {
  return (model.monitorViews ?? []).map((view) => {
    const lines = [`**${escapeMarkdown(view.name)}**`, `业务日期：${escapeMarkdown(view.startTime.slice(0, 10))}`];
    if (view.failure) lines.push(`图片不可用：${escapeMarkdown(view.failure)}`);
    else {
      const url = assets.monitorImages?.[view.id]?.imageUrl;
      if (!url || !/^https?:\/\//.test(url)) throw new Error('监控图片需要可访问的完整 URL');
      lines.push(`![${escapeMarkdown(view.name)}](${markdownUrl(url)})`);
    }
    return lines.join('\n\n');
  });
}
