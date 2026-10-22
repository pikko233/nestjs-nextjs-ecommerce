import { CartClient } from "@/components/modules/cart/cart-client";
import { Footer } from "@/components/modules/landing/footer";
import { Header } from "@/components/modules/landing/header";

const Page = () => {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <CartClient />
      <Footer />
    </div>
  );
};

export default Page;
