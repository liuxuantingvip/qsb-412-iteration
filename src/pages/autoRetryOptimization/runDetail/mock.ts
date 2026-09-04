import type { RunRecord, RunStatus } from '../interface';
import type {
  ConnectorExecution,
  DetailStatus,
  RunDetailData,
  RuntimeLog,
  StorageLog,
} from './model';

const toCollectionStatus = (status: RunStatus): DetailStatus => {
  if (status === '失败') return '运行失败';
  if (status === '部分成功') return '成功(部分无数据)';
  return status;
};

const toValidationStatus = (status: RunStatus): DetailStatus => {
  if (status === '失败') return '异常(1)';
  if (status === '部分成功') return '异常(1)';
  return status;
};

const toStorageStatus = (status: RunStatus): DetailStatus => {
  if (status === '部分成功') return '成功(部分无数据)';
  return status;
};

const getDate = (dateTime: string) => dateTime.slice(0, 10);

const getDurationSeconds = (startTime: string, endTime: string) => {
  const start = new Date(startTime.replace(' ', 'T')).getTime();
  const end = new Date(endTime.replace(' ', 'T')).getTime();
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.max(0, Math.round((end - start) / 1000))
    : 0;
};

const buildRuntimeLogs = (record: RunRecord): RuntimeLog[] => Array.from({ length: 16 }, (_, index) => ({
  id: `${record.key}-runtime-log-${index + 1}`,
  time: `${getDate(record.endTime)} ${String(17 + Math.floor(index / 6)).padStart(2, '0')}:${String(51 - (index % 6)).padStart(2, '0')}:25`,
  content: index % 4 === 0
    ? '【数据处理】开始校验采集文件并生成处理结果'
    : index % 4 === 1
      ? '取数宝-上报采集文件信息成功'
      : index % 4 === 2
        ? '【数据处理】上传合并结果压缩文件成功'
        : '取数宝-触发取数结束标记成功',
  level: index === 7 ? '警告日志' : '输出日志',
}));

const buildStorageLogs = (
  record: RunRecord,
  connectors: ConnectorExecution[],
): StorageLog[] => {
  const connector = connectors.find((item) => !item.connectorName.endsWith('-登录')) ?? connectors[0];
  const businessDate = getDate(record.endTime);
  const tables: Array<{
    databaseType: string;
    tableChineseName: string;
    tableEnglishName: string;
    attempts: Array<Pick<StorageLog, 'status' | 'writtenRows' | 'durationSeconds' | 'content' | 'level' | 'failureStage'>>;
  }> = [
    {
      databaseType: 'MySQL',
      tableChineseName: '营销场景报表数据明细分日',
      tableEnglishName: 'ads_marketing_scene_detail_di',
      attempts: [
        { status: '失败', writtenRows: 0, durationSeconds: 41, content: '目标表连接超时，本次未写入数据', level: '错误日志', failureStage: '连接目标库' },
        { status: '失败', writtenRows: 0, durationSeconds: 48, content: '目标表唯一键冲突，请检查主键映射后重新入库', level: '错误日志', failureStage: '写入目标表' },
      ],
    },
    {
      databaseType: 'MySQL',
      tableChineseName: '店铺经营概况日表',
      tableEnglishName: 'dws_shop_operation_di',
      attempts: [
        { status: '失败', writtenRows: 0, durationSeconds: 33, content: '写入任务超时，已进入自动重试', level: '错误日志', failureStage: '写入目标表' },
        { status: '成功', writtenRows: 1842, durationSeconds: 36, content: '目标表写入完成，共写入 1,842 条', level: '输出日志' },
      ],
    },
    {
      databaseType: 'ClickHouse',
      tableChineseName: '商品效果明细日表',
      tableEnglishName: 'dwd_product_effect_detail_di',
      attempts: [
        { status: '成功', writtenRows: 328, durationSeconds: 20, content: '目标表写入完成，共写入 328 条', level: '输出日志' },
        { status: '成功(部分无数据)', writtenRows: 328, durationSeconds: 22, content: '目标表写入完成，2 个业务日期无数据', level: '警告日志' },
      ],
    },
    {
      databaseType: 'PostgreSQL',
      tableChineseName: '推广计划消耗日报',
      tableEnglishName: 'ads_campaign_cost_di',
      attempts: [
        { status: '失败', writtenRows: 0, durationSeconds: 28, content: '批次锁等待超时，已进入自动重试', level: '错误日志', failureStage: '准备写入' },
        { status: '成功', writtenRows: 1260, durationSeconds: 31, content: '目标表写入完成，共写入 1,260 条', level: '输出日志' },
      ],
    },
  ];

  return tables.flatMap((table, tableIndex) => table.attempts.map((attempt, attemptIndex) => ({
    id: `${record.key}-storage-${tableIndex + 1}-${attemptIndex + 1}`,
    time: `${businessDate} 17:${String(40 + tableIndex * 2 + attemptIndex).padStart(2, '0')}:18`,
    storeName: record.storeName,
    connectorName: connector.connectorName,
    databaseType: table.databaseType,
    tableChineseName: table.tableChineseName,
    tableEnglishName: table.tableEnglishName,
    businessDate,
    attemptNo: attemptIndex + 1,
    durationSeconds: attempt.durationSeconds,
    writtenRows: attempt.writtenRows,
    status: attempt.status,
    content: attempt.content,
    failureStage: attempt.failureStage,
    level: attempt.level,
  })));
};

export function buildRunDetailData(record: RunRecord): RunDetailData {
  const collectionStatus = toCollectionStatus(record.collectionStatus);
  const validationStatus = toValidationStatus(record.validationStatus);
  const storageStatus = toStorageStatus(record.storageStatus);
  const businessDate = `${getDate(record.startTime)}~${getDate(record.endTime)}`;
  const connectors: ConnectorExecution[] = [
    {
      id: `${record.key}-connector-login`,
      storeName: record.storeName,
      connectorName: '生意参谋-登录',
      businessStartDate: getDate(record.startTime),
      businessEndDate: getDate(record.endTime),
      collectionStatus,
      validationStatus: collectionStatus === '运行失败' ? '待运行' : validationStatus,
      storageStatus: collectionStatus === '运行失败' ? '待运行' : storageStatus,
      issueReason: collectionStatus === '运行失败'
        ? `页面异常信息描述：（${record.issueReason || '页面加载异常'}）`
        : undefined,
    },
    {
      id: `${record.key}-connector-report`,
      storeName: record.storeName,
      connectorName: '万相台无界-营销场景报表数据明细分日',
      businessStartDate: getDate(record.startTime),
      businessEndDate: getDate(record.endTime),
      collectionStatus: collectionStatus === '运行失败' ? '待运行' : collectionStatus,
      validationStatus: collectionStatus === '运行失败' ? '待运行' : validationStatus,
      storageStatus: collectionStatus === '运行失败' ? '待运行' : storageStatus,
      noDataNote: storageStatus === '成功(部分无数据)' ? '暂无数据文件' : undefined,
      issueReason: record.issueStage === 'ingestion' ? record.issueReason : undefined,
    },
  ];
  const runtimeLogs = buildRuntimeLogs(record);
  const storageLogs = buildStorageLogs(record, connectors);
  const executeRecord = {
    id: `${record.key}-execute`,
    recordId: `${record.key.replace(/[^a-zA-Z0-9]/g, '')}e0c914dd85bf2350de04065`.slice(0, 32),
    planName: record.planName,
    planType: record.planName.includes('回溯') ? '回溯计划' : '日常计划',
    dataCycle: '日',
    platformType: '淘系',
    platformName: record.planName.includes('阿里妈妈') ? '阿里妈妈' : '电商平台',
    storeName: record.storeName,
    robotToken: `${record.key.replace(/[^a-zA-Z0-9]/g, '')}7309fc64337936d`.slice(0, 32),
    businessDate,
    startTime: record.startTime,
    endTime: record.endTime,
    durationSeconds: getDurationSeconds(record.startTime, record.endTime),
    collectionStatus,
    validationStatus,
    storageStatus,
    stores: [{
      id: `${record.key}-store`,
      storeName: record.storeName,
      collectionStatus,
      validationStatus,
      storageStatus,
      connectors,
    }],
    runtimeLogs,
    storageLogs,
  };

  return {
    summary: {
      planName: executeRecord.planName,
      planType: executeRecord.planType,
      dataCycle: executeRecord.dataCycle,
      platformType: executeRecord.platformType,
      platformName: executeRecord.platformName,
    },
    executeRecords: [executeRecord],
    runtimeLogs,
    storageLogs,
  };
}
