"use client";

import React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { SECTION_TYPES, type SectionType, type StorySection } from "@/lib/story/schema";
import { summarizeSection } from "@/lib/story/factory";

/* =========================================================================
   Left sidebar: reorderable section outline + add-section menu.
   Drag-and-drop works with both pointer and keyboard (dnd-kit sortable).
   ========================================================================= */

export function OutlinePanel({
  sections,
  selectedId,
  onSelect,
  onMove,
  onAdd,
  onDuplicate,
  onDelete,
}: {
  sections: StorySection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onAdd: (type: SectionType) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    if (from >= 0 && to >= 0) onMove(from, to);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-4 py-3">
        <p className="eyebrow">Sections</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex-1 space-y-1 overflow-y-auto p-2">
            {sections.map((section, i) => (
              <SortableRow
                key={section.id}
                section={section}
                index={i}
                selected={section.id === selectedId}
                onSelect={() => onSelect(section.id)}
                onDuplicate={() => onDuplicate(section.id)}
                onDelete={() => onDelete(section.id)}
                onMoveUp={() => i > 0 && onMove(i, i - 1)}
                onMoveDown={() => i < sections.length - 1 && onMove(i, i + 1)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="border-t border-line p-3">
        <AddSectionMenu onAdd={onAdd} />
      </div>
    </div>
  );
}

function SortableRow({
  section,
  index,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  section: StorySection;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group rounded-lg border",
        selected ? "border-accent bg-accent-soft/40" : "border-transparent hover:bg-paper-sunken",
        isDragging && "z-10 opacity-80",
      )}
    >
      <div className="flex items-center gap-1 px-1 py-1">
        <button
          type="button"
          className="cursor-grab touch-none rounded px-1.5 py-1 text-ink-faint hover:text-ink"
          aria-label={`Reorder ${summarizeSection(section)}`}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={onSelect}
          aria-current={selected}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
        >
          <span className="w-4 shrink-0 text-center text-[0.7rem] text-ink-faint">{index + 1}</span>
          <span className="truncate text-sm capitalize">{summarizeSection(section)}</span>
        </button>
        <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <IconButton label="Move up" onClick={onMoveUp}>
            ↑
          </IconButton>
          <IconButton label="Move down" onClick={onMoveDown}>
            ↓
          </IconButton>
          <IconButton label="Duplicate section" onClick={onDuplicate}>
            ⧉
          </IconButton>
          <IconButton label="Delete section" onClick={onDelete} danger>
            ✕
          </IconButton>
        </span>
      </div>
    </li>
  );
}

function IconButton({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "rounded px-1.5 py-1 text-xs",
        danger ? "text-danger hover:bg-danger/10" : "text-ink-faint hover:bg-paper-raised hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function AddSectionMenu({ onAdd }: { onAdd: (type: SectionType) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <Button size="sm" variant="secondary" className="w-full" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        + Add section
      </Button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-paper-raised p-2 shadow-lg">
          <ul>
            {SECTION_TYPES.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(t);
                    setOpen(false);
                  }}
                  className="w-full rounded-md px-3 py-2 text-left text-sm capitalize hover:bg-paper-sunken"
                >
                  {t.replace(/-/g, " ")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SectionTypeBadge({ type }: { type: string }) {
  return <Badge tone="neutral">{type.replace(/-/g, " ")}</Badge>;
}
