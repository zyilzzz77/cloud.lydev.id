"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  /** Long value (file name, slug, key name) rendered under the title so the title stays short. */
  subject?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface PromptOptions extends ConfirmOptions {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
}

interface ConfirmRequest {
  kind: "confirm";
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

interface PromptRequest {
  kind: "prompt";
  options: PromptOptions;
  resolve: (value: string | null) => void;
}

type Request = ConfirmRequest | PromptRequest;

interface ConfirmApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmApi | null>(null);

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useConfirm(): ConfirmApi {
  const api = useContext(ConfirmContext);

  if (!api) {
    throw new Error("useConfirm must be used inside ConfirmProvider.");
  }

  return api;
}

function Dialog({
  request,
  value,
  onValueChange,
  onSettle,
}: {
  request: Request;
  value: string;
  onValueChange: (next: string) => void;
  onSettle: (result: boolean | string | null) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const { options } = request;
  const isDestructive = options.destructive ?? false;
  const isPrompt = request.kind === "prompt";
  const canSubmit = !isPrompt || value.trim().length > 0;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Destructive dialogs start on Cancel so Enter cannot delete anything by accident.
    const initial = inputRef.current ?? (isDestructive ? cancelRef.current : confirmRef.current);
    initial?.focus();

    if (inputRef.current) {
      inputRef.current.select();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onSettle(isPrompt ? null : false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      const items = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
      const first = items.at(0);
      const last = items.at(-1);

      if (!first || !last) {
        event.preventDefault();
        return;
      }

      const active = document.activeElement;
      const isInside = dialog?.contains(active) ?? false;

      if (event.shiftKey && (!isInside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!isInside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [isDestructive, isPrompt, onSettle]);

  function handleCancel() {
    onSettle(isPrompt ? null : false);
  }

  function handleConfirm() {
    if (!canSubmit) {
      return;
    }

    onSettle(isPrompt ? value.trim() : true);
  }

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={options.cancelLabel ?? "Cancel"}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={handleCancel}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={options.subject || options.description ? descriptionId : undefined}
        className="relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          {isDestructive ? (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive-foreground">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </span>
          ) : null}
          <div className="min-w-0 space-y-2">
            <h2 id={titleId} className="text-base font-semibold text-foreground">
              {options.title}
            </h2>
            {options.subject || options.description ? (
              <div id={descriptionId} className="space-y-2">
                {options.subject ? (
                  <p
                    className="break-all rounded-md border border-border/70 bg-muted/40 px-2.5 py-1.5 font-mono text-xs leading-relaxed text-foreground"
                    title={options.subject}
                  >
                    {options.subject}
                  </p>
                ) : null}
                {options.description ? (
                  <p className="text-sm text-muted-foreground">{options.description}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleConfirm();
          }}
        >
          {request.kind === "prompt" ? (
            <div className="space-y-2">
              <label htmlFor="confirm-dialog-input" className="text-xs text-muted-foreground">
                {request.options.label}
              </label>
              <Input
                id="confirm-dialog-input"
                ref={inputRef}
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                placeholder={request.options.placeholder}
                maxLength={request.options.maxLength}
                autoComplete="off"
              />
            </div>
          ) : null}

          <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end")}>
            <Button ref={cancelRef} type="button" variant="outline" onClick={handleCancel}>
              {options.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              ref={confirmRef}
              type="submit"
              variant={isDestructive ? "destructive" : "default"}
              disabled={!canSubmit}
            >
              {options.confirmLabel ?? (isPrompt ? "Save" : "Confirm")}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState("");
  const requestRef = useRef<Request | null>(null);

  const settle = useCallback((result: boolean | string | null) => {
    const current = requestRef.current;

    if (!current) {
      return;
    }

    requestRef.current = null;
    setRequest(null);

    if (current.kind === "confirm") {
      current.resolve(Boolean(result));
    } else {
      current.resolve(typeof result === "string" ? result : null);
    }
  }, []);

  const api = useMemo<ConfirmApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          const next: ConfirmRequest = { kind: "confirm", options, resolve };
          requestRef.current = next;
          setValue("");
          setRequest(next);
        }),
      prompt: (options) =>
        new Promise<string | null>((resolve) => {
          const next: PromptRequest = { kind: "prompt", options, resolve };
          requestRef.current = next;
          setValue(options.defaultValue ?? "");
          setRequest(next);
        }),
    }),
    [],
  );

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {request ? (
        <Dialog
          request={request}
          value={value}
          onValueChange={setValue}
          onSettle={settle}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}
