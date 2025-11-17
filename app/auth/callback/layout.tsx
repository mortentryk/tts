// Force dynamic rendering for OAuth callback route
export const dynamic = 'force-dynamic';

export default function AuthCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

