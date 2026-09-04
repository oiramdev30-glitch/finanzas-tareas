import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import PwaInstaller from '@/components/PwaInstaller';

export const metadata: Metadata = {
  title: 'Finanzas y Tareas',
  description: 'Controla tu dinero y nunca dejes pendientes de la escuela',
  applicationName: 'Finanzas y Tareas',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Finanzas y Tareas',
  },
  icons: {
    icon: '/icons/icon-512.png',
    apple: '/icons/icon-180.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <PwaInstaller />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
