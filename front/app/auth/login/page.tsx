import { LoginForm } from "@/components/modules/auth/login-form";
import { Suspense } from "react";

const Page = () => {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      {/* LoginForm 依赖 useSearchParams 读取 redirect，需要包在 Suspense 中 */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
};

export default Page;
