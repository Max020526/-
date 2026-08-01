const tone: Record<string, string> = {
  COMPLETED: "success", completed: "success", delivered: "success", picked_up: "success", paid: "success",
  PUBLISHED: "success", VALID: "success", READY_TO_CONFIRM: "info", confirmed: "info", shipped: "info",
  ready_pickup: "info", picking: "warning", packed: "warning", pending: "warning", requested: "warning",
  refund_pending: "warning", PENDING_REVIEW: "warning", HAS_EXCEPTIONS: "danger", cancelled: "danger",
  rejected: "danger", failed: "danger", ERROR: "danger", WARNING: "warning", DRAFT: "", PENDING_DETAILS: "warning",
};

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  return <span className={`status ${tone[value] ?? ""}`}><i />{label ?? value}</span>;
}
