This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

Before running the application, you need to configure Cloudflare R2 storage for video uploads.

**See [R2_SETUP.md](./R2_SETUP.md) for detailed Cloudflare R2 configuration instructions.**

You also need Supabase environment variables for authentication and account management.

Create a `.env.local` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_ACTION_PASSKEY=...
ADMIN_USER_EMAILS=admin1@example.com,admin2@example.com
INVITE_REDIRECT_URL=http://localhost:3000/invite
```

Notes:
- `ADMIN_USER_EMAILS` controls which signed-in users can use `/admin/accounts` API actions.
- `ADMIN_ACTION_PASSKEY` is still required as a second factor for create/remove user actions.
- `INVITE_REDIRECT_URL` is used when generating Supabase invite links.

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Account Provisioning Flow

1. Sign in using an email listed in `ADMIN_USER_EMAILS`.
2. Open the Manage Accounts page.
3. Enter the target email and generate an invite.
4. Confirm with `ADMIN_ACTION_PASSKEY`.
5. Share the generated invite link with the user.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Videos](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment videos](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
