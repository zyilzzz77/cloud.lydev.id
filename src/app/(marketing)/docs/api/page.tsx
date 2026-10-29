import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API documentation",
};

function Endpoint({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  return (
    <li className="flex flex-col gap-1 border-b border-border/60 py-3 last:border-0 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="w-16 shrink-0 font-mono text-xs font-semibold uppercase text-primary">
        {method}
      </span>
      <code className="shrink-0 font-mono text-xs text-foreground">{path}</code>
      <span className="text-sm text-muted-foreground">{description}</span>
    </li>
  );
}

export default function ApiDocsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">API documentation</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Use the Lydev Cloud API to manage CDN assets, short links, and shared files from scripts
        or CI.
      </p>

      <div className="mt-10 space-y-10 text-sm leading-7 text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Base URL</h2>
          <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground">
            https://cloud.lydev.id/api
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Authentication</h2>
          <p>
            Dashboard requests use the session cookie. Programmatic requests use an API key from
            Settings, API Keys.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground">
            {`Authorization: Bearer lydev_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Response format</h2>
          <p>Successful responses wrap the payload in a data field.</p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground">
            {`{
  "data": { ... }
}`}
          </pre>
          <p>Errors include a code, message, and optional details.</p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground">
            {`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the form and try again.",
    "details": []
  }
}`}
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Pagination</h2>
          <p>
            List endpoints accept <code className="text-foreground">page</code> and{" "}
            <code className="text-foreground">limit</code> (maximum 100). Responses include{" "}
            <code className="text-foreground">items</code>,{" "}
            <code className="text-foreground">page</code>,{" "}
            <code className="text-foreground">limit</code>, and{" "}
            <code className="text-foreground">total</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">CDN assets</h2>
          <ul>
            <Endpoint method="GET" path="/cdn" description="List assets with pagination and filters." />
            <Endpoint method="POST" path="/cdn/upload" description="Create a presigned upload target." />
            <Endpoint method="POST" path="/cdn/upload/complete" description="Register the uploaded object." />
            <Endpoint method="GET" path="/cdn/{id}" description="Read one asset." />
            <Endpoint method="DELETE" path="/cdn/{id}" description="Delete the object and record." />
          </ul>
          <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground">
            {`curl -X POST https://cloud.lydev.id/api/cdn/upload \\
  -H "Authorization: Bearer lydev_..." \\
  -H "Content-Type: application/json" \\
  -d '{"filename":"logo.png","mimeType":"image/png","sizeBytes":10240,"folder":"images"}'`}
          </pre>
          <p>
            Upload the file to the returned URL with the returned method and headers, then call the
            complete endpoint with the same metadata and the returned fileKey.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Short URLs</h2>
          <ul>
            <Endpoint method="GET" path="/urls" description="List short links." />
            <Endpoint method="POST" path="/urls" description="Create a link with an optional custom slug." />
            <Endpoint method="GET" path="/urls/check" description="Check whether a slug is available." />
            <Endpoint method="PATCH" path="/urls/{id}" description="Update the target, title, or active state." />
            <Endpoint method="DELETE" path="/urls/{id}" description="Delete a link." />
            <Endpoint method="GET" path="/urls/{id}/stats" description="Read click analytics." />
          </ul>
          <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground">
            {`curl -X POST https://cloud.lydev.id/api/urls \\
  -H "Authorization: Bearer lydev_..." \\
  -H "Content-Type: application/json" \\
  -d '{"targetUrl":"https://example.com","slug":"launch","title":"Launch page"}'`}
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">File sharing</h2>
          <ul>
            <Endpoint method="GET" path="/dl" description="List shared files." />
            <Endpoint method="POST" path="/dl/upload" description="Create a presigned upload target." />
            <Endpoint method="POST" path="/dl/upload/complete" description="Register the uploaded file." />
            <Endpoint method="PATCH" path="/dl/{fileId}" description="Change or remove the expiry." />
            <Endpoint method="DELETE" path="/dl/{fileId}" description="Delete the file and record." />
            <Endpoint method="GET" path="/dl/{fileId}/download" description="Redirect to a short-lived download URL." />
          </ul>
          <p>
            Files are private. Public download pages use a short code:{" "}
            <code className="text-foreground">https://dl.lydev.id/{"{fileId}"}</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Stats</h2>
          <ul>
            <Endpoint method="GET" path="/stats/overview" description="Storage, asset, link, and download totals." />
            <Endpoint method="GET" path="/stats/activity" description="Paginated activity feed." />
            <Endpoint method="GET" path="/stats/storage" description="Storage breakdown by category." />
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Rate limits</h2>
          <p>
            Exceeding a limit returns <code className="text-foreground">429 RATE_LIMITED</code> with
            a <code className="text-foreground">Retry-After</code> header. Login is limited to 5
            attempts per 15 minutes, uploads to 60 per hour, and downloads to 30 per minute.
          </p>
        </section>
      </div>
    </article>
  );
}
