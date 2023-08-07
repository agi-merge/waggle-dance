const routes = {
  home: "/",
  goal: (id: string, execution?: string | undefined): string => {
    const path = `/goal/${encodeURIComponent(id)}/${
      execution ? `execution/${encodeURIComponent(execution)}` : ""
    }`;
    console.debug("generating path", path);
    return path;
  },
  refine: "/add-documents",
  donate: "https://www.patreon.com/agimerge",
};

export default routes;
