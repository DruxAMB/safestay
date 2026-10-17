import { BuildingLoader } from "@/components/BuildingLoader";

/** Hard-load fallback (initial render / non-client navigations). Client-side
 *  page-to-page loads are covered by NavLoader — App Router holds the
 *  previous screen during transitions, so this file only fires on full loads. */
export default function Loading() {
  return (
    <div
      className="load-in flex min-h-[55vh] items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <BuildingLoader />
    </div>
  );
}
