"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEP_MS = 250;
const MAX_STEPS = 12;
const COOLDOWN_MS = 3000;

function sequenceFromTaps(taps: boolean[]): string {
  return taps.map((b) => (b ? "1" : "0")).join("");
}

function sequenceDisplay(taps: boolean[], max: number): string {
  return Array.from({ length: max }, (_, i) => {
    if (taps[i] === undefined) return "-";
    return taps[i] ? "‾" : "_";
  }).join("");
}

export interface TapRecorderProps {
  onTapComplete: (sequence: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TapRecorder({
  onTapComplete,
  disabled = false,
  className,
}: TapRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [clickActive, setClickActive] = useState(false);
  const [recordedTaps, setRecordedTaps] = useState<boolean[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickActiveRef = useRef(false);
  const pressedThisPeriodRef = useRef(false);
  clickActiveRef.current = clickActive;

  const finishRecording = useCallback(
    (sequence: string) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRecording(false);
      setCooldown(true);
      onTapComplete(sequence);
      cooldownRef.current = setTimeout(() => {
        setCooldown(false);
        setRecordedTaps([]);
        cooldownRef.current = null;
      }, COOLDOWN_MS);
    },
    [onTapComplete]
  );

  const startRecording = useCallback(() => {
    if (intervalRef.current) return;
    setRecordedTaps([true]);
    setRecording(true);
    intervalRef.current = setInterval(() => {
      setRecordedTaps((prev) => {
        const heldAtEnd = clickActiveRef.current;
        const pressedDuringPeriod = pressedThisPeriodRef.current;
        pressedThisPeriodRef.current = false;
        return [...prev, heldAtEnd || pressedDuringPeriod];
      });
    }, STEP_MS);
  }, []);

  useEffect(() => {
    if (recordedTaps.length >= MAX_STEPS && recording) {
      finishRecording(sequenceFromTaps(recordedTaps));
    }
  }, [recordedTaps, recording, finishRecording]);

  const handlePress = useCallback(() => {
    if (disabled || cooldown) return;
    pressedThisPeriodRef.current = true;
    setClickActive(true);
    if (!recording) {
      startRecording();
    }
  }, [disabled, cooldown, recording, startRecording]);

  const handleRelease = useCallback(() => {
    setClickActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  const isDisabled = disabled || cooldown;

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <Button
        size="icon"
        disabled={isDisabled}
        className="h-[200px] w-[200px] rounded-full"
        onMouseDown={(e) => {
          e.preventDefault();
          handlePress();
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          handleRelease();
        }}
        onMouseLeave={handleRelease}
        onTouchStart={(e) => {
          e.preventDefault();
          handlePress();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleRelease();
        }}
        onTouchCancel={handleRelease}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Record tap sequence"
      >
        {cooldown ? (
          <Loader2 className="h-16 w-16 animate-spin" />
        ) : (
          <Lightbulb className="h-[100px] w-[100px]" />
        )}
      </Button>
      <pre
        className="font-mono text-lg tabular-nums"
        style={{ fontFamily: "ui-monospace, monospace" }}
        aria-label="Tap sequence"
      >
        {sequenceDisplay(recordedTaps, MAX_STEPS)}
      </pre>
    </div>
  );
}
