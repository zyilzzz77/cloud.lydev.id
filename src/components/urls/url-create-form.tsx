"use client";

import { useState, type FormEvent } from "react";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateShortUrl } from "@/hooks/use-short-urls";

export function UrlCreateForm() {
  const create = useCreateShortUrl();
  const [targetUrl, setTargetUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const result = await create.mutateAsync({
        targetUrl: targetUrl.trim(),
        slug: slug.trim() || undefined,
        title: title.trim() || undefined,
      });

      toast.success(`Short link created: ${result.shortUrl.shortUrl}`);
      setTargetUrl("");
      setSlug("");
      setTitle("");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not create the link.";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a short link</CardTitle>
        <CardDescription>
          Leave the alias empty to generate one, or choose a custom slug.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="targetUrl">Destination URL</Label>
            <Input
              id="targetUrl"
              value={targetUrl}
              onChange={(event) => setTargetUrl(event.target.value)}
              placeholder="https://example.com/page"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slug">Custom alias (optional)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="my-link"
                maxLength={32}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Campaign link"
                maxLength={120}
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Link2 className="h-4 w-4" aria-hidden="true" />
            )}
            {create.isPending ? "Creating" : "Create link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
