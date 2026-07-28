import type { Metadata } from 'next';
import './globals.css';
import ChatWidget from '@/components/ChatWidget';

export const metadata: Metadata = {
  title: 'DataCrumbs Chatbot',
  description: 'AI assistant for DataCrumbs AI & Data Science Bootcamp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
