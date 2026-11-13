"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { loginSchema, type LoginForm as LoginValues } from "@/lib/validation";

export default function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const login = useMutation({
    mutationFn: async (values: LoginValues) => {
      const { error } = await authClient.signIn.email(values);
      if (!error) return;
      if (error.status === 429) throw new Error("Too many tries. Please wait 10 minutes.");
      if (error.status === 401) throw new Error("Wrong email or password. Please try again.");
      throw new Error("Could not log in. Please try again.");
    },
    onSuccess: () => {
      router.push("/owner");
      router.refresh();
    },
  });
  const busy = login.isPending || login.isSuccess;

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit((values) => login.mutate(values))} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                {...register("email")}
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoFocus
                aria-invalid={!!errors.email}
              />
              <FieldError>{errors.email?.message}</FieldError>
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                {...register("password")}
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
              />
              <FieldError>{errors.password?.message}</FieldError>
            </Field>
            <FieldError>{login.error?.message}</FieldError>
            <Button type="submit" disabled={busy}>
              {busy ? "Checking…" : "Open order list"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
