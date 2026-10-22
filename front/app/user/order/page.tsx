import { Footer } from "@/components/modules/landing/footer";
import { Header } from "@/components/modules/landing/header";
import { OrderList } from "@/components/modules/user/order-list";

const Page = () => {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <OrderList />
      <Footer />
    </div>
  );
};

export default Page;
