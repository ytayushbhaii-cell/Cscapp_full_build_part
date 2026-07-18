// ─── ID Card Generator Tools Registry ────────────────────────────────────────

export const ID_CARD_COLOR = '#6366F1';

export interface IDCardToolMeta {
  id: string;
  name: string;
  iconName: string;
  color: string;
  description: string;
  route: string;
  category: 'id-card';
}

export const ID_CARD_TOOLS: IDCardToolMeta[] = [
  {
    id: 'id-student',
    name: 'Student ID Card',
    iconName: 'school-outline',
    color: '#059669',
    description: 'Generate student ID with photo, roll no, class & school details',
    route: '/id-card-tools/student',
    category: 'id-card',
  },
  {
    id: 'id-employee',
    name: 'Employee ID Card',
    iconName: 'badge-account-horizontal-outline',
    color: '#1D4ED8',
    description: 'Create employee ID with department, designation & company logo',
    route: '/id-card-tools/employee',
    category: 'id-card',
  },
  {
    id: 'id-visitor',
    name: 'Visitor ID Card',
    iconName: 'card-account-details-outline',
    color: '#10B981',
    description: 'Issue visitor passes with purpose, host name & time slots',
    route: '/id-card-tools/visitor',
    category: 'id-card',
  },
  {
    id: 'id-custom',
    name: 'Custom ID Card',
    iconName: 'pencil-ruler',
    color: '#8B5CF6',
    description: 'Design your own ID card with custom fields, logo & colors',
    route: '/id-card-tools/custom',
    category: 'id-card',
  },
];

export const ALL_ID_CARD_TOOLS = ID_CARD_TOOLS;
