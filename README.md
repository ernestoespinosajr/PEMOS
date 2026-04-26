# PEMOS - Dominican Electoral Management System



## Features

- **Member Management**: Track organization members with hierarchical roles, contact information, and seguimiento (follow-up) history
- **Electoral Management**: Manage precincts (recintos), polling stations (colegios), candidates, and vote tallying
- **Real-Time Dashboard**: Interactive analytics with turnout tracking, vote distribution by candidate and party, precinct progress monitoring
- **Scheduling**: Calendar-based event management with timeline views for campaign activities
- **Report Generation**: Archive and generate comprehensive electoral reports
- **Hierarchical Organization**: Support for organizational structure with parent-child relationships and role-based permissions
- **Photo Management**: Upload and manage member profile photos
- **Authentication & Authorization**: Secure JWT-based authentication with role-based access control (RBAC)

## Tech Stack

- **Framework**: Next.js 14.2.31 with App Router
- **Language**: TypeScript with strict type checking
- **Frontend**: React 18, Tailwind CSS, shadcn/ui, Radix UI components
- **State Management**: Zustand for global state
- **Forms**: React Hook Form with Zod validation
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **Authentication**: Supabase Auth with JWT
- **Calendar**: FullCalendar for scheduling
- **Data Visualization**: Recharts for charts and graphs
- **Styling**: Tailwind CSS with custom component library

## Prerequisites

- **Node.js**: Version 20 (specified in `.nvmrc`)
- **npm**: Version 8+
- **Supabase Account**: Free or paid tier with a project initialized
- **Git**: For version control

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd PEMOS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the project root with your Supabase credentials:

```bash
# Supabase API Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: Other configuration variables
# Add any additional environment variables as needed
```

**Finding Your Credentials:**

1. Go to your Supabase Project Settings
2. Under "API", copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon Public Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)

See `.env.example` for a template of all available variables.

## Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

**Hot Reload**: Changes to files are automatically reflected in the browser during development.

## Building for Production

### Build the Application

```bash
npm run build
```

This creates an optimized production build in the `.next` directory.

### Run Production Server

```bash
npm start
```

The application will serve on `http://localhost:3000`

## Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint for code quality checks
npm run lint

# Format code with Prettier
npm run format

# Type check without building
npm run type-check
```

## Project Structure

```
PEMOS/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── (dashboard)/              # Main dashboard routes
│   │   │   ├── configuracion/        # Configuration page
│   │   │   ├── cronograma/           # Scheduling page
│   │   │   ├── layout.tsx            # Dashboard layout
│   │   │   └── page.tsx              # Dashboard home
│   │   ├── api/                      # API routes
│   │   │   ├── electoral/            # Electoral management endpoints
│   │   │   │   ├── actas/            # Vote tally records
│   │   │   │   ├── asignaciones/     # Candidate assignments
│   │   │   │   ├── candidatos/       # Candidate management
│   │   │   │   ├── colegios/         # Polling stations
│   │   │   │   ├── dashboard/        # Dashboard data endpoints
│   │   │   │   ├── recintos/         # Precinct management
│   │   │   │   ├── turnout/          # Voter turnout data
│   │   │   │   └── votos/            # Vote management
│   │   │   ├── hierarchy/            # Organizational hierarchy
│   │   │   ├── members/              # Member management
│   │   │   ├── reports/              # Report generation
│   │   │   └── seguimiento/          # Follow-up tracking
│   │   ├── middleware.ts             # Auth and routing middleware
│   │   └── layout.tsx                # Root layout
│   ├── components/                   # React components by feature
│   │   ├── admin/                    # Administrative UI
│   │   ├── layout/                   # Layout components
│   │   ├── schedule/                 # Scheduling components
│   │   └── ...                       # Other feature components
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-dashboard-data.ts     # Dashboard data fetching
│   │   ├── use-schedule-events.ts    # Calendar event management
│   │   ├── use-user-scope.ts         # User authorization scope
│   │   └── ...
│   ├── lib/                          # Utility functions and helpers
│   │   ├── auth/                     # Authentication utilities
│   │   │   ├── roles.ts              # Role definitions and RBAC
│   │   │   └── verify-api-auth.ts    # API authentication
│   │   └── ...
│   ├── stores/                       # Zustand state management
│   ├── types/                        # TypeScript type definitions
│   └── middleware.ts                 # Next.js middleware
├── public/                           # Static assets
├── .env.example                      # Environment variables template
├── .nvmrc                            # Node.js version specification
├── tsconfig.json                     # TypeScript configuration
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Tailwind CSS configuration
└── package.json                      # Project dependencies
```

## API Endpoints

The application provides RESTful API endpoints for all major features:

### Electoral Management
- `GET/POST /api/electoral/recintos` - Precinct operations
- `GET/POST /api/electoral/colegios` - Polling station operations
- `GET/POST /api/electoral/candidatos` - Candidate management
- `GET/POST /api/electoral/votos` - Vote tracking
- `GET /api/electoral/turnout` - Voter turnout statistics

### Dashboard Analytics
- `GET /api/electoral/dashboard/summary` - Overall campaign summary
- `GET /api/electoral/dashboard/by-candidate` - Results by candidate
- `GET /api/electoral/dashboard/by-party` - Results by party
- `GET /api/electoral/dashboard/precinct-progress` - Precinct reporting status
- `GET /api/electoral/dashboard/timeline` - Campaign timeline data
- `GET /api/electoral/dashboard/turnout` - Turnout visualization data

### Member Management
- `GET/POST /api/members` - Member operations
- `GET/POST/DELETE /api/members/[id]` - Individual member operations
- `POST /api/members/bulk` - Bulk member import/operations
- `GET /api/members/[id]/photo` - Member photo management
- `GET /api/members/[id]/seguimiento` - Member follow-up history

### Organization
- `GET/POST /api/hierarchy` - Organizational hierarchy
- `GET /api/hierarchy/[id]/children` - Hierarchy navigation

### Reporting
- `POST /api/reports/generate` - Generate electoral reports
- `GET /api/reports/archives` - List archived reports

All endpoints require proper authentication via JWT and respect role-based access control.

## Authentication & Authorization

The application uses JWT-based authentication through Supabase Auth:

- **Sign In**: Users authenticate through Supabase Auth
- **JWT Storage**: Tokens stored securely in httpOnly cookies
- **Middleware**: Auth middleware verifies tokens on protected routes
- **RBAC**: Role-based access control defines what users can access
- **RLS**: Supabase Row-Level Security enforces data isolation at database level

See `src/lib/auth/roles.ts` for role definitions and `src/middleware.ts` for auth middleware implementation.

## Deployment

### Supabase Setup
1. Create a Supabase project
2. Run all migrations to set up database schema
3. Configure authentication providers
4. Set up Row-Level Security policies

### Server Deployment
1. Build the application: `npm run build`
2. Deploy to your hosting platform (Vercel, AWS, etc.)
3. Set environment variables in production
4. Verify database connectivity and auth configuration

## Development Workflow

### Code Quality
- **ESLint**: Run `npm run lint` before committing
- **Prettier**: Run `npm run format` to auto-format code
- **TypeScript**: Run `npm run type-check` for type safety

### Git Workflow
1. Create a feature branch from `main`
2. Make changes following project conventions
3. Test thoroughly before committing
4. Write clear, descriptive commit messages
5. Submit pull request for review

### Database Migrations
- Migrations are version-controlled in Supabase
- Always test migrations locally before deploying
- Maintain backward compatibility when possible

## Contributing Guidelines

### Before Starting Work
1. Check for existing issues or discussions
2. Create an issue if proposing new features
3. Discuss approach with team before major changes

### Code Standards
- Use TypeScript strictly (no `any` types without justification)
- Follow project naming conventions
- Write meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep components focused and single-responsibility

### Testing
- Write tests for critical business logic
- Test API endpoints before deployment
- Verify UI changes across different screen sizes

### Documentation
- Update README when adding new features
- Document API changes with examples
- Include comments for non-obvious code sections
- Update types when schema changes

## Troubleshooting

### Port Already in Use
If port 3000 is in use, specify a different port:
```bash
npm run dev -- -p 3001
```

### Environment Variables Not Loading
- Verify `.env.local` exists in project root
- Check that variable names match exactly (case-sensitive)
- Restart dev server after changing `.env.local`

### Supabase Connection Issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
- Check Supabase project is active and accessible
- Ensure Row-Level Security policies allow your auth user

### Database Migrations Failed
- Check Supabase dashboard for migration status
- Review migration logs in Supabase console
- Verify migrations are in correct order

## Support & Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **React Documentation**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

## License

This project is proprietary software for Dominican electoral management. All rights reserved.

## Credits

Built for Dominican political organizations to streamline electoral management and campaign coordination.

---

**Questions?** Reach out to the development team for support and guidance.
