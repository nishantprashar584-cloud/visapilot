import Image from "next/image";
import { Fragment } from "react";
import { GripVertical, Plus, RotateCcw, RotateCw, Trash2 } from "lucide-react";

type ReorderBoardItem = {
  id: string;
  documentId: string;
  documentKind: "pdf" | "image";
  pageNumber: number;
  fileName: string;
  rotation: 0 | 90 | 180 | 270;
};

function resolveTouchDropTarget(event: React.TouchEvent<HTMLElement>) {
  const touch = event.changedTouches[0];

  if (!touch) {
    return null;
  }

  const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
  return element?.closest<HTMLElement>("[data-reorder-item-id],[data-insert-slot-index]") ?? null;
}

export function ReorderBoard({
  items,
  draggedItemId,
  highlightedInsertIndex,
  resolvePreviewUrl,
  onGrabItem,
  onReleaseItem,
  onDropOnItem,
  onInsertAt,
  onOpenInsertPicker,
  onRotate,
  onRemove,
  onMoveByOffset,
  onAnnounce,
}: {
  items: ReorderBoardItem[];
  draggedItemId: string | null;
  highlightedInsertIndex: number | null;
  resolvePreviewUrl: (itemId: string) => string;
  onGrabItem: (itemId: string) => void;
  onReleaseItem: () => void;
  onDropOnItem: (targetItemId: string) => void;
  onInsertAt: (index: number) => void;
  onOpenInsertPicker: (index: number) => void;
  onRotate: (itemId: string, direction: "left" | "right") => void;
  onRemove: (itemId: string) => void;
  onMoveByOffset: (itemId: string, offset: number) => void;
  onAnnounce: (message: string) => void;
}) {
  function renderInsertSlot(index: number, isTail = false) {
    const isHighlighted = highlightedInsertIndex === index;

    return (
      <button
        key={`insert-${index}`}
        type="button"
        data-insert-slot-index={index}
        onClick={() => onOpenInsertPicker(index)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => onInsertAt(index)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && draggedItemId) {
            event.preventDefault();
            onInsertAt(index);
            onAnnounce(`Moved the grabbed page to position ${index + 1}.`);
          }
        }}
        className={isHighlighted
          ? "flex aspect-[1/1.414] flex-col items-center justify-center rounded-[1rem] border border-cyan-300/40 bg-cyan-500/16 px-4 text-center text-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]"
          : "flex aspect-[1/1.414] flex-col items-center justify-center rounded-[1rem] border border-dashed border-cyan-300/28 bg-cyan-500/10 px-4 text-center text-cyan-50 transition hover:bg-cyan-500/14"}
        aria-label={`Insert files at position ${index + 1}`}
      >
        <Plus className="h-5 w-5" />
        <span className="mt-3 text-sm font-semibold">{isTail ? "Add More Files" : "Insert Here"}</span>
        <span className="mt-2 text-xs leading-5 text-cyan-100/90">
          {isTail ? "Append extra PDFs or image scans to the end of the packet." : "Place new pages at this exact point in the packet order."}
        </span>
      </button>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {renderInsertSlot(0)}
      {items.map((item, index) => {
        const previewUrl = resolvePreviewUrl(item.id);
        const isGrabbed = draggedItemId === item.id;

        return (
          <Fragment key={item.id}>
            <div
              draggable
              tabIndex={0}
              role="button"
              aria-pressed={isGrabbed}
              data-reorder-item-id={item.id}
              onDragStart={() => onGrabItem(item.id)}
              onDragEnd={onReleaseItem}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDropOnItem(item.id)}
              onTouchStart={() => onGrabItem(item.id)}
              onTouchMove={(event) => {
                if (draggedItemId === item.id) {
                  event.preventDefault();
                }
              }}
              onTouchEnd={(event) => {
                const target = resolveTouchDropTarget(event);
                const insertIndex = target?.dataset.insertSlotIndex;
                const targetItemId = target?.dataset.reorderItemId;

                if (insertIndex) {
                  onInsertAt(Number(insertIndex));
                  onAnnounce(`Moved ${item.fileName} page ${item.pageNumber} to position ${Number(insertIndex) + 1}.`);
                  return;
                }

                if (targetItemId) {
                  onDropOnItem(targetItemId);
                  onAnnounce(`Reordered ${item.fileName} page ${item.pageNumber}.`);
                  return;
                }

                onReleaseItem();
              }}
              onKeyDown={(event) => {
                if (event.key === " ") {
                  event.preventDefault();
                  if (isGrabbed) {
                    onReleaseItem();
                    onAnnounce(`Released ${item.fileName} page ${item.pageNumber}.`);
                    return;
                  }

                  onGrabItem(item.id);
                  onAnnounce(`Grabbed ${item.fileName} page ${item.pageNumber}. Use arrow keys to move, Enter to drop, or Delete to remove.`);
                  return;
                }

                if ((event.key === "ArrowLeft" || event.key === "ArrowUp") && isGrabbed) {
                  event.preventDefault();
                  onMoveByOffset(item.id, -1);
                  onAnnounce(`Moved ${item.fileName} page ${item.pageNumber} earlier in the packet.`);
                  return;
                }

                if ((event.key === "ArrowRight" || event.key === "ArrowDown") && isGrabbed) {
                  event.preventDefault();
                  onMoveByOffset(item.id, 1);
                  onAnnounce(`Moved ${item.fileName} page ${item.pageNumber} later in the packet.`);
                  return;
                }

                if (event.key === "Enter" && draggedItemId && draggedItemId !== item.id) {
                  event.preventDefault();
                  onDropOnItem(item.id);
                  onAnnounce(`Dropped the grabbed page on ${item.fileName} page ${item.pageNumber}.`);
                  return;
                }

                if (event.key === "Delete" || event.key === "Backspace") {
                  event.preventDefault();
                  onRemove(item.id);
                  onAnnounce(`Removed ${item.fileName} page ${item.pageNumber} from the packet.`);
                }
              }}
              className={isGrabbed
                ? "group rounded-[1rem] bg-[rgba(10,18,34,0.78)] p-3 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.55),0_0_0_1px_rgba(99,102,241,0.18)] outline-none"
                : "group rounded-[1rem] bg-[rgba(10,18,34,0.64)] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] outline-none focus-visible:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.55),0_0_0_1px_rgba(99,102,241,0.18)]"}
            >
              <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                <span>{index + 1}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-[10px] text-slate-100">
                  <GripVertical className="h-3 w-3" />
                  {isGrabbed ? "Grabbed" : "Drag"}
                </span>
              </div>

              <div className="relative overflow-hidden rounded-[0.8rem] bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]">
                <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-1 opacity-100">
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/82 text-rose-100 transition hover:bg-rose-500/90"
                    aria-label={`Delete ${item.fileName} page ${item.pageNumber}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onRotate(item.id, "left")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/82 text-white transition hover:bg-slate-900"
                      aria-label={`Rotate ${item.fileName} page ${item.pageNumber} left`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRotate(item.id, "right")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/82 text-white transition hover:bg-slate-900"
                      aria-label={`Rotate ${item.fileName} page ${item.pageNumber} right`}
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="aspect-[1/1.414] overflow-hidden bg-white" style={{ transform: `rotate(${item.rotation}deg)` }}>
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt={`${item.fileName} page ${item.pageNumber}`}
                      width={320}
                      height={452}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-3 text-center text-xs text-slate-400">
                      Preview unavailable
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <p className="truncate text-xs font-semibold text-white">{item.fileName}</p>
                <p className="text-[11px] text-slate-300">
                  Page {item.pageNumber}{item.rotation !== 0 ? ` · ${item.rotation}°` : ""}
                </p>
              </div>
            </div>
            {renderInsertSlot(index + 1, index === items.length - 1)}
          </Fragment>
        );
      })}
    </div>
  );
}