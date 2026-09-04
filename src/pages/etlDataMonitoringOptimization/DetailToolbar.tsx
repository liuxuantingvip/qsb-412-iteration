import { Button, Input, Select, Tag } from '@arco-design/web-react';
import { IconLeft } from '@arco-design/web-react/icon';
import { detailStageOptions } from './detailPresentation';
import type { DetailStageField } from './detailPresentation';
import styles from './index.module.less';

export type DetailSearchField = 'taskName' | 'storeName' | 'connectorName' | 'tableName';
export interface DetailFilterValue {
  searchField: DetailSearchField;
  keyword: string;
  stage: DetailStageField;
  status?: string;
}
export const defaultDetailFilter: DetailFilterValue = { searchField: 'taskName', keyword: '', stage: 'collectStatus' };

export function DetailFilters({ value, onChange, noteId }: { value: DetailFilterValue; onChange: (value: DetailFilterValue) => void; noteId?: string }) {
  return (
    <div className={styles.detailFilters} data-note-id={noteId}>
      <Input.Group compact className={`${styles.detailSearchGroup} qsb-arco-composite-search`}>
        <Select aria-label="搜索字段" className={styles.keywordFieldSelect} value={value.searchField}
          options={[{ label: '任务名', value: 'taskName' }, { label: '店铺名', value: 'storeName' }, { label: '数据源名', value: 'connectorName' }, { label: '表名', value: 'tableName' }]}
          onChange={searchField => onChange({ ...value, searchField })} />
        <Input.Search className={styles.keywordSearch} allowClear searchButton={false} placeholder="请输入搜索内容"
          value={value.keyword} onChange={keyword => onChange({ ...value, keyword })} onSearch={keyword => onChange({ ...value, keyword })} />
      </Input.Group>
      <Input.Group compact className={`${styles.detailStatusFilterGroup} qsb-arco-composite-search`}>
        <Select aria-label="状态阶段" className={styles.detailStatusFieldSelect} value={value.stage}
          options={[{ label: '取数执行', value: 'collectStatus' }, { label: '数据入库', value: 'importStatus' }, { label: '数据校验', value: 'validationStatus' }]}
          onChange={stage => onChange({ ...value, stage, status: undefined })} />
        <Select aria-label="阶段状态" allowClear className={styles.detailStatusValueSelect} placeholder="请选择状态" value={value.status}
          options={detailStageOptions[value.stage]} onChange={status => onChange({ ...value, status })} />
      </Input.Group>
    </div>
  );
}

export function DetailHeading({ title, date, onBack, noteId }: { title: string; date: string; onBack: () => void; noteId?: string }) {
  return <div className={styles.detailTitle} data-note-id={noteId}>
    <Button className={styles.backButton} type="text" icon={<IconLeft />} onClick={onBack}>返回</Button>
    <span title={title}>{title}</span>
    <Tag className={styles.statusTag} color="arcoblue">{date}</Tag>
  </div>;
}
