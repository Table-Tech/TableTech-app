import { Translations } from '../contexts/LanguageContext';
import { commonEN } from './common/common.en';
import { dashboardEN } from './pages/dashboard.en';
import { ordersEN } from './pages/orders.en';
import { tablesEN } from './pages/tables.en';
import { menuEN } from './pages/menu.en';

const en: Translations = {
  ...commonEN,
  ...dashboardEN,
  ...ordersEN,
  ...tablesEN,
  ...menuEN,
};

export default en;