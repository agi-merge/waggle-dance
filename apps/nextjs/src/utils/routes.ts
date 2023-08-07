const routes = {
  home: "/",
  goal: (id: string, execution?: string): string => {
    const path = `/goal/${id}/${execution ? `execution/${execution}` : ""}`;
    console.debug("generating path", path);
    return path;
  },
  refine: "/add-documents",
  donate: "https://www.patreon.com/agimerge",
};

export default routes;
