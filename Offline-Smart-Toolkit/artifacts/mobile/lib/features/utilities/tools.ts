export const UTILITY_COLOR = '#0EA5E9';

export interface UtilityToolMeta {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  route: string;
  badge?: string;
}

export const UTILITY_TOOLS: UtilityToolMeta[] = [
  {
    id: 'utility-calendar',
    name: 'Calendar',
    description: 'Monthly & year view calendar with current date highlight and month navigation',
    iconName: 'calendar-month-outline',
    color: '#0EA5E9',
    route: '/utility-tools/calendar',
    badge: 'Offline',
  },
  {
    id: 'utility-age-calculator',
    name: 'Age Calculator',
    description: 'Calculate exact age in years, months, days and total days from date of birth',
    iconName: 'cake-variant-outline',
    color: '#8B5CF6',
    route: '/utility-tools/age-calculator',
  },
  {
    id: 'utility-percentage',
    name: 'Percentage Calculator',
    description: 'Percentage of number, marks %, GST/increase/decrease calculations',
    iconName: 'percent-outline',
    color: '#10B981',
    route: '/utility-tools/percentage-calculator',
  },
];
