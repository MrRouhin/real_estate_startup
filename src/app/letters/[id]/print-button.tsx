'use client';
import { Printer } from 'lucide-react';

export function PrintButton() {
  return <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Printer className="size-4" />Print or save PDF</button>;
}
