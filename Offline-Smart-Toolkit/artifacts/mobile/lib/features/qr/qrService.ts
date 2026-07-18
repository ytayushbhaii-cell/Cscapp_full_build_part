// QR data payload builders for the generator screen.
// All logic is pure JS — no network calls.

export type QRType =
  | 'text'
  | 'url'
  | 'phone'
  | 'email'
  | 'wifi'
  | 'contact'
  | 'location';

export interface WiFiPayload {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface ContactPayload {
  name: string;
  phone: string;
  email: string;
  org: string;
  url: string;
}

export interface LocationPayload {
  lat: string;
  lng: string;
  label: string;
}

export function buildQRValue(type: QRType, data: Record<string, string>): string {
  switch (type) {
    case 'text':
      return data.text ?? '';

    case 'url': {
      const url = data.url ?? '';
      return url.startsWith('http') ? url : `https://${url}`;
    }

    case 'phone':
      return `tel:${data.phone ?? ''}`;

    case 'email': {
      const to = data.email ?? '';
      const subject = data.subject ? `?subject=${encodeURIComponent(data.subject)}` : '';
      const body = data.body ? `${subject ? '&' : '?'}body=${encodeURIComponent(data.body)}` : '';
      return `mailto:${to}${subject}${body}`;
    }

    case 'wifi': {
      const sec = data.security || 'WPA';
      const hidden = data.hidden === 'true' ? 'true' : 'false';
      return `WIFI:T:${sec};S:${data.ssid ?? ''};P:${data.password ?? ''};H:${hidden};;`;
    }

    case 'contact': {
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${data.name ?? ''}`,
        data.phone ? `TEL:${data.phone}` : '',
        data.email ? `EMAIL:${data.email}` : '',
        data.org ? `ORG:${data.org}` : '',
        data.url ? `URL:${data.url}` : '',
        'END:VCARD',
      ].filter(Boolean);
      return lines.join('\n');
    }

    case 'location':
      return `geo:${data.lat ?? '0'},${data.lng ?? '0'}${data.label ? `?q=${encodeURIComponent(data.label)}` : ''}`;

    default:
      return data.text ?? '';
  }
}

export function describeQRValue(type: QRType, data: Record<string, string>): string {
  switch (type) {
    case 'text': return data.text?.slice(0, 60) ?? '';
    case 'url': return data.url ?? '';
    case 'phone': return `Phone: ${data.phone ?? ''}`;
    case 'email': return `Email: ${data.email ?? ''}`;
    case 'wifi': return `WiFi: ${data.ssid ?? ''}`;
    case 'contact': return `Contact: ${data.name ?? ''}`;
    case 'location': return `Location: ${data.lat ?? ''},${data.lng ?? ''}`;
    default: return '';
  }
}

/** Parse scanned QR value into a human-readable label. */
export function parseScannedQR(raw: string): { type: string; display: string } {
  if (/^https?:\/\//i.test(raw)) return { type: 'URL', display: raw };
  if (/^tel:/i.test(raw)) return { type: 'Phone', display: raw.replace(/^tel:/i, '') };
  if (/^mailto:/i.test(raw)) return { type: 'Email', display: raw.replace(/^mailto:/i, '').split('?')[0] };
  if (/^WIFI:/i.test(raw)) {
    const ssid = raw.match(/S:([^;]*)/)?.[1] ?? '';
    return { type: 'WiFi', display: `Network: ${ssid}` };
  }
  if (/^BEGIN:VCARD/i.test(raw)) {
    const name = raw.match(/FN:([^\n]*)/)?.[1] ?? 'Contact';
    return { type: 'Contact', display: name };
  }
  if (/^geo:/i.test(raw)) return { type: 'Location', display: raw.replace(/^geo:/i, '') };
  return { type: 'Text', display: raw.slice(0, 80) };
}
