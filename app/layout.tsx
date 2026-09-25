import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { DESCRIPTION, SITE_URL, TITLE } from "@/lib/site";
import "./globals.css";

const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  applicationName: "MyBuildy",
  authors: [{ name: "Sukin Shetty" }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "MyBuildy",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={satoshi.variable} suppressHydrationWarning>
      <head>
        {/* Lets CSS hide scroll-reveal content only when JavaScript will reveal it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        {/* A download button clicked before the page's script is ready must not be lost (the
            buttons are plain <button>s, never direct file links, so nothing downloads without the
            form). Remember the click; DownloadButtons replays it once it is ready. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.addEventListener('click',function(e){if(window.__mbDownloadsReady)return;var t=e.target&&e.target.closest&&e.target.closest('[data-download]');if(!t)return;e.preventDefault();window.__mbEarlyDownload={platform:t.getAttribute('data-download'),owner:t.getAttribute('data-download-owner')};},true);",
          }}
        />
        {children}
      </body>
    </html>
  );
}
