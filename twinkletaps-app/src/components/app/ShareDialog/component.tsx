"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ShareType = "workspace" | "device";

export interface ShareDialogProps {
  type: ShareType;
  targetName: string;
  onGenerateLink: () => Promise<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogState = "idle" | "loading" | "ready";

export function ShareDialog({
  type,
  targetName,
  onGenerateLink,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const [state, setState] = useState<DialogState>("idle");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setState("idle");
      setLink(null);
      setError(null);
      setCopied(false);
    }
    onOpenChange(isOpen);
  };

  const handleGenerate = async () => {
    setState("loading");
    setError(null);
    try {
      const url = await onGenerateLink();
      setLink(url);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link");
      setState("idle");
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const title = type === "workspace" ? "Invite to workspace" : "Share device";
  const description =
    type === "workspace"
      ? `Generate a link to invite others to ${targetName}`
      : `Generate a link to share access to ${targetName}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </DialogHeader>

        {state === "ready" && link ? (
          <>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded border bg-muted px-3 py-2 text-sm">
                {link}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label="Copy link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              Link expires in 48 hours.
            </p>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={state === "loading"}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={state === "loading"}>
                {state === "loading" ? "Generating…" : "Generate link"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
