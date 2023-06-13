import { signOut } from "next-auth/react";

const SignOut = () => {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: `${window.location.origin}/` });
  };

  return (
    <>
      <div>
        <button onClick={() => void handleSignOut()}>Sign Out</button>
      </div>
    </>
  );
};

export default SignOut;
