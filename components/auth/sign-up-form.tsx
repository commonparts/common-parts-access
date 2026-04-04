"use client";

import { cn } from "@/lib/utils";
import { signUp } from "@/lib/supabase/queries/auth.client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const getRedirectPath = () => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("redirect");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!username.trim()) {
      setError("Username is required");
      setIsLoading(false);
      return;
    }

    // Basic username validation
    if (username.length < 3) {
      setError("Username must be at least 3 characters long");
      setIsLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError("Username can only contain letters, numbers, underscores, and hyphens");
      setIsLoading(false);
      return;
    }

    try {
      const redirectPath = getRedirectPath();
      const confirmUrl = redirectPath
        ? `${window.location.origin}/confirm?next=${encodeURIComponent(redirectPath)}`
        : `${window.location.origin}/confirm`;
      const { error } = await signUp(email, password, username, confirmUrl);
      if (error) throw error;
      router.push("/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-lg", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-sm">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-lg">
              <div className="grid gap-sm">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-sm">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  pattern="[a-zA-Z0-9_-]+"
                  title="Username can only contain letters, numbers, underscores, and hyphens"
                />
              </div>
              <div className="grid gap-sm">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-sm">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-caption text-action-primary">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-md text-center text-caption">
              Already have an account?{" "}
              <Link
                href={
                  getRedirectPath()
                    ? `/login?redirect=${encodeURIComponent(getRedirectPath()!)}`
                    : "/login"
                }
                className="underline"
              >
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
