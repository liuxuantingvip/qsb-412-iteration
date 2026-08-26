import { Checkbox, Select, TimePicker } from '@arco-design/web-react';
import styles from './index.module.less';

export type TimeTypeValue = string | number | boolean;

export interface TimeTypeConfig {
  outTime?: string;
  startTime?: string;
  outWeekDay?: number;
  startWeekDay?: number;
  outDayOfMonth?: number;
  startDayOfMonth?: number;
  weekDay?: number;
  dayOfMonth?: number;
}

export type TimeConfigMap = Record<string, TimeTypeConfig>;

export const TIME_TYPE_LABEL: Record<number, string> = {
  0: '实时',
  1: '日',
  2: '周',
  3: '月',
};

export const dataTimeTypeOptions = [
  { label: '日', value: 1 },
  { label: '周', value: 2 },
  { label: '月', value: 3 },
  { label: '实时', value: 0 },
];

const weekOptions = [
  { label: '每周一', value: 1 },
  { label: '每周二', value: 2 },
  { label: '每周三', value: 3 },
  { label: '每周四', value: 4 },
  { label: '每周五', value: 5 },
  { label: '每周六', value: 6 },
  { label: '每周日', value: 7 },
];

const dayOfMonthOptions = Array.from({ length: 31 }, (_, index) => ({
  label: `每月${index + 1}日`,
  value: index + 1,
}));

export const createDefaultTimeConfig = (type: TimeTypeValue): TimeTypeConfig => {
  const typeNum = Number(type);
  if (typeNum === 2) {
    return { outWeekDay: 1, outTime: '08:30', startWeekDay: 1, startTime: '09:00' };
  }
  if (typeNum === 3) {
    return { outDayOfMonth: 1, outTime: '08:30', startDayOfMonth: 1, startTime: '09:00' };
  }
  return { outTime: '08:30', startTime: '09:00' };
};

const getTypeNumByLabel = (label: string) => {
  if (label === '天') return 1;
  const entry = Object.entries(TIME_TYPE_LABEL).find(([, value]) => value === label);
  return entry ? Number(entry[0]) : Number(label);
};

const filterDisplayTypes = (types: TimeTypeValue[] = []) => (
  [...types]
    .filter((type) => Number(type) !== 0)
    .sort((a, b) => Number(a) - Number(b))
);

const normalizeConfigItem = (item: TimeTypeConfig, typeNum: number): TimeTypeConfig => {
  if (typeNum === 2) {
    return {
      ...item,
      outWeekDay: item.outWeekDay ?? item.weekDay,
      startWeekDay: item.startWeekDay ?? item.weekDay,
    };
  }
  if (typeNum === 3) {
    return {
      ...item,
      outDayOfMonth: item.outDayOfMonth ?? item.dayOfMonth,
      startDayOfMonth: item.startDayOfMonth ?? item.dayOfMonth,
    };
  }
  return item;
};

const addMinutes = (time?: string, minutes = 30) => {
  if (!time) return { time: undefined, crossDay: false };
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return { time: undefined, crossDay: false };
  }
  const total = hour * 60 + minute + minutes;
  const normalized = total % (24 * 60);
  const nextHour = Math.floor(normalized / 60);
  const nextMinute = normalized % 60;
  return {
    time: `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`,
    crossDay: total >= 24 * 60,
  };
};

const isTimeConfigComplete = (typeNum: number, config: TimeTypeConfig) => {
  if (typeNum === 1) return Boolean(config.outTime && config.startTime);
  if (typeNum === 2) {
    return Boolean(config.outWeekDay && config.outTime && config.startWeekDay && config.startTime);
  }
  if (typeNum === 3) {
    return Boolean(config.outDayOfMonth && config.outTime && config.startDayOfMonth && config.startTime);
  }
  return true;
};

export const getIncompleteTimeConfigLabels = (
  config: TimeConfigMap,
  dataTimeTypes: TimeTypeValue[] = [],
) => filterDisplayTypes(dataTimeTypes).reduce<string[]>((labels, type) => {
  const typeNum = Number(type);
  const typeKey = TIME_TYPE_LABEL[typeNum] ?? String(type);
  const item = normalizeConfigItem(config[typeKey] || {}, typeNum);
  return isTimeConfigComplete(typeNum, item) ? labels : [...labels, typeKey];
}, []);

interface Props {
  value: TimeTypeValue[];
  timeConfig: TimeConfigMap;
  onChange?: (value: TimeTypeValue[]) => void;
  onTimeConfigChange?: (value: TimeConfigMap) => void;
  disabled?: boolean;
}

export default function TimeConfigFields({
  value,
  timeConfig,
  onChange,
  onTimeConfigChange,
  disabled = false,
}: Props) {
  const selectedTypes = (value || []).map((type) => Number(type));

  const updateConfig = (typeKey: string, patch: Partial<TimeTypeConfig>) => {
    const currentConfig = timeConfig[typeKey] || {};
    const finalPatch = { ...patch };

    if (patch.outTime !== undefined) {
      const next = addMinutes(patch.outTime, 30);
      finalPatch.startTime = next.time;

      if (currentConfig.outWeekDay !== undefined) {
        finalPatch.startWeekDay = next.crossDay
          ? (currentConfig.outWeekDay < 7 ? currentConfig.outWeekDay + 1 : 1)
          : currentConfig.outWeekDay;
      }
      if (currentConfig.outDayOfMonth !== undefined) {
        finalPatch.startDayOfMonth = next.crossDay
          ? (currentConfig.outDayOfMonth < 31 ? currentConfig.outDayOfMonth + 1 : 1)
          : currentConfig.outDayOfMonth;
      }
    }

    if (patch.outWeekDay !== undefined) {
      const next = addMinutes(patch.outTime || currentConfig.outTime, 30);
      finalPatch.startTime = next.time;
      finalPatch.startWeekDay = next.crossDay
        ? (patch.outWeekDay < 7 ? patch.outWeekDay + 1 : 1)
        : patch.outWeekDay;
    }

    if (patch.outDayOfMonth !== undefined) {
      const next = addMinutes(patch.outTime || currentConfig.outTime, 30);
      finalPatch.startTime = next.time;
      finalPatch.startDayOfMonth = next.crossDay
        ? (patch.outDayOfMonth < 31 ? patch.outDayOfMonth + 1 : 1)
        : patch.outDayOfMonth;
    }

    onTimeConfigChange?.({
      ...timeConfig,
      [typeKey]: {
        ...currentConfig,
        ...finalPatch,
      },
    });
  };

  const toggleType = (type: TimeTypeValue, checked: boolean) => {
    const typeNum = Number(type);
    const nextSet = new Set(selectedTypes);
    if (checked) {
      nextSet.add(typeNum);
    } else {
      nextSet.delete(typeNum);
    }
    const nextTypes = dataTimeTypeOptions
      .filter((item) => nextSet.has(Number(item.value)))
      .map((item) => item.value);
    onChange?.(nextTypes);
  };

  const renderTimePicker = (typeKey: string, field: 'outTime' | 'startTime', config: TimeTypeConfig) => (
    <TimePicker
      className={styles.timePicker}
      disabled={disabled}
      format="HH:mm"
      placeholder="请选择时间"
      value={config[field]}
      onChange={(time) => updateConfig(typeKey, { [field]: time })}
    />
  );

  const renderWeekRow = (typeKey: string, field: 'outTime' | 'startTime', config: TimeTypeConfig) => {
    const weekField = field === 'outTime' ? 'outWeekDay' : 'startWeekDay';
    return (
      <div className={styles.timeConfigControlRow}>
        <Select
          className={styles.periodSelect}
          disabled={disabled}
          placeholder="请选择"
          options={weekOptions}
          value={config[weekField]}
          onChange={(value) => updateConfig(typeKey, { [weekField]: value })}
        />
        {renderTimePicker(typeKey, field, config)}
      </div>
    );
  };

  const renderMonthRow = (typeKey: string, field: 'outTime' | 'startTime', config: TimeTypeConfig) => {
    const dayField = field === 'outTime' ? 'outDayOfMonth' : 'startDayOfMonth';
    return (
      <div className={styles.timeConfigControlRow}>
        <Select
          className={styles.periodSelect}
          disabled={disabled}
          placeholder="请选择"
          options={dayOfMonthOptions}
          value={config[dayField]}
          onChange={(value) => updateConfig(typeKey, { [dayField]: value })}
        />
        {renderTimePicker(typeKey, field, config)}
      </div>
    );
  };

  const renderContent = (
    typeKey: string,
    typeNum: number,
    field: 'outTime' | 'startTime',
    config: TimeTypeConfig,
  ) => {
    if (typeNum === 1) return renderTimePicker(typeKey, field, config);
    if (typeNum === 2) return renderWeekRow(typeKey, field, config);
    if (typeNum === 3) return renderMonthRow(typeKey, field, config);
    return null;
  };

  return (
    <div className={styles.timeConfigSection}>
      <div className={styles.timeConfigList}>
        {dataTimeTypeOptions.map((type) => {
          const typeNum = Number(type.value);
          const typeKey = TIME_TYPE_LABEL[typeNum] ?? String(type);
          const checked = selectedTypes.includes(typeNum);
          const config = normalizeConfigItem(timeConfig[typeKey] || createDefaultTimeConfig(typeNum), typeNum);
          return (
            <div className={styles.timeTypeCard} key={typeKey}>
              <div
                className={styles.timeTypeCardHeader}
                onClick={() => {
                  if (!disabled) toggleType(typeNum, !checked);
                }}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onChange={() => undefined}
                >
                  {type.label}
                </Checkbox>
              </div>
              {checked && typeNum !== 0 ? (
                <>
                  <div className={styles.timeTypeDivider} />
                  <div className={styles.timeConfigCols}>
                    <div className={styles.timeConfigCol}>
                      <div className={styles.timeConfigColTitle}>平台出数时间</div>
                      {renderContent(typeKey, typeNum, 'outTime', config)}
                    </div>
                    <div className={styles.timeConfigCol}>
                      <div className={styles.timeConfigColTitle}>建议启动时间</div>
                      {renderContent(typeKey, typeNum, 'startTime', config)}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const parseTimeConfig = (raw?: string | TimeConfigMap | null): TimeConfigMap => {
  if (!raw) return {};
  let parsed: TimeConfigMap = {};
  if (typeof raw === 'string') {
    try {
      const data = JSON.parse(raw);
      parsed = typeof data === 'object' && data !== null ? data : {};
    } catch {
      return {};
    }
  } else {
    parsed = raw;
  }

  const result: TimeConfigMap = {};
  Object.keys(parsed).forEach((key) => {
    result[key] = normalizeConfigItem(parsed[key], getTypeNumByLabel(key));
  });
  return result;
};

export const buildTimeConfigString = (
  config: TimeConfigMap,
  dataTimeTypes: TimeTypeValue[] = [],
) => {
  const displayTypes = filterDisplayTypes(dataTimeTypes);
  if (!displayTypes.length) return JSON.stringify({});

  const result: TimeConfigMap = {};
  displayTypes.forEach((type) => {
    const typeNum = Number(type);
    const typeKey = TIME_TYPE_LABEL[typeNum] ?? String(type);
    const item = normalizeConfigItem(config[typeKey] || {}, typeNum);
    if (typeNum === 1) {
      result[typeKey] = { outTime: item.outTime, startTime: item.startTime };
    }
    if (typeNum === 2) {
      result[typeKey] = {
        outWeekDay: item.outWeekDay,
        outTime: item.outTime,
        startWeekDay: item.startWeekDay,
        startTime: item.startTime,
      };
    }
    if (typeNum === 3) {
      result[typeKey] = {
        outDayOfMonth: item.outDayOfMonth,
        outTime: item.outTime,
        startDayOfMonth: item.startDayOfMonth,
        startTime: item.startTime,
      };
    }
  });
  return JSON.stringify(result);
};
