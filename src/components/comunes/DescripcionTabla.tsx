import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/** Conserva el texto completo aunque la columna muestre una descripción truncada. */
export function DescripcionTabla({ texto }: { texto?: string | null | undefined }) {
  if (!texto) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="block max-w-64 truncate">{texto}</span>
        </TooltipTrigger>
        <TooltipContent className="z-[60] max-h-[var(--radix-tooltip-content-available-height)] max-w-[min(36rem,calc(100vw-2rem))] overflow-auto whitespace-pre-wrap break-words">
          {texto}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}