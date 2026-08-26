import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  Message,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tooltip,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import { IconDownload, IconEdit, IconPlus, IconUpload } from '@arco-design/web-react/icon';
import { BusinessCustomParameterAnnotationMarker } from '@/components/businessCustomParameterAnnotations';
import {
  businessParamTypeMeta,
  type BusinessParamConnectorRef,
  type BusinessParamSet,
  type BusinessParamType,
  deleteBusinessParamSet,
  getBusinessParamColumns,
  getBusinessParamSets,
  getConnectorParamSchema,
  getConnectorRefs,
  saveBusinessParamSet,
  subscribeBusinessParamStore,
} from '@/mocks/businessParams';
import styles from './index.module.less';

export type ParameterMenuKey =
  | '本店商品配置'
  | '行业类目配置'
  | '竞品店铺配置'
  | '竞品商品配置'
  | '竞品品牌配置';

const parameterMenus: Array<{
  key: ParameterMenuKey;
  paramType: BusinessParamType;
  title: string;
  addText: string;
  placeholder: string;
  objectTitle: string;
}> = [
  {
    key: '本店商品配置',
    paramType: 'GOOD',
    title: '本店商品配置',
    addText: '新增参数集',
    placeholder: '请输入默认参数集名称',
    objectTitle: '商品集',
  },
  {
    key: '行业类目配置',
    paramType: 'CATEGORY',
    title: '行业类目配置',
    addText: '新增参数集',
    placeholder: '请输入默认参数集名称',
    objectTitle: '行业类目',
  },
  {
    key: '竞品店铺配置',
    paramType: 'COMPETE_STORE',
    title: '竞品店铺配置',
    addText: '新增参数集',
    placeholder: '请输入默认参数集名称',
    objectTitle: '竞品店铺',
  },
  {
    key: '竞品商品配置',
    paramType: 'COMPETE_GOOD',
    title: '竞品商品配置',
    addText: '新增参数集',
    placeholder: '请输入默认参数集名称',
    objectTitle: '竞品商品',
  },
  {
    key: '竞品品牌配置',
    paramType: 'COMPETE_BRAND',
    title: '竞品品牌配置',
    addText: '新增参数集',
    placeholder: '请输入默认参数集名称',
    objectTitle: '竞品品牌',
  },
];

const menuMap = parameterMenus.reduce<Record<ParameterMenuKey, (typeof parameterMenus)[number]>>((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {} as Record<ParameterMenuKey, (typeof parameterMenus)[number]>);

function createEmptyRow(labels: string[]) {
  return labels.reduce<Record<string, string>>((row, label) => {
    row[label] = '';
    return row;
  }, { id: `param-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
}

export default function ParameterManagement({ menuKey }: { menuKey: ParameterMenuKey }) {
  const [form] = Form.useForm();
  const menu = menuMap[menuKey] || menuMap['本店商品配置'];
  const [records, setRecords] = useState<BusinessParamSet[]>(getBusinessParamSets());
  const [connectorOptions, setConnectorOptions] = useState<BusinessParamConnectorRef[]>(getConnectorRefs());
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BusinessParamSet | null>(null);
  const [drawerFieldLabels, setDrawerFieldLabels] = useState<string[]>(businessParamTypeMeta[menu.paramType].columns);
  const [drawerRows, setDrawerRows] = useState<Array<Record<string, string>>>([]);
  const [drawerErrors, setDrawerErrors] = useState<Record<string, string>>({});
  const [associatedConnectorError, setAssociatedConnectorError] = useState('');

  useEffect(() => subscribeBusinessParamStore(() => {
    setRecords(getBusinessParamSets());
    setConnectorOptions(getConnectorRefs());
  }), []);

  const filteredRecords = useMemo(() => records.filter((item) => (
    item.bizParamType === menu.paramType
    && (!keyword || item.paramName.includes(keyword))
  )), [keyword, menu.paramType, records]);

  const pageData = filteredRecords.slice((page - 1) * pageSize, page * pageSize);
  const drawerFieldRows = drawerRows;

  const getAssociatedConnectorSchemaError = (connectorNames: string[] = []) => {
    const connectorMap = new Map(connectorOptions.map((connector) => [connector.name, connector]));
    const schemas = connectorNames
      .map((connectorName) => {
        const connector = connectorMap.get(connectorName);
        return getConnectorParamSchema(connector?.id, connector?.name || connectorName);
      })
      .filter((schema): schema is NonNullable<ReturnType<typeof getConnectorParamSchema>> => Boolean(schema));

    if (schemas.some((schema) => schema.bizParamType !== menu.paramType)) {
      return '关联数据源业务参数类型不一致，请拆分参数集';
    }

    const firstHeaders = schemas[0]?.headers.join('|');
    if (firstHeaders && schemas.some((schema) => schema.headers.join('|') !== firstHeaders)) {
      return '关联数据源表头 schema 不一致，请拆分参数集';
    }

    return '';
  };

  const getFieldLabelsByConnectorNames = (connectorNames: string[] = [], record?: BusinessParamSet) => {
    const connectorMap = new Map(connectorOptions.map((connector) => [connector.name, connector]));
    const connectorName = connectorNames[0];
    if (connectorName) {
      const connector = connectorMap.get(connectorName);
      const labels = getBusinessParamColumns(menu.paramType, connector?.id, connector?.name || connectorName);
      if (labels.length) return labels;
    }
    if (record?.previewColumns?.length) return record.previewColumns;
    return businessParamTypeMeta[menu.paramType].columns;
  };

  const normalizeRowsByLabels = (rows: Array<Record<string, string>>, labels: string[]) => {
    if (!rows.length) return [createEmptyRow(labels)];
    return rows.map((row) => labels.reduce<Record<string, string>>((nextRow, label) => {
      nextRow[label] = row[label] || '';
      return nextRow;
    }, {
      id: row.id || `param-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }));
  };

  const updateDrawerCell = (rowIndex: number, label: string, value: string) => {
    setDrawerRows((prev) => prev.map((row, index) => (
      index === rowIndex ? { ...row, [label]: value } : row
    )));
    setDrawerErrors((prev) => {
      const key = `${rowIndex}-${label}`;
      if (!prev[key]) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const addDrawerRow = () => {
    setDrawerRows((prev) => [...prev, createEmptyRow(drawerFieldLabels)]);
  };

  const removeDrawerRow = (rowIndex: number) => {
    setDrawerRows((prev) => {
      const nextRows = prev.filter((_, index) => index !== rowIndex);
      return nextRows.length ? nextRows : [createEmptyRow(drawerFieldLabels)];
    });
  };

  const handleAssociatedConnectorsChange = (connectorNames: string[]) => {
    const schemaError = getAssociatedConnectorSchemaError(connectorNames);
    setAssociatedConnectorError(schemaError);
    if (schemaError) Message.warning(schemaError);
    const nextLabels = getFieldLabelsByConnectorNames(connectorNames, editingRecord || undefined);
    setDrawerFieldLabels(nextLabels);
    setDrawerRows((prev) => normalizeRowsByLabels(prev, nextLabels));
    setDrawerErrors((prev) => Object.fromEntries(
      Object.entries(prev).filter(([key]) => nextLabels.some((label) => key.endsWith(`-${label}`))),
    ));
  };

  const drawerFieldColumns: ColumnProps<Record<string, string>>[] = [
    ...drawerFieldLabels.map((label) => ({
      title: label,
      dataIndex: label,
      render: (value: string, _record, rowIndex) => {
        const cellError = drawerErrors[`${rowIndex}-${label}`];
        return (
          <Form.Item
            className={styles.editorCellFormItem}
            validateStatus={cellError ? 'error' : undefined}
            help={cellError}
          >
            <Input
              value={value}
              placeholder={`请输入${label}`}
              onChange={(nextValue) => updateDrawerCell(rowIndex, label, nextValue)}
            />
          </Form.Item>
        );
      },
    })),
    {
      title: '操作',
      width: 80,
      render: (_, _record, rowIndex) => (
        <Button type="text" status="danger" size="mini" onClick={() => removeDrawerRow(rowIndex)}>
          删除
        </Button>
      ),
    },
  ];

  const updatePageFilter = (nextKeyword: string) => {
    setPage(1);
    setKeyword(nextKeyword);
  };

  const openEditor = (record?: BusinessParamSet) => {
    const associatedConnectorNames = record?.associatedConnectors.map((connector) => connector.name) || [];
    const nextFieldLabels = getFieldLabelsByConnectorNames(associatedConnectorNames, record);
    setEditingRecord(record || null);
    setDrawerFieldLabels(nextFieldLabels);
    form.setFieldsValue({
      paramName: record?.paramName || '',
      associatedConnectors: associatedConnectorNames,
      paramRemark: record?.paramRemark || '',
    });
    setDrawerRows(record?.previewRows?.length
      ? normalizeRowsByLabels(record.previewRows.map((row, index) => ({ id: `${record.id}-${index}`, ...row })), nextFieldLabels)
      : [createEmptyRow(nextFieldLabels)]);
    setDrawerErrors({});
    setAssociatedConnectorError(getAssociatedConnectorSchemaError(associatedConnectorNames));
    setDrawerVisible(true);
  };

  useEffect(() => {
    const openParamDrawer = () => openEditor();
    window.addEventListener('business-custom:open-param-drawer', openParamDrawer);
    return () => window.removeEventListener('business-custom:open-param-drawer', openParamDrawer);
  }, [menu.paramType, records, connectorOptions]);

  const closeEditor = () => {
    setDrawerVisible(false);
    setEditingRecord(null);
    setDrawerRows([]);
    setDrawerErrors({});
    setAssociatedConnectorError('');
    form.resetFields();
  };

  const saveEditor = () => {
    form.validate().then((values) => {
      const schemaError = getAssociatedConnectorSchemaError(values.associatedConnectors || []);
      setAssociatedConnectorError(schemaError);
      if (schemaError) return;

      const normalizedRows = drawerRows.map((row) => (
        drawerFieldLabels.reduce<Record<string, string>>((nextRow, label) => {
          nextRow[label] = (row[label] || '').trim();
          return nextRow;
        }, {})
      ));
      const nextErrors: Record<string, string> = {};
      normalizedRows.forEach((row, rowIndex) => {
        drawerFieldLabels.forEach((label) => {
          if (!row[label]) nextErrors[`${rowIndex}-${label}`] = `请填写${label}`;
        });
      });
      if (!normalizedRows.length) {
        drawerFieldLabels.forEach((label) => {
          nextErrors[`0-${label}`] = `请填写${label}`;
        });
      }
      if (Object.keys(nextErrors).length) {
        setDrawerErrors(nextErrors);
        return;
      }

      const connectorMap = new Map(connectorOptions.map((connector) => [connector.name, connector]));
      const selectedConnectors = (values.associatedConnectors || [])
        .map((connectorName: string) => connectorMap.get(connectorName) || { id: connectorName, name: connectorName });

      saveBusinessParamSet({
        id: editingRecord?.id,
        bizParamType: menu.paramType,
        paramName: values.paramName,
        paramRemark: values.paramRemark || '',
        previewColumns: drawerFieldLabels,
        previewRows: normalizedRows,
        associatedConnectors: selectedConnectors,
        channel: editingRecord?.channel,
        platform: editingRecord?.platform,
        status: editingRecord?.status || 'enabled',
      });
      setRecords(getBusinessParamSets());
      setConnectorOptions(getConnectorRefs());
      Message.success(editingRecord ? '编辑成功' : '新增成功');
      closeEditor();
    });
  };

  const confirmDeleteRecord = (record: BusinessParamSet) => {
    Modal.confirm({
      title: '删除参数集',
      content: '参数集删除后不可被数据源绑定使用，确定删除吗？',
      okText: '删除',
      okButtonProps: { status: 'danger' },
      onOk: () => {
        deleteBusinessParamSet(record.id);
        setRecords(getBusinessParamSets());
        Message.success('删除成功');
      },
    });
  };

  const columns: ColumnProps<BusinessParamSet>[] = [
    {
      title: '参数集名称',
      dataIndex: 'paramName',
      width: 240,
      ellipsis: true,
      render: (value) => (
        <Tooltip content={value}>
          <div className={styles.nameCell}>
            <span>{value}</span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: '备注',
      dataIndex: 'paramRemark',
      width: 220,
      ellipsis: true,
      render: (value) => (
        value ? (
          <Tooltip content={value}>
            <span className={styles.remarkCell}>{value}</span>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: (
        <BusinessCustomParameterAnnotationMarker noteId="BCP-4.1">
          关联数据源
        </BusinessCustomParameterAnnotationMarker>
      ),
      dataIndex: 'associatedConnectors',
      width: 280,
      render: (value: BusinessParamConnectorRef[]) => (
        value?.length ? value.map((connector) => connector.name).join('、') : '-'
      ),
    },
    {
      title: '操作',
      width: 128,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} className={styles.operationCell}>
          <Button type="text" icon={<IconEdit />} onClick={() => openEditor(record)}>编辑</Button>
          <Button type="text" status="danger" onClick={() => confirmDeleteRecord(record)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Input.Search
            className={styles.searchInput}
            allowClear
            placeholder="请输入默认参数集名称"
            value={keyword}
            onChange={updatePageFilter}
            onSearch={updatePageFilter}
          />
        </div>
        <div className={styles.toolbarActions}>
          <Button type="primary" icon={<IconPlus />} onClick={() => openEditor()}>
            {menu.addText}
          </Button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <Table<BusinessParamSet>
          rowKey="id"
          data={pageData}
          columns={columns}
          pagination={false}
          scroll={{ x: 900, y: 'calc(100vh - 286px)' }}
          noDataElement={<Empty description="暂无参数集" />}
        />
      </div>

      <div className={styles.pageFooter}>
        <span>共 {filteredRecords.length} 条</span>
        <Pagination
          total={filteredRecords.length}
          current={page}
          pageSize={pageSize}
          sizeCanChange
          showJumper
          sizeOptions={[20, 50, 100]}
          onChange={(nextPage, nextPageSize) => {
            setPage(nextPageSize === pageSize ? nextPage : 1);
            setPageSize(nextPageSize);
          }}
        />
      </div>

      <Drawer
        title={(
          <BusinessCustomParameterAnnotationMarker noteId="BCP-4.2">
            {editingRecord ? `编辑${menu.objectTitle}` : menu.addText}
          </BusinessCustomParameterAnnotationMarker>
        )}
        visible={drawerVisible}
        width={720}
        className={styles.editorDrawer}
        onCancel={closeEditor}
        footer={(
          <div className={styles.drawerFooter}>
            <Button onClick={closeEditor}>取消</Button>
            <Button type="primary" onClick={saveEditor}>保存</Button>
          </div>
        )}
      >
        <Form form={form} layout="vertical" className={styles.editorForm}>
          <Form.Item
            field="associatedConnectors"
            label="关联数据源"
            rules={[{ required: true, message: '请选择关联数据源' }]}
            validateStatus={associatedConnectorError ? 'error' : undefined}
            help={associatedConnectorError}
          >
            <Select mode="multiple" maxTagCount="responsive" placeholder="请选择关联数据源" onChange={handleAssociatedConnectorsChange}>
              {connectorOptions.map((connector) => (
                <Select.Option key={connector.id} value={connector.name}>{connector.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            field="paramName"
            label="默认参数集名称"
            rules={[{ required: true, message: '请输入默认参数集名称' }]}
          >
            <Input placeholder={menu.placeholder} />
          </Form.Item>
          <div className={styles.editorSectionHeader}>
            <span>{menu.objectTitle}信息</span>
            <Space size={8}>
              <Button type="text" icon={<IconUpload />} onClick={() => Message.info('导入模板已打开')}>导入</Button>
              <Button type="text" icon={<IconDownload />} onClick={() => Message.success('导出任务已创建')}>导出</Button>
              <Button icon={<IconPlus />} onClick={addDrawerRow}>添加</Button>
            </Space>
          </div>
          <Table<Record<string, string>>
            rowKey="id"
            className={styles.editorTable}
            data={drawerFieldRows}
            columns={drawerFieldColumns}
            pagination={false}
          />
          <Form.Item field="paramRemark" label="备注">
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
