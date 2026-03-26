import CodebaseSunburst from '../components/CodebaseSunburst';

interface CodebasePageProps {
  selectedWorkspace: string | null;
}

export default function CodebasePage({ selectedWorkspace }: CodebasePageProps) {
  return <CodebaseSunburst workspace={selectedWorkspace} />;
}
