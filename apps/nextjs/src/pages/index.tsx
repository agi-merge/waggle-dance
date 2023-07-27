// pages/index.tsx

import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";

export default function Home() {
  return (
    <MainLayout>
      <Title title="🐝 Goal solver" description="" />
      <GoalInput />
    </MainLayout>
  );
}
