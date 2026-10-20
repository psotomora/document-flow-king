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
