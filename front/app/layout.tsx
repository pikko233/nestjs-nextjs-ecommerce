import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Poppins } from "next/font/google";
import { ThemeProvider } from "next-themes";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "STOREFRONT 商城",
  description: "精选优质商品，一站式在线购物",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      suppressHydrationWarning
      lang="zh-CN"
      className={`${poppins.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          attribute="class"
        >
          {children}
        </ThemeProvider>
        <Toaster position="top-center" richColors theme="light" />
      </body>
    </html>
  );
}
