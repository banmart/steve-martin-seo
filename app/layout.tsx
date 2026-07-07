import type { Metadata } from "next";
import { Archivo, Space_Grotesk } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Steve Martin — Founder, Gobiya | I Engineer Search Ecosystems",
  description:
    "Steve Martin — founder & lead developer of Gobiya, the Los Angeles SEO & web development agency. 30 years in web design, 25+ years in search engineering.",
  verification: {
    google: "x8ImZjUynlR0KeyoxzNswxqNhnouRGFCEjJs1xB6JI0",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Steve Martin",
  jobTitle: "Founder & Lead Developer",
  worksFor: {
    "@type": "Organization",
    name: "Gobiya",
    url: "https://gobiya.com",
    foundingDate: "2010",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Los Angeles",
    addressRegion: "CA",
  },
  knowsAbout: [
    "SEO",
    "Entity SEO",
    "Schema Markup",
    "Generative Engine Optimization",
    "React",
    "Web Development",
  ],
  url: "https://gobiya.com",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${spaceGrotesk.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
