import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Leaf, Lock, User } from "lucide-react";
import { useEffect } from "react";

const schema = z.object({
  username: z.string().min(1, "Completează utilizatorul"),
  password: z.string().min(1, "Completează parola"),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { user, login } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user) navigate("/admin");
  }, [user, navigate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: FormValues) => {
    login.mutate(data, {
      onSuccess: () => navigate("/admin"),
      onError: (e) => form.setError("password", { message: e.message }),
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-xl">Hălchiu Digital</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Panou de administrare</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="font-display font-semibold text-base">Autentificare</h2>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Utilizator sau email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="username sau email" {...field} data-testid="input-username" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Parolă</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9" type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={login.isPending} data-testid="button-login">
                {login.isPending ? "Se autentifică..." : "Intră în cont"}
              </Button>
            </form>
          </Form>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 flex items-center justify-between">
          <Link href="/register">
            <button className="text-sm text-primary hover:text-primary/80 transition-colors font-medium" data-testid="link-register">
              Nu ai cont? Înregistrează-te →
            </button>
          </Link>
          <Link href="/reset-parola">
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Ai uitat parola?
            </button>
          </Link>
        </div>

        {import.meta.env.DEV && (
          <div className="mt-3 bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Conturi demo:</p>
            <div className="space-y-0.5">
              {[
                ["admin", "admin123", "Administrator"],
                ["primar", "primar123", "Primar"],
                ["viceprimar", "vice123", "Viceprimar"],
                ["functionar", "func123", "Funcționar Public"],
                ["moderator", "mod123", "Moderator"],
                ["cetatean", "cet123", "Cetățean"],
              ].map(([u, p, r]) => (
                <div key={u} className="flex gap-2 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => { form.setValue("username", u); form.setValue("password", p); }}
                  data-testid={`demo-${u}`}>
                  <span className="font-mono font-medium text-foreground">{u}</span>
                  <span>/ {p}</span>
                  <span className="ml-auto text-primary">{r}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 opacity-70">Click pe un rând pentru a completa automat.</p>
          </div>
        )}
      </div>
    </div>
  );
}
