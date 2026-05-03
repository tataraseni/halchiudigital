import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateContest } from "@/hooks/use-contests";
import { Gift, Loader2 } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(3, "Titlul trebuie să aibă cel puțin 3 caractere").max(100),
  description: z.string().min(10, "Descrierea trebuie să aibă cel puțin 10 caractere").max(1000),
  prize: z.string().min(2, "Premiul este obligatoriu"),
  endDate: z.coerce.date().refine(date => date > new Date(), { message: "Data trebuie să fie în viitor" }),
  url: z.string().url("Trebuie să fie un URL valid"),
  imageUrl: z.string().url("Trebuie să fie un URL valid pentru imagine").optional().or(z.literal("")),
  category: z.string().min(2, "Categoria este obligatorie"),
});

type FormValues = z.infer<typeof formSchema>;

export function SubmitContestModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createMutation = useCreateContest();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      prize: "",
      url: "",
      imageUrl: "",
      category: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    createMutation.mutate({
      ...data,
      imageUrl: data.imageUrl || null,
    }, {
      onSuccess: () => {
        toast({
          title: "Concurs adăugat!",
          description: "Concursul tău a fost adăugat cu succes în listă.",
        });
        setOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Eroare la trimitere",
          description: error.message,
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Adaugă un concurs
          </DialogTitle>
          <DialogDescription>
            Adaugă un concurs sau un giveaway pentru comunitate. Te rugăm să completezi detaliile corecte!
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Titlul concursului</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Câștigă un iPhone 15 Pro" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Premiu</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: iPhone 15 Pro" {...field} data-testid="input-prize" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categorie</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Tehnologie, Călătorii, Gaming" {...field} data-testid="input-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Link participare (URL)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} data-testid="input-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Data expirare</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ? (field.value as Date).toISOString().split('T')[0] : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        data-testid="input-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>URL imagine (opțional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://.../imagine.jpg" {...field} data-testid="input-image-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Descriere</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrie concursul și cum se poate participa..."
                        className="min-h-[100px] resize-none"
                        {...field}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="submit" size="lg" disabled={createMutation.isPending} className="w-full sm:w-auto shadow-md" data-testid="button-submit">
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se trimite...
                  </>
                ) : (
                  "Adaugă concursul"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
