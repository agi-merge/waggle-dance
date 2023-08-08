const routes = {
  home: "/",
  goal: (id: string, execution?: string | undefined): string => {
    if (!id) {
      return "/";
    }
    const path = `/goal/${encodeURIComponent(id)}/${
      execution ? `execution/${encodeURIComponent(execution)}` : ""
    }`;
    return path;
  },
  refine: "/add-documents",
  donate: "https://www.patreon.com/agimerge",
};

export default routes;
