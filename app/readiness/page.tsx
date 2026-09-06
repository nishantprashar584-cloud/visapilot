import type { TravelGroup } from "@/types";
import { ReadinessFlow } from "@/components/readiness/ReadinessFlow";

function parseInitialGroup(value?: string): TravelGroup {
  return value === "couple" || value === "family" ? value : "solo";
}

export const dynamic = "force-dynamic";

export default function ReadinessPage({
  searchParams,
}: {
  searchParams?: { preview?: string; group?: string };
}) {
  const previewMode = searchParams?.preview === "1";
  const initialGroup = parseInitialGroup(searchParams?.group);

  return (
    <section className="w-full space-y-8 px-4 pb-12 sm:px-6 lg:px-8">
      <ReadinessFlow previewMode={previewMode} initialGroup={initialGroup} />
    </section>
  );
}