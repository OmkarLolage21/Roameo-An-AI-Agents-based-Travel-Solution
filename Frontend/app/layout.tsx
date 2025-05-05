import './globals.css'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Roameo',
  description: 'Your travel companion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background">
            <Header />
            {children}
            <Toaster />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}