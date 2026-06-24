import UploadSection from "@/components/upload/UploadSection";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <UploadSection />
    </Suspense>
  );
}
