import { redirect } from "next/navigation";

// 个人中心暂时只有订单页
const Page = () => {
  redirect("/user/order");
};

export default Page;
