// app/(web)/store/page.tsx
import { Suspense } from "react";
import StorePageContent from "../components/StorePageContent";
import VortexLoader from "@/app/(web)/components/VortexLoader";

export default function StorePage() {
  return (
    <Suspense fallback={<VortexLoader />}>
      <StorePageContent />
    </Suspense>
  );
}