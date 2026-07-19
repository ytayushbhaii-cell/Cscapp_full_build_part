// ─── ID Card Generator Tools Registry ────────────────────────────────────────

export const ID_CARD_COLOR = '#6366F1';

export interface IDCardToolMeta {
  id: string;
  name: string;
  nameHi: string;
  iconName: string;
  color: string;
  description: string;
  descHi: string;
  route: string;
  category: 'id-card';
}

export const ID_CARD_TOOLS: IDCardToolMeta[] = [
  {
    id: 'id-student',
    name: 'Student ID Card',
    nameHi: 'छात्र ID कार्ड',
    iconName: 'school-outline',
    color: '#059669',
    description: 'Generate student ID with photo, roll no, class & school details',
    descHi: 'फोटो, रोल नंबर, कक्षा और स्कूल विवरण के साथ छात्र ID बनाएं',
    route: '/id-card-tools/student',
    category: 'id-card',
  },
  {
    id: 'id-employee',
    name: 'Employee ID Card',
    nameHi: 'कर्मचारी ID कार्ड',
    iconName: 'badge-account-horizontal-outline',
    color: '#1D4ED8',
    description: 'Create employee ID with department, designation & company logo',
    descHi: 'विभाग, पद और कंपनी लोगो के साथ कर्मचारी ID बनाएं',
    route: '/id-card-tools/employee',
    category: 'id-card',
  },
  {
    id: 'id-visitor',
    name: 'Visitor ID Card',
    nameHi: 'विज़िटर ID कार्ड',
    iconName: 'card-account-details-outline',
    color: '#10B981',
    description: 'Issue visitor passes with purpose, host name & time slots',
    descHi: 'उद्देश्य, होस्ट नाम और समय स्लॉट के साथ विज़िटर पास जारी करें',
    route: '/id-card-tools/visitor',
    category: 'id-card',
  },
  {
    id: 'id-custom',
    name: 'Custom ID Card',
    nameHi: 'कस्टम ID कार्ड',
    iconName: 'pencil-ruler',
    color: '#8B5CF6',
    description: 'Design your own ID card with custom fields, logo & colors',
    descHi: 'कस्टम फ़ील्ड, लोगो और रंगों के साथ अपना ID कार्ड डिज़ाइन करें',
    route: '/id-card-tools/custom',
    category: 'id-card',
  },
];

export const ALL_ID_CARD_TOOLS = ID_CARD_TOOLS;
