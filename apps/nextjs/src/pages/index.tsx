import { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Avatar, Breadcrumbs, Card, Link, Typography } from "@mui/joy";
import { useColorScheme } from "@mui/joy/styles";
import { signIn, signOut } from "next-auth/react";

import { api, type RouterOutputs } from "~/utils/api";
import { app } from "~/constants";

const PostCard: React.FC<{
  post: RouterOutputs["post"]["all"][number];
  onPostDelete?: () => void;
}> = ({ post, onPostDelete }) => {
  return (
    <div className="flex flex-row rounded-lg bg-white/10 p-4 transition-all hover:scale-[101%]">
      <div className="flex-grow">
        <h2 className="text-2xl font-bold text-pink-400">{post.title}</h2>
        <p className="mt-2 text-sm">{post.content}</p>
      </div>
      <div>
        <span
          className="cursor-pointer text-sm font-bold uppercase text-pink-400"
          onClick={onPostDelete}
        >
          Delete
        </span>
      </div>
    </div>
  );
};

const Home: NextPage = () => {
  const postQuery = api.post.all.useQuery();

  const { mode, setMode } = useColorScheme();

  const deletePostMutation = api.post.delete.useMutation({
    onSettled: () => postQuery.refetch(),
  });

  return (
    <div className="bg-honeycomb">
      <Head>
        <title>{app.name}</title>
        <meta name="description" content={app.description} />
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-screen flex-col items-center text-white">
        <div className="container my-2 flex flex-col items-center justify-center gap-4 px-4 py-8">
          <Card variant="outlined">
            <Typography level="h1">
              waggle🐝<Typography color="">💃dance</Typography>
            </Typography>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Home;
