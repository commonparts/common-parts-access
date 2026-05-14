# Common Parts Access

**Common Parts Access** is an open platform for publishing and accessing digital spare parts for everyday object repair.

It is the first official interface of the [Common Parts](https://commonparts.org) project — an infrastructure initiative for standardizing, structuring, and distributing digital spare parts.

→ [access.commonparts.org](https://access.commonparts.org)

---

## What this is

Common Parts Access is a structured registry where spare part models can be published, discovered, and downloaded. Contributors can publish original models or curate existing open-licensed parts from external platforms (Printables, Thingiverse, GitHub, etc.) with full attribution to original authors.

The platform is currently in active development (Phase 0 — MVP). It is functional and live.

Common Parts Access is an official interface of the [Common Parts](https://commonparts.org) project — an infrastructure initiative for standardizing and distributing digital spare parts.

---

## Tech stack

- **Framework:** Next.js (App Router) · TypeScript
- **Database:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Deployment:** Vercel
- **CI:** GitHub Actions (type check + lint on every push and PR)

---

## Running locally

### Prerequisites

- Node.js 20+
- A Supabase project (free tier is sufficient)

### Setup

```bash
git clone https://github.com/wooduf2000/common-part-access.git
cd common-part-access
npm install
cp .env.example .env.local
```

Edit `.env.local` with your own Supabase credentials, then:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment variables

All required variables are documented in `.env.example`. Never commit real credentials.

---

## Contributing

Code contributions are not solicited at this stage. The codebase is maintained by the core team.

**What you can do:**

- [Publish a part](https://access.commonparts.org/upload) — whether you designed it or curated it from an existing source
- Report a bug or share feedback using the feedback button at the bottom right of the app

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## License

The source code is published under the [MIT License](./LICENSE).

Part models published on Common Parts Access retain their original license. Common Parts does not claim ownership of models it does not author. Attribution to original creators is mandatory and systematically displayed.

---

## About Common Parts

Common Parts is an ongoing project focused on structuring and standardizing digital spare parts. Common Parts Access is the first platform built within this framework.

Learn more: [commonparts.org](https://commonparts.org)