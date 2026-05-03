import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Leaf, User, Lock, Phone, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name:     z.string().min(3, "Numele trebuie să aibă cel puțin 3 caractere"),
  username: z.string().min(3, "Userul trebuie să aibă cel puțin 3 caractere").regex(/^[a-z0-9_]+$/, "Doar litere mici, cifre și _"),
  phone:    z.string().optional(),
  password: z.string().min(6, "Parola trebuie să aibă cel puțin 6 caractere"),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: "Parolele nu coincid", path: ["confirm"] });

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [done, setDone] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", username: "", phone: "", password: "", confirm: "" },
  });

  const onSubmit = (data: FormValues) => {
    register.mutate(
      { name: data.name, username: data.username, phone: data.phone || undefined, password: data.password },
      {
        onSuccess: () => setDone(true),
        onError: (e) => form.setError("username", { message: e.message }),
      }
    );
  };

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => navigate("/login"), 2500);
      return () => clearTimeout(t);
    }
  }, [done]);

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="font-display font-bold text-xl mb-2">Cont creat!</h1>
          <p className="text-sm text-muted-foreground mb-2">Contul tău a fost creat cu succes.</p>
          <p className="text-xs text-muted-foreground mb-6">Vei fi redirecționat automat la autentificare...</p>
          <Button className="w-full" onClick={() => navigate("/login")}>Mergi la autentificare →</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-xl">Hălchiu Digital</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Creează cont de cetățean</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nume complet</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Ion Ionescu" {...field} data-testid="input-name" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nume de utilizator</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">@</span>
                      <Input className="pl-8" placeholder="ion_ionescu" {...field} data-testid="input-username" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon <span className="text-muted-foreground font-normal">(opțional)</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="07xx xxx xxx" type="tel" {...field} data-testid="input-phone" />
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

              <FormField control={form.control} name="confirm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmare parolă</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9" type="password" placeholder="••••••••" {...field} data-testid="input-confirm" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={register.isPending} data-testid="button-register">
                {register.isPending ? "Se creează contul..." : "Creează cont"}
              </Button>
            </form>
          </Form>
        </div>

        <div className="mt-4 text-center">
          <Link href="/login">
            <button className="flex items-center gap-1.5 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Ai deja cont? Autentifică-te
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
