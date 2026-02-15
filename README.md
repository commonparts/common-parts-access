# Common Parts Access

Common Parts Access (formerly PartHarbor) is an open platform for publishing and accessing digital spare parts so everyday objects stay in use. It is part of the Common Parts initiative and keeps the focus on practical, repair-ready models.

## Features

- **Browse & Discover**: Search and filter 3D models by category, brand, product, and tags
- **Model Sharing**: Upload and publish 3D models with metadata (material, dimensions, print settings)
- **User Profiles**: Create maker profiles with reputation tracking and verified status
- **File Management**: Download single files or entire models as archives (ZIP)
- **Collections**: Organize and curate favorite models
- **Likes & Views**: Track engagement with built-in analytics
- **Authentication**: Secure sign-up and login with Supabase
- **Account Management**: Update profile, manage collections, download history

## Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) with App Router
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + custom design tokens
- **UI Components**: [Radix UI](https://radix-ui.com/) primitives
- **Authentication**: Supabase Auth with session middleware

## Getting Started

### Prerequisites

- Node.js 18+ (recommended 20+)
- npm or yarn
- Supabase account (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/common-parts-access.git
   cd common-parts-access
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Get these values from your Supabase project settings.

4. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
common-parts-access/
├── app/                        # Next.js App Router
│   ├── (auth)/                # Authentication pages (login, sign-up)
│   ├── (dashboard)/           # Protected user dashboard
│   ├── (public)/              # Public browsing pages
│   ├── api/                   # API routes and endpoints
│   └── fonts.ts               # Custom font definitions
├── components/
│   ├── auth/                  # Authentication components
│   ├── browse/                # Browse/search UI
│   ├── forms/                 # Reusable form components
│   ├── layout/                # Layout components (navbar, footer)
│   ├── model/                 # Model display components
│   └── ui/                    # Radix UI-based primitives
├── lib/
│   ├── supabase/              # Supabase client & queries
│   ├── storage/               # File storage utilities
│   ├── auth/                  # Authentication helpers
│   └── utils.ts               # Utility functions (cn, etc.)
├── types/                     # TypeScript definitions
├── constants/                 # App constants
├── design-tokens/             # Design system tokens
└── docs/                      # Documentation
```

## Architecture Highlights

### Route Organization

- **Route Groups**: Pages organized by context using route groups (not part of URL)
  - `(auth)` - Unauthenticated pages (login, sign-up)
  - `(dashboard)` - Protected user dashboard
  - `(public)` - Public browsing with navigation

### Database Layer

- **Supabase PostgreSQL** with Row-Level Security (RLS)
- **Query Pattern**: Separate query files for each domain (auth, models, users)
- **Clients**: Correct client selection based on context (server vs client component)

### Design System

- **Tailwind CSS** with custom design tokens
- **Radix UI** primitives wrapped in custom components
- **Light theme** only (enforced)
- **Tokenized spacing**: `px-md`, `py-sm`, `gap-lg` (no arbitrary values)

### File Storage

- **Buckets**: Organized by type (model-files, model-thumbnails, user-avatars)
- **Public bucket** with Supabase storage proxy in `next.config.ts`
- **Download authentication**: Required login for file downloads

## Development Workflow

### Available Scripts

```bash
npm run dev       # Start dev server with Turbopack
npm run build     # Production build
npm run lint      # Run ESLint checks
```

### Key Patterns

**Using Supabase in Server Component:**
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data } = await supabase.from('models').select()
```

**Using Supabase in Client Component:**
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data } = await supabase.from('models').select()
```

**Adding a New Query:**
Create in `lib/supabase/queries/` with proper joins for related tables (user profiles, brands, categories).

**Creating API Endpoints:**
Follow the structure in `app/api/models/route.ts` - use server Supabase client, handle errors, transform to component interfaces.

## Documentation

- [Design System](docs/DESIGN_SYSTEM.md) - Typography, colors, spacing, shadows
- [Control Sizing](docs/CONTROL_SIZING.md) - Standard control recipes
- [Layout System](docs/LAYOUT_SYSTEM.md) - Containers, grids, sections
- [File Downloads](docs/FILE_DOWNLOADS.md) - Download implementation & architecture
- [Model Views](docs/MODEL_VIEWS.md) - View tracking system
- [Model Likes](docs/MODEL_LIKES.md) - Like management
- [User Profiles](docs/USER_PROFILE_SETUP.md) - Profile creation & sync

## Important Notes

- **Next.js 15**: `cookies()` and `createClient()` return promises - always `await`
- **No CSS Modules**: Use Tailwind utilities exclusively
- **Route Groups**: Folders like `(auth)` don't appear in URLs
- **Supabase Clients**: Never mix server/client imports in the same component
- **Image Optimization**: Remote patterns configured in `next.config.ts`

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open a GitHub issue or contact the maintainers.

---

Made with ❤️ to support the right-to-repair movement
