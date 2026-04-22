import { redirect } from 'next/navigation';

export default function RankRewardsRoute() {
  redirect('/dashboard?tab=rank-rewards');
}

