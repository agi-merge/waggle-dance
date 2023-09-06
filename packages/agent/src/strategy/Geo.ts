export type Geo =
  | {
      city?: string | undefined;
      country?: string | undefined;
      region?: string | undefined;
      latitude?: string | undefined;
      longitude?: string | undefined;
    }
  | undefined;

export default Geo;
