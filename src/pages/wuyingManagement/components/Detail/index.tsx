import { useEffect, useState } from 'react';
import { Descriptions, Drawer, Spin } from '@arco-design/web-react';
import * as ServiceApi from '../../services';
import type { DesktopInfo } from '../../interface';

interface Props {
  id: string;
  visible: boolean;
  onClose: () => void;
  ok: () => void;
}

export default function DetailDrawer({ id, visible = false, onClose }: Props) {
  const [detailInfo, setDetailInfo] = useState<DesktopInfo | null>(null);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    if (!visible || !id) return;
    setPageLoading(true);
    ServiceApi.getDesktopInfo({ id })
      .then(({ bizData }) => {
        setDetailInfo(bizData || null);
      })
      .finally(() => setPageLoading(false));
  }, [visible, id]);

  return (
    <Drawer
      title="云桌面详情"
      visible={visible}
      onCancel={() => {
        setDetailInfo(null);
        onClose();
      }}
      width={520}
      unmountOnExit
      maskClosable
    >
      <Spin loading={pageLoading} block>
        <Descriptions
          border
          column={1}
          size="small"
          data={[
            { key: 'desktopName', label: '云桌面名称', value: detailInfo?.desktopName || '--' },
            { key: 'desktopId', label: '云桌面ID', value: detailInfo?.desktopId || '--' },
            { key: 'ticket', label: '机器人口令', value: detailInfo?.ticket || '--' },
            { key: 'todeskCode', label: 'ToDesk', value: detailInfo?.todeskCode || '--' },
            { key: 'configuration', label: '配置', value: detailInfo?.configuration || '--' },
            { key: 'systemDiskSize', label: '系统盘', value: detailInfo?.systemDiskSize || '--' },
            { key: 'dataDiskSize', label: '数据盘', value: detailInfo?.dataDiskSize || '--' },
            { key: 'chargeType', label: '付费方式', value: detailInfo?.chargeType || '--' },
            { key: 'expiredTime', label: '到期时间', value: detailInfo?.expiredTime || '--' },
            { key: 'cloudAccountName', label: '天翼云账号', value: detailInfo?.cloudAccountName || '--' },
            { key: 'bindStatus', label: '用户绑定状态', value: detailInfo?.bindStatus || '--' },
          ]}
        />
      </Spin>
    </Drawer>
  );
}
