const routes = {
  home: "/",
  goal: (id: string, executionId?: string | undefined): string => {
    if (!id) {
      return "/";
    }
    const path = `/goal/${encodeURIComponent(id)}${
      executionId ? `/execution/${encodeURIComponent(executionId)}` : ""
    }`;
    return path;
  },
  auth: "/api/auth/signin",
  donate: "https://www.patreon.com/agimerge",
};

export default routes;
