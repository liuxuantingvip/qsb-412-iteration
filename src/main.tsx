import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from '@arco-design/web-react';
import VChart, { type ITheme } from '@visactor/vchart';
import qushubaoLightTheme from '@semi-bot/semi-vchart-theme-qushubao/light.json';
import '@arco-design/web-react/dist/css/arco.css';
import './styles/global.less';
import App from './App';

const QUSHUBAO_THEME_NAME = 'qushubaoLight';

VChart.ThemeManager.registerTheme(
  QUSHUBAO_THEME_NAME,
  qushubaoLightTheme as unknown as ITheme,
);
VChart.ThemeManager.setCurrentTheme(QUSHUBAO_THEME_NAME);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider componentConfig={{ Card: { bordered: false } }}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
