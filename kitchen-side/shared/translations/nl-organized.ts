import { Translations } from '../contexts/LanguageContext';
import { commonNL } from './common/common.nl';
import { dashboardNL } from './pages/dashboard.nl';
import { ordersNL } from './pages/orders.nl';
import { tablesNL } from './pages/tables.nl';
import { menuNL } from './pages/menu.nl';

const nl: Translations = {
  ...commonNL,
  ...dashboardNL,
  ...ordersNL,
  ...tablesNL,
  ...menuNL,
};

export default nl;