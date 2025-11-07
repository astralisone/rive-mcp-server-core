import React, { useEffect } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";

type AstralisWinsSlotProps = {
  isSpinning: boolean;
  winAmount: number;
  onWinComplete?: (payload: { winAmount: number }) => void;
};

export const AstralisWinsSlot: React.FC<AstralisWinsSlotProps> = ({
  isSpinning,
  winAmount,
  onWinComplete
}) => {
  const { rive, RiveComponent } = useRive({
    src: "/rive/astraliswins/slot-spin.riv",
    stateMachines: ["SpinSM"],
    autoplay: true
  });

  const isSpinningInput = useStateMachineInput(rive, "SpinSM", "isSpinning");
  const winAmountInput = useStateMachineInput(rive, "SpinSM", "winAmount");

  useEffect(() => {
    if (isSpinningInput) isSpinningInput.value = isSpinning;
  }, [isSpinning, isSpinningInput]);

  useEffect(() => {
    if (winAmountInput) winAmountInput.value = winAmount;
  }, [winAmount, winAmountInput]);

  useEffect(() => {
    if (!rive || !onWinComplete) return;
    const handler = (event: any) => {
      if (event.data?.name === "WinSequenceComplete") {
        onWinComplete({ winAmount });
      }
    };
    rive.on("event", handler);
    return () => {
      rive.off("event", handler);
    };
  }, [rive, onWinComplete, winAmount]);

  return (
    <div className="astraliswins-slot-wrapper">
      <RiveComponent />
    </div>
  );
};
