"use client";

import { SubmitEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";

// 与后端 RegisterDto 的密码规则保持一致
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const RegisterForm = () => {
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  // 提交过一次后才展示前端校验错误，避免用户刚开始输入就报错
  const [submitted, setSubmitted] = useState(false);

  const router = useRouter();
  const { register, isLoading, error } = useAuth();

  const passwordError =
    submitted && !PASSWORD_PATTERN.test(form.password)
      ? "密码至少 8 位，且必须包含大小写字母和数字"
      : null;
  const confirmError =
    submitted && form.password !== form.confirmPassword
      ? "两次输入的密码不一致"
      : null;

  const update =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);

    if (
      !PASSWORD_PATTERN.test(form.password) ||
      form.password !== form.confirmPassword
    ) {
      return;
    }

    const ok = await register({
      email: form.email,
      password: form.password,
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
    });
    if (ok) {
      toast.success("注册成功");
      router.push("/");
    }
  };

  return (
    <Card className="w-full max-w-sm rounded-2xl py-8 shadow-(--auth-card-shadow) ring-foreground/5">
      <CardHeader className="gap-3 px-8 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight">
          注册
        </CardTitle>
        <CardDescription className="text-base">创建一个新账号</CardDescription>
      </CardHeader>
      <CardContent className="px-8">
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="lastName">姓</FieldLabel>
                <Input
                  id="lastName"
                  placeholder="张"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={update("lastName")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="firstName">名</FieldLabel>
                <Input
                  id="firstName"
                  placeholder="三"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={update("firstName")}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="email">邮箱</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                autoComplete="email"
                required
                value={form.email}
                onChange={update("email")}
              />
            </Field>
            <Field data-invalid={!!passwordError}>
              <FieldLabel htmlFor="password">密码</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                aria-invalid={!!passwordError}
                value={form.password}
                onChange={update("password")}
              />
              {passwordError ? (
                <FieldError>{passwordError}</FieldError>
              ) : (
                <FieldDescription>
                  至少 8 位，包含大小写字母和数字
                </FieldDescription>
              )}
            </Field>
            <Field data-invalid={!!confirmError}>
              <FieldLabel htmlFor="confirmPassword">确认密码</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                aria-invalid={!!confirmError}
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
              />
              {confirmError && <FieldError>{confirmError}</FieldError>}
            </Field>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Spinner />}
              注册
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              已有账号？
              <Link href="/auth/login" className="underline underline-offset-4">
                登录
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};
