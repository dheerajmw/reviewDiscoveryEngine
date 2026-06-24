import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";

/** Forces UploadSection to reset even when already on the home route. */
export const NEW_ANALYSIS_HREF = "/?new=1";

interface NewAnalysisLinkProps {
  className?: string;
  children?: ReactNode;
  icon?: string;
}

export default function NewAnalysisLink({
  className,
  children = "New analysis",
  icon,
}: NewAnalysisLinkProps) {
  return (
    <Link href={NEW_ANALYSIS_HREF} className={className}>
      {icon ? <Icon name={icon} className="text-base" /> : null}
      {children}
    </Link>
  );
}
