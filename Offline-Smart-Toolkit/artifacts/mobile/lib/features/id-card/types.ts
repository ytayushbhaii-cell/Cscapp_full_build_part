// ─── ID Card Generator — Core Types ─────────────────────────────────────────

export type IDCardType = 'student' | 'employee' | 'visitor' | 'custom';

export type TemplateId = 'modern' | 'corporate' | 'school' | 'minimal' | 'premium';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export type ExportFormat = 'png' | 'jpg' | 'pdf';

// ── Student ID ────────────────────────────────────────────────────────────────
export interface StudentIDData {
  // Personal
  photoUri: string | null;
  name: string;
  rollNumber: string;
  className: string;
  division: string;
  dateOfBirth: string;
  bloodGroup: BloodGroup | '';
  contactNumber: string;
  address: string;
  // Institution
  schoolName: string;
  schoolLogoUri: string | null;
  principalName: string;
  principalSignatureUri: string | null;
  // Design
  templateId: TemplateId;
  accentColor: string;
  // Meta
  academicYear: string;
  issueDate: string;
  validUntil: string;
}

// ── Employee ID ───────────────────────────────────────────────────────────────
export interface EmployeeIDData {
  photoUri: string | null;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  contactNumber: string;
  email: string;
  companyName: string;
  companyLogoUri: string | null;
  emergencyContact: string;
  bloodGroup: BloodGroup | '';
  // Design
  templateId: TemplateId;
  accentColor: string;
  // Meta
  joinDate: string;
  validUntil: string;
  address: string;
}

// ── Visitor ID ────────────────────────────────────────────────────────────────
export interface VisitorIDData {
  photoUri: string | null;
  visitorName: string;
  company: string;
  purpose: string;
  hostName: string;
  date: string;
  timeIn: string;
  timeOut: string;
  badgeNumber: string;
  // Design
  templateId: TemplateId;
  accentColor: string;
  // Host org
  orgName: string;
  orgLogoUri: string | null;
}

// ── Custom ID ─────────────────────────────────────────────────────────────────
export interface CustomIDField {
  id: string;
  label: string;
  value: string;
  x: number;
  y: number;
  fontSize: number;
  bold: boolean;
  color: string;
}

export interface CustomIDData {
  photoUri: string | null;
  logoUri: string | null;
  backgroundImageUri: string | null;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  orgName: string;
  fields: CustomIDField[];
  templateId: TemplateId;
  showQR: boolean;
  qrValue: string;
  showBarcode: boolean;
}

// ── Template definition ───────────────────────────────────────────────────────
export interface IDTemplate {
  id: TemplateId;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  accentColor: string;
  bgColor: string;
  headerBgColor: string;
}

// ── Saved card record ─────────────────────────────────────────────────────────
export interface SavedIDCard {
  id: string;
  type: IDCardType;
  name: string;          // e.g. "Student Card - John Doe"
  templateId: TemplateId;
  previewUri: string;    // PNG thumbnail
  dataJson: string;      // JSON of the typed data
  createdAt: number;     // Unix ms
  updatedAt: number;
}

// ── Print options ─────────────────────────────────────────────────────────────
export interface IDPrintOptions {
  format: ExportFormat;
  perSheet: 1 | 2 | 4 | 6;  // cards per A4 sheet
  includeFront: boolean;
  includeBack: boolean;
  paperSize: 'a4' | 'letter';
}

export const DEFAULT_STUDENT: StudentIDData = {
  photoUri: null,
  name: '',
  rollNumber: '',
  className: '',
  division: '',
  dateOfBirth: '',
  bloodGroup: '',
  contactNumber: '',
  address: '',
  schoolName: '',
  schoolLogoUri: null,
  principalName: '',
  principalSignatureUri: null,
  templateId: 'school',
  accentColor: '#1D4ED8',
  academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
  issueDate: new Date().toLocaleDateString('en-IN'),
  validUntil: '',
};

export const DEFAULT_EMPLOYEE: EmployeeIDData = {
  photoUri: null,
  employeeName: '',
  employeeId: '',
  department: '',
  designation: '',
  contactNumber: '',
  email: '',
  companyName: '',
  companyLogoUri: null,
  emergencyContact: '',
  bloodGroup: '',
  templateId: 'corporate',
  accentColor: '#1D4ED8',
  joinDate: '',
  validUntil: '',
  address: '',
};

export const DEFAULT_VISITOR: VisitorIDData = {
  photoUri: null,
  visitorName: '',
  company: '',
  purpose: '',
  hostName: '',
  date: new Date().toLocaleDateString('en-IN'),
  timeIn: '',
  timeOut: '',
  badgeNumber: '',
  templateId: 'minimal',
  accentColor: '#10B981',
  orgName: '',
  orgLogoUri: null,
};

export const DEFAULT_CUSTOM: CustomIDData = {
  photoUri: null,
  logoUri: null,
  backgroundImageUri: null,
  backgroundColor: '#FFFFFF',
  accentColor: '#1D4ED8',
  textColor: '#0F172A',
  orgName: '',
  fields: [
    { id: '1', label: 'Name', value: '', x: 0, y: 0, fontSize: 16, bold: true, color: '#0F172A' },
    { id: '2', label: 'ID', value: '', x: 0, y: 0, fontSize: 13, bold: false, color: '#64748B' },
    { id: '3', label: 'Designation', value: '', x: 0, y: 0, fontSize: 13, bold: false, color: '#64748B' },
  ],
  templateId: 'modern',
  showQR: false,
  qrValue: '',
  showBarcode: false,
};
