import { CapturesBrowser } from "@/components/captures-browser"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary" aria-hidden="true" />
            <span className="font-semibold tracking-tight text-balance">{"PS5 Capture Viewer"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              {"Docs"}
            </Button>
            <a href="https://vercel.com/help" target="_blank" rel="noreferrer">
              <Button className="bg-primary text-primary-foreground">{"Support"}</Button>
            </a>
          </div>
        </div>
      </header>

      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <h1 className="text-2xl md:text-3xl font-semibold text-pretty">
            {"View and download your PlayStation 5 game captures"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            {
              "Paste your PSN Bearer access token to fetch your cloud-stored screenshots and clips. Downloads are proxied securely with signed CloudFront cookies."
            }
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 flex-1">
        <CapturesBrowser />
      </div>

      <footer className="mt-auto border-t border-border">
        <div className="container mx-auto px-4 py-6 text-xs text-muted-foreground">
          {"Privacy-friendly: tokens are stored locally and used only to call PSN through your server."}
        </div>
      </footer>
    </main>
  )
}
