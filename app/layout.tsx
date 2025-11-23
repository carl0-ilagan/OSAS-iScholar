import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { BrandingProvider } from '@/contexts/BrandingContext'
import ServiceWorkerRegistration from '@/components/pwa/service-worker-register'
import DynamicManifest from '@/components/pwa/dynamic-manifest'
import './globals.css'

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'iScholar Portal - OSAS MinSU',
  description: 'Scholarship Management System',
  icons: {
    icon: '/download.ico',
    shortcut: '/download.ico',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/download.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/download.ico" type="image/x-icon" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#005c2b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="iScholar" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className={`${poppins.variable} font-sans antialiased`}>
        <AuthProvider>
          <BrandingProvider>
          {children}
          </BrandingProvider>
        </AuthProvider>
        <Toaster position="top-right" richColors />
        <Analytics />
        <ServiceWorkerRegistration />
        <DynamicManifest />
      </body>
    </html>
  )
}
