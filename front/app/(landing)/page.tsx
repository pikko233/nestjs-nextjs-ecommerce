import { Footer } from "@/components/modules/landing/footer";
import { Header } from "@/components/modules/landing/header";
import { ProductList } from "@/components/modules/landing/product-list";

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] w-screen bg-muted/30">
        <ProductList />
      </main>
      <Footer />
    </>
  );
}
