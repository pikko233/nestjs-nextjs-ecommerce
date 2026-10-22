const AuthLayout = ({ children }: LayoutProps<"/auth">) => {
  return (
    // auth-theme 在 globals.css 中覆盖主题变量，只作用于登录/注册页
    <div className="auth-theme flex flex-1 flex-col">{children}</div>
  );
};

export default AuthLayout;
