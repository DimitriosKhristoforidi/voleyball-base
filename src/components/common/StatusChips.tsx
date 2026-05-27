import { Chip } from "@heroui/react";
import type {
  GameStatus,
  ParticipantStatus,
  PaymentMethod,
} from "@/types/domain";
import {
  GAME_STATUS_LABEL_RU,
  PARTICIPANT_STATUS_LABEL_RU,
  PAYMENT_METHOD_LABEL_RU,
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
