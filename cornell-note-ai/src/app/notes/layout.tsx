import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function NotesLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/dashboard');

  return children;
}
