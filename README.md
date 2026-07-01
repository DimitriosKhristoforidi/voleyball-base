# 🏐 Volleyball Admin

Personal admin panel for managing a casual volleyball group:
players, venues, games, attendance, payments, and a one-click
copy-ready Telegram message in Russian.

## Stack

- React 19 + TypeScript + Vite
- [shadcn/ui](https://ui.shadcn.com)-style component library built on Radix UI primitives (`@radix-ui/*`), `class-variance-authority`, and `lucide-react`
- Tailwind CSS v4 via `@tailwindcss/vite` (CSS-first config, no `tailwind.config.js`)
- React Router v6
- Supabase (Postgres, Auth, RLS) via `@supabase/supabase-js`

## Folder structure

```
src/
  app/         App + routing
  components/
    layout/    AppLayout, Sidebar, Header
    common/    LoadingState, EmptyState, ConfirmDialog (AlertDialog), StatusChips, PageHeader
    ui/        Thin compound-API wrappers: AppModal, AppSelect, AppCheckbox, AppSwitch, AppField
    players/   PlayerFormModal
    venues/    VenueFormModal
    games/     GameFormModal, AddParticipantsModal, TelegramMessageModal
  lib/         supabase client, date helpers, telegramMessage, auth context
  pages/       Dashboard, Players, Venues, Games, GameDetail, Login
  services/    playersService, venuesService, gamesService
  styles/      Tailwind v4 entry (@import "tailwindcss"; @import "@heroui/styles";)
  types/       database (Supabase) + domain types
```

## Database

The Supabase schema is created via SQL migration and lives in your
Supabase project. It contains:

- `players`, `venues`, `games`, `game_participants`
- Enums: `game_status`, `participant_status`, `payment_method`
- UUID PKs, FKs, indexes, `updated_at` triggers
- RLS enabled on every table; policies grant full CRUD to the
  `authenticated` role (admin-style personal app)

The migration is already applied to your connected project. To
regenerate it locally, run the SQL in `apply_migration` (see
`init_volleyball_schema`) via the Supabase MCP server or copy it
into `supabase/migrations/`.

### Admin-only tightening (optional)

Current policies allow any authenticated user. If you ever invite
collaborators you don't fully trust, restrict policies to a specific
user id, e.g.

```sql
create policy players_admin_only on public.players
  for all to authenticated
  using (auth.uid() = '<your-admin-user-id>')
  with check (auth.uid() = '<your-admin-user-id>');
```

…and drop the open `*_authenticated_all` policies. Or use a
`role` claim in `raw_app_meta_data` and check
`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`.

## Setup

1. Install deps

   ```bash
   npm install
   ```

2. Create `.env` based on `.env.example`

   ```
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
   ```

   Use the publishable key (`sb_publishable_...`) - never the
   `service_role` key in a frontend app.

3. Create an admin user in Supabase Auth (Dashboard →
   Authentication → Users → Add user). You will log in with this
   email/password.

4. Start dev

   ```bash
   npm run dev
   ```

5. Production build

   ```bash
   npm run build
   npm run preview
   ```

## Scripts

| Script              | What it does                  |
| ------------------- | ----------------------------- |
| `npm run dev`       | Vite dev server               |
| `npm run build`     | Type-check + production build |
| `npm run preview`   | Serve built app locally       |
| `npm run typecheck` | `tsc -b --noEmit`             |

## Features

- **Dashboard** - upcoming games count, active players count,
  unpaid participants, next game summary, table of upcoming games.
- **Players** - create / edit / soft-deactivate (no hard delete
  if the player has games), search by name / Telegram / phone,
  clickable Telegram link.
- **Venues** - create / edit / delete (delete is blocked by FK if
  any game references the venue), clickable map URL.
- **Games** - list with status + period filters, create / edit /
  delete; cancelled games are visually dimmed.
- **Game detail** - venue/time/price/totals cards, participants
  table with inline editing for status, attended/absent, paid +
  amount + method + note; add active players in bulk (no
  duplicates).
- **Telegram message** - generates a Russian message based on
  the game, venue and confirmed/attended participants; copy
  button.
- **Telegram bot** - send day-before reminders to your group from
  the game detail page (Supabase Edge Functions + grammY). See
  [docs/TELEGRAM_BOT.md](docs/TELEGRAM_BOT.md).

## Notes on design choices

- Plain string handling for `game_date`/`start_time` avoids
  timezone surprises across the day boundary.
- `paid_amount` defaults to `game.price_per_player` when you tick
  "paid" without specifying an amount, but you can override it.
- The data model already supports automated payment detection
  later: add a new column or a separate `payment_events` table
  referencing `game_participants.id`.
- `game_participants_unique (game_id, player_id)` prevents
  duplicate participations at the DB level.
