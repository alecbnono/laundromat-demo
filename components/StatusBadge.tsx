import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type Status } from "@/lib/types";

const VARIANT: Record<Status, ComponentProps<typeof Badge>["variant"]> = {
  new: "warning",
  picked_up: "info",
  washing: "info",
  ready: "success",
  completed: "secondary",
  cancelled: "destructive",
};

/** An order's status as a coloured pill. `label` replaces the usual wording. */
export default function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return <Badge variant={VARIANT[status]}>{label ?? STATUS_LABEL[status]}</Badge>;
}
