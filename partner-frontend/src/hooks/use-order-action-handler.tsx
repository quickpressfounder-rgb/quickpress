import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  AssignRiderSheet,
  CancelReasonSheet,
  InvoiceSheet,
  RejectOrderSheet,
} from "../components/orders/OrderSheets";
import { OrderSuccessOverlay } from "../components/orders/OrderSuccessOverlay";
import { type OrderActionId } from "../components/orders/order-actions";
import { usePartnerOrders } from "../context/PartnerOrdersContext";
import type { ManagedOrder } from "../data/partner-orders-mock";

type SheetState =
  | { kind: "reject" | "rider" | "invoice" | "reason"; order: ManagedOrder }
  | null;

/** Central handler for every stage action — talks to the real partner API. */
export function useOrderActionHandler() {
  const { acceptOrder, rejectOrder, confirmHandover, startProcessing, completeOrder } = usePartnerOrders();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [busy, setBusy] = useState<{ orderId: string; actionId: OrderActionId } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const run = useCallback(
    async (order: ManagedOrder, actionId: OrderActionId, message: string, mutate: () => Promise<void>) => {
      setBusy({ orderId: order.id, actionId });
      try {
        await mutate();
        setSuccess(message);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const handleAction = useCallback(
    (order: ManagedOrder, actionId: OrderActionId) => {
      switch (actionId) {
        case "accept":
          void run(order, actionId, "Order accepted", () => acceptOrder(order.id));
          break;
        case "reject":
          setSheet({ kind: "reject", order });
          break;
        case "confirm_handover":
          void run(order, actionId, "📦 Laundry Handover Confirmed! Received from Captain.", () => confirmHandover(order.id));
          break;
        case "start_pickup":
        case "picked_up":
        case "start_washing":
          void run(order, actionId, "Order moved to processing", () => startProcessing(order.id));
          break;
        case "mark_ready":
        case "washing_complete":
          void run(order, actionId, "Ready for delivery", () => completeOrder(order.id));
          break;
        case "assign_rider":
          setSheet({ kind: "rider", order });
          break;
        case "mark_delivered":
          toast.error("Delivered status is verified by delivery rider OTP at doorstep.");
          break;
        case "view_invoice":
          setSheet({ kind: "invoice", order });
          break;
        case "view_reason":
          setSheet({ kind: "reason", order });
          break;
        default:
          break;
      }
    },
    [run, acceptOrder, startProcessing, completeOrder],
  );

  const overlay = <OrderSuccessOverlay message={success} onDone={() => setSuccess(null)} />;

  const sheetNode = (() => {
    if (!sheet) return null;
    if (sheet.kind === "reject") {
      return (
        <RejectOrderSheet
          order={sheet.order}
          onClose={() => setSheet(null)}
          onConfirm={(reason) => {
            const order = sheet.order;
            setSheet(null);
            void run(order, "reject", "Order rejected", () => rejectOrder(order.id, reason));
          }}
        />
      );
    }
    if (sheet.kind === "rider") {
      return (
        <AssignRiderSheet
          order={sheet.order}
          onClose={() => setSheet(null)}
          onAssign={(_riderName: string) => {
            // MISSING BACKEND ENDPOINT: rider assignment from the partner app has no
            // backend route — only POST /api/admin/orders/{id}/assign-rider exists,
            // and it is admin-only. Surface an honest "not available" state instead
            // of faking the assignment.
            setSheet(null);
            toast.error("Rider assignment isn't available from the partner app yet.");
          }}
        />
      );
    }
    if (sheet.kind === "invoice") {
      return <InvoiceSheet order={sheet.order} onClose={() => setSheet(null)} />;
    }
    return <CancelReasonSheet order={sheet.order} onClose={() => setSheet(null)} />;
  })();

  return { handleAction, sheetNode, overlay, busy };
}
