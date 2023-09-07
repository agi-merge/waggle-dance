// pages/index.tsx

import { useEffect } from "react";
import { useRouter } from "next/router";

// export const getStaticProps = getStaticPropsMain;

// export function getStaticPaths() {
//   return {
//     paths: [],
//     fallback: "blocking",
//   };
// }

export const config = {
  runtime: "experimental-edge",
};

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    void router.replace("/goal");
  });
  return null;
}
