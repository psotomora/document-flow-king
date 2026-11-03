<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
Date filtering uses the shared FiltroFechas control and filtros-fecha helpers so every list and comparative report applies the same inclusive date boundaries.
All screen filters use useFiltroGuardado and the existing per-user preferences API; demo preferences are stored under user-scoped keys so navigation, logout, and user switching preserve isolated selections.
Monthly contract document matching lives in contratosPorFacturarDelMes; totals, invoice suggestions and archival use its result to prevent divergent double-counting rules.
Password recovery must persist the temporary password only after SMTP accepts the email, preserving existing credentials on send failures; the isolated API regression harness links the production endpoint to test doubles without touching real accounts.
Browser and iOS icons are served from public assets with BASE_URL-prefixed head links, including a multi-resolution ICO fallback, so subfolder deployments never select another application's root-domain icon.
Table detail dialogs opt into the shared DialogContent resize control and use DescripcionTabla for full-text tooltips, keeping sizing and description behavior consistent without changing form dialogs.
The account-statement form dialog uses content-driven width capped by the viewport and wrapping client labels, so long names cannot push fields outside the window.
Receivable projections use calcularSaldoProyectado with the same calculated invoice balances as invoice listings; keep aggregation in the shared calculation module so dashboard, consolidated detail and exports cannot diverge.
- Column visibility/order is handled centrally in src/components/ui/table.tsx (header labels identify columns, rows reorder children); new grids get it automatically, keep one header cell per body cell.
- Login suite branding stays in PantallaLogin with a CDN asset pointer resolved against the public Lovable origin (IIS does not serve /__l5e/assets-v1) and a stacked layout on narrow screens, preserving authentication behavior and keeping the uploaded mark unchanged.
- API URL resolution is centralized in configuracion-api: deployment configuration wins, all modes default to same-origin /api and production ignores browser overrides; the data-source dialog (ConexionApi) renders only in development builds, on login and header, so production users never see connection editors.
- Node deployment packages use scripts/package-node.mjs on verified .output plus the IIS template, with server/public at archive root; preserve bundled dependencies and exclude private environment files and Git metadata to keep existing NSSM deployments compatible.
- API deployment packages use scripts/package-api.mjs to publish Release into fresh temporary output and archive runtime files at the ZIP root; exclude configuration, certificates and Git metadata so IIS server secrets remain untouched.
- Payment entry uses the shared DialogoPago from both invoices and received payments; invoice eligibility and reference amounts live in pagos-facturas so paid invoices remain bank-only receipts without divergent rules.
- The local sync agent lives in agente/ (separate .NET worker, outbound HTTPS only, x-agent-token hashed in flujo.Inquilino); keep it outside api/ so the API publish never globs its sources.
- Phase 3 replicates orders, invoices and contracts read-only: one per-company mode, one token-scoped leased job (documents posted first, orders release the lease) and atomic JSON snapshots; invoices/contracts keep direct-mode IDs so payments and monthly matching stay unchanged; API and agent link the same Softland query source to preserve financial mapping. Existing web users remain principal-only until Phase 5 adds tenant identity; never expose another tenant through web endpoints.
