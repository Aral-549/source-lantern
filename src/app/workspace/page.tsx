import ProjectWorkspace from '@/components/project-workspace';

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ demo?: string | string[] }> }) {
  const parameters = await searchParams;
  return <ProjectWorkspace initialDemo={typeof parameters.demo === 'string' ? parameters.demo : parameters.demo ? 'unknown' : undefined} />;
}
