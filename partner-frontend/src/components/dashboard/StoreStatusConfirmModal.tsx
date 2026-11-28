import { StoreStatusControlModal } from "../layout/OfflineConfirmModal";

interface StoreStatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOnline: boolean;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * Shared confirmation modal wrapper for PartnerDashboardScreen and ZomatoHubView,
 * delegating directly to the unified StoreStatusControlModal.
 */
export function StoreStatusConfirmModal({
  isOpen,
  onClose,
  currentOnline,
  onConfirm,
  isLoading = false,
}: StoreStatusConfirmModalProps) {
  return (
    <StoreStatusControlModal
      isOpen={isOpen}
      mode={currentOnline ? "offline" : "online"}
      isLoading={isLoading}
      onClose={onClose}
      onConfirmOffline={() => onConfirm()}
      onConfirmOnline={onConfirm}
    />
  );
}
