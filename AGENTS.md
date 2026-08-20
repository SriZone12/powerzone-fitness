# Powerzone Fitness - Gym Management System

## Project Overview
- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Purpose:** Role-based gym management system for Powerzone Fitness

## Tech Stack
- Next.js 14.2.35
- React 18
- Tailwind CSS 3.4.1
- Supabase (database + auth)

## Database Tables (Supabase)
**Important:** Tables use custom naming conventions:

| Table | Purpose |
|-------|---------|
| `app_users` | All users (members, staff, admin) - NOT "users" |
| `membership_plan` | Membership plans - NOT "membership_plans" |
| `member_memberships` | Links members to purchased plans |
| `classes` | Personal training sessions |
| `attendance` | Member check-in records |

## Supabase Connection
- **Project URL:** `https://hntkcxayitztamiehzsq.supabase.co`
- **Anon Key:** Stored in `.env.local` (never commit this file)
- **Credentials location:** `/home/khatri/Desktop/powerzonefitness/pz password/pass.txt`

## Commands
```bash
# Install dependencies
npm install

# Install Supabase package
npm install @supabase/supabase-js

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## Project Structure
```
powerzone-fitness/
├── app/
│   ├── page.js          # Homepage (to be updated)
│   ├── login/page.js    # Login page (to be created)
│   ├── register/page.js # Registration page (to be created)
│   ├── member/page.js   # Member dashboard (to be created)
│   ├── staff/page.js    # Staff dashboard (to be created)
│   └── admin/page.js    # Admin dashboard (to be created)
├── lib/
│   └── supabase.js      # Supabase client (to be created)
├── .env.local           # Environment variables (to be created)
└── package.json
```

## Role-Based Access Control
Three roles with different permissions:

### Member
- Register and login
- View membership details
- Book classes (if PT plan)
- View attendance history
- Make payments

### Staff (Trainer)
- Login
- View member list
- Mark attendance/check-in
- View today's classes
- Cannot edit plans or see revenue

### Admin (Owner)
- All staff permissions
- Create/edit/delete membership plans
- Create/edit/delete classes
- View full dashboard (members, revenue, attendance)
- Manage staff accounts

## Development Workflow
1. **Always explain changes before making them**
2. **Wait for user approval before editing files**
3. **Test each feature before moving to next**
4. **Keep code simple - user is a beginner**

## Current Status
- [x] Supabase account created
- [x] Database tables created (app_users, membership_plan, member_memberships, classes, attendance)
- [x] Next.js project created
- [ ] Supabase package not yet installed
- [ ] .env.local not yet created
- [ ] Login/Register pages not yet created
- [ ] Dashboard pages not yet created

## Next Steps
1. Install Supabase package: `npm install @supabase/supabase-js`
2. Create `.env.local` with Supabase credentials
3. Create `lib/supabase.js` client file
4. Create registration page
5. Create login page
6. Update homepage
7. Create role-based dashboards

## Important Notes
- **Never commit `.env.local`** - contains secrets
- **Table naming is custom** - use `app_users` not `users`
- **User is a beginner** - explain everything in simple terms
- **Real business app** - this will be sold to Powerzone Fitness
- **Always get permission** before making file changes

## Testing
- Manual testing in browser at `http://localhost:3000`
- Test all three roles (member, staff, admin)
- Verify Supabase connection works
- Check role-based redirects work correctly
