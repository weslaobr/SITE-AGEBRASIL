// app/layout.tsx ATUALIZADO
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Age of Empires IV Brasil',
  description: 'A maior plataforma de rankings e estatísticas de Age of Empires IV do Brasil',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <head>
        <link rel="shortcut icon" href="https://i.imgur.com/gLHqsWk.png" type="image/x-icon"></link>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://aoe4world.com" />
        
        <link rel="dns-prefetch" href="https://aoe4world.com" />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col bg-gray-50`}>
        <main className="flex-1 w-full pt-16"> {/* Espaço para header fixo */}
          {children}
        </main>
      </body>
    </html>
  );
}