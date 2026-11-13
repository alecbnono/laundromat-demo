"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button, FieldError, FieldLabel, cardClass, inputClass } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
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
    <form
      onSubmit={handleSubmit((values) => login.mutate(values))}
      className={cn(cardClass, "grid gap-4")}
      noValidate
    >
      <label>
        <FieldLabel>Email</FieldLabel>
        <input
          {...register("email")}
          type="email"
          inputMode="email"
          autoComplete="username"
          autoFocus
          aria-invalid={!!errors.email}
          className={inputClass}
        />
        <FieldError>{errors.email?.message}</FieldError>
      </label>
      <label>
        <FieldLabel>Password</FieldLabel>
        <input
          {...register("password")}
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          className={inputClass}
        />
        <FieldError>{errors.password?.message}</FieldError>
      </label>
      <FieldError>{login.error?.message}</FieldError>
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Checking…" : "Open order list"}
      </Button>
    </form>
  );
}
