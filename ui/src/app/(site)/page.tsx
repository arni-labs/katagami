import { MosaicSheet } from "./explore/mosaic/sheet";

// The sheet reads the signed-in tier to decide how much of the library it hands
// over, so the front door cannot be one cached document for everybody.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <MosaicSheet />;
}
