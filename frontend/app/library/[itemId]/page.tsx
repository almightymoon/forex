import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ itemId: string }>;
};

export default async function LegacyLibraryItemRedirect({ params }: Props) {
  const { itemId } = await params;
  redirect(`/dashboard/library/${itemId}`);
}
