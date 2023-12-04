import dynamic from "next/dynamic";
import { getApiDocs } from "lib/swagger";

const ReactSwagger = dynamic(() => import("./react-swagger"), { ssr: false });

export default function IndexPage() {
  const spec = getApiDocs();
  return (
    <section className="container">
      <ReactSwagger spec={spec} />
    </section>
  );
}
