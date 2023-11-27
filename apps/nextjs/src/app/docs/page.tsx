import { getApiDocs } from 'lib/swagger';
import dynamic from 'next/dynamic';

const ReactSwagger = dynamic(() => import('./react-swagger'), { ssr: false });

export default function IndexPage() {
  const spec = getApiDocs();
  return (
    <section className="container">
      <ReactSwagger spec={spec} />
    </section>
  );
}