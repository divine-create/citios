import { redirect } from 'next/navigation';

export default async function WorkspaceTeamAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/workspaces/restaurantos/${slug}/management/team`);
}
