import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'phone', standalone: true, pure: true })
export class PhonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    let v = String(value).trim();
    const plus = v.startsWith('+');
    v = v.replace(/[^\d]/g, '');

    if (plus && v.startsWith('33')) {
      const d = v.slice(2, 11);
      const parts: string[] = [];
      if (d.length > 0) parts.push(d.slice(0, 1));
      if (d.length > 1) parts.push(d.slice(1, 3));
      if (d.length > 3) parts.push(d.slice(3, 5));
      if (d.length > 5) parts.push(d.slice(5, 7));
      if (d.length > 7) parts.push(d.slice(7, 9));
      return `+33 ${parts.filter(Boolean).join(' ')}`.trim();
    }

    const digits = v.slice(0, 10);
    const parts: string[] = [];
    if (digits.length > 0) parts.push(digits.slice(0, 2));
    if (digits.length > 2) parts.push(digits.slice(2, 4));
    if (digits.length > 4) parts.push(digits.slice(4, 6));
    if (digits.length > 6) parts.push(digits.slice(6, 8));
    if (digits.length > 8) parts.push(digits.slice(8, 10));
    return parts.join(' ').trim();
  }
}
