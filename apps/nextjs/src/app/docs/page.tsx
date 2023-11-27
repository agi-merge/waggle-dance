import { getApiDocs } from 'lib/swagger';
import ReactSwagger from './react-swagger';

export default function IndexPage() {
  const spec = getApiDocs();
  return (
    <section className="container">
      <ReactSwagger spec={spec} />
    </section>
  );
}