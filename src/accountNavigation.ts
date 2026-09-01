export const accountNavigation = {
  个人中心: ['账号设置', '连接器管理', '短信队列管理', '机器人设备管理', '操作日志'],
  开放平台: ['API Keys', 'MCP 服务', '回调服务'],
} as const;

export type AccountArea = keyof typeof accountNavigation;
export type AccountMenuKey = typeof accountNavigation[AccountArea][number];

export const accountDefaultMenuKey: Record<AccountArea, AccountMenuKey> = {
  个人中心: '账号设置',
  开放平台: 'API Keys',
};

export const accountMenuKeys: AccountMenuKey[] = Object.values(accountNavigation).flat();

export const isAccountArea = (value: string): value is AccountArea => value in accountNavigation;

export const isAccountMenuKey = (value: string): value is AccountMenuKey => (
  accountMenuKeys.includes(value as AccountMenuKey)
);
