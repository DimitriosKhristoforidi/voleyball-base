import { Chip } from "@/components/ui/badge";
import type {
  GameStatus,
  ParticipantStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types/domain";
import {
  GAME_STATUS_LABEL_RU,
  PARTICIPANT_STATUS_LABEL_RU,
  PAYMENT_METHOD_LABEL_RU,
  PAYMENT_STATUS_LABEL_RU,
} from "@/types/domain";

type ChipColor = "default" | "accent" | "success" | "warning" | "danger";

const GAME_COLOR: Record<GameStatus, ChipColor> = {
  planned: "accent",
  completed: "success",
  cancelled: "danger",
};

const PARTICIPANT_COLOR: Record<ParticipantStatus, ChipColor> = {
  invited: "default",
  confirmed: "accent",
  attended: "success",
  absent: "warning",
  cancelled: "danger",
};

const PAYMENT_STATUS_COLOR: Record<PaymentStatus, ChipColor> = {
  unpaid: "warning",
  partially_paid: "accent",
  paid: "success",
  overpaid: "accent",
  not_billable: "default",
};

export function GameStatusChip({ status }: { status: GameStatus }) {
  return (
    <Chip color={GAME_COLOR[status]} variant="soft" size="sm">
      {GAME_STATUS_LABEL_RU[status]}
    </Chip>
  );
}

export function ParticipantStatusChip({
  status,
}: {
  status: ParticipantStatus;
}) {
  return (
    <Chip color={PARTICIPANT_COLOR[status]} variant="soft" size="sm">
      {PARTICIPANT_STATUS_LABEL_RU[status]}
    </Chip>
  );
}

export function PaymentMethodChip({ method }: { method: PaymentMethod }) {
  return (
    <Chip variant="secondary" size="sm">
      {PAYMENT_METHOD_LABEL_RU[method]}
    </Chip>
  );
}

export function PaymentStatusChip({ status }: { status: PaymentStatus }) {
  return (
    <Chip color={PAYMENT_STATUS_COLOR[status]} variant="soft" size="sm">
      {PAYMENT_STATUS_LABEL_RU[status]}
    </Chip>
  );
}
