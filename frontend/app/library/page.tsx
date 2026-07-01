import { redirect } from 'next/navigation';

export default function LegacyLibraryRedirect() {
  redirect('/dashboard?tab=library');
}
