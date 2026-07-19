export const UTILITY_COLOR = '#0EA5E9';

export interface UtilityToolMeta {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  descHi: string;
  iconName: string;
  color: string;
  route: string;
  badge?: string;
}

export const UTILITY_TOOLS: UtilityToolMeta[] = [
  {
    id: 'utility-calendar',
    name: 'Calendar',
    nameHi: 'कैलेंडर',
    description: 'Monthly & year view calendar with current date highlight and month navigation',
    descHi: 'वर्तमान तिथि हाइलाइट और माह नेविगेशन के साथ मासिक और वार्षिक कैलेंडर',
    iconName: 'calendar-month-outline',
    color: '#0EA5E9',
    route: '/utility-tools/calendar',
    badge: 'Offline',
  },
  {
    id: 'utility-age-calculator',
    name: 'Age Calculator',
    nameHi: 'आयु कैलकुलेटर',
    description: 'Calculate exact age in years, months, days and total days from date of birth',
    descHi: 'जन्मतिथि से सटीक आयु वर्ष, महीने, दिन और कुल दिनों में गणना करें',
    iconName: 'cake-variant-outline',
    color: '#8B5CF6',
    route: '/utility-tools/age-calculator',
  },
  {
    id: 'utility-percentage',
    name: 'Percentage Calculator',
    nameHi: 'प्रतिशत कैलकुलेटर',
    description: 'Percentage of number, marks %, GST/increase/decrease calculations',
    descHi: 'संख्या का प्रतिशत, अंक %, GST/वृद्धि/कमी गणना',
    iconName: 'percent-outline',
    color: '#10B981',
    route: '/utility-tools/percentage-calculator',
  },
];
