"use client";

import React from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { ANIMATION_PRESETS, type StoryDocument, type StorySection } from "@/lib/story/schema";

/* =========================================================================
   Right-hand properties panel.
   Everything here edits the selected section (or global story settings) and
   flows through the editor reducer, so each change is undoable.
   ========================================================================= */

const SPACING = ["none", "sm", "md", "lg", "xl"];
const WIDTHS = ["narrow", "wide", "full", "bleed"];

export function PropertiesPanel({
  doc,
  section,
  onChange,
  onMetaChange,
  onReplaceMedia,
}: {
  doc: StoryDocument;
  section: StorySection | null;
  onChange: (patch: Partial<StorySection>) => void;
  onMetaChange: (patch: Partial<StoryDocument>) => void;
  onReplaceMedia: () => void;
}) {
  const [tab, setTab] = React.useState<"section" | "story">("section");

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-line" role="tablist" aria-label="Properties">
        {(["section", "story"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 px-3 py-2.5 text-sm font-medium capitalize",
              tab === t ? "border-b-2 border-accent text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "section" ? (
          section ? (
            <SectionProps section={section} onChange={onChange} onReplaceMedia={onReplaceMedia} />
          ) : (
            <p className="text-sm text-ink-faint">Select a section on the canvas to edit it.</p>
          )
        ) : (
          <StoryProps doc={doc} onMetaChange={onMetaChange} />
        )}
      </div>
    </div>
  );
}

function SectionProps({
  section,
  onChange,
  onReplaceMedia,
}: {
  section: StorySection;
  onChange: (patch: Partial<StorySection>) => void;
  onReplaceMedia: () => void;
}) {
  return (
    <div className="space-y-6">
      <Group title="Content">
        <Field label="Eyebrow">
          <Input value={section.eyebrow ?? ""} onChange={(e) => onChange({ eyebrow: e.target.value })} />
        </Field>
        <Field label="Heading">
          <Input value={section.heading ?? ""} onChange={(e) => onChange({ heading: e.target.value })} />
        </Field>
        <Field label="Subheading">
          <Input value={section.subheading ?? ""} onChange={(e) => onChange({ subheading: e.target.value })} />
        </Field>
        {("content" in section || ["rich-text", "quote", "cta", "faq"].includes(section.type)) && (
          <Field label="Body" hint="Supports **bold**, *italic*, `code`, [links](url) and lists.">
            <Textarea
              rows={6}
              value={section.content ?? ""}
              onChange={(e) => onChange({ content: e.target.value })}
            />
          </Field>
        )}
      </Group>

      <Group title="Layout">
        <Field label="Width">
          <Select value={section.layout.width} onChange={(e) => onChange({ layout: { ...section.layout, width: e.target.value as never } })}>
            {WIDTHS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Columns">
          <Select value={section.layout.columns} onChange={(e) => onChange({ layout: { ...section.layout, columns: e.target.value as never } })}>
            {["1", "2", "3", "split"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Alignment">
          <Select value={section.layout.align} onChange={(e) => onChange({ layout: { ...section.layout, align: e.target.value as never } })}>
            {["left", "center", "right"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Media position">
          <Select
            value={section.layout.mediaPosition}
            onChange={(e) => onChange({ layout: { ...section.layout, mediaPosition: e.target.value as never } })}
          >
            {["left", "right", "top", "bottom", "background"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </Group>

      <Group title="Spacing">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Top">
            <Select value={section.spacing.top} onChange={(e) => onChange({ spacing: { ...section.spacing, top: e.target.value as never } })}>
              {SPACING.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bottom">
            <Select value={section.spacing.bottom} onChange={(e) => onChange({ spacing: { ...section.spacing, bottom: e.target.value as never } })}>
              {SPACING.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Group>

      <Group title="Background">
        <Field label="Type">
          <Select value={section.background.type} onChange={(e) => onChange({ background: { ...section.background, type: e.target.value as never } })}>
            {["none", "color", "image", "video", "gradient"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        {section.background.type === "color" && (
          <Field label="Colour">
            <ColorInput
              value={section.background.color ?? "#171614"}
              onChange={(v) => onChange({ background: { ...section.background, color: v } })}
            />
          </Field>
        )}
        {section.background.type === "gradient" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <ColorInput
                value={section.background.gradient?.from ?? "#b4622b"}
                onChange={(v) =>
                  onChange({
                    background: {
                      ...section.background,
                      gradient: { from: v, to: section.background.gradient?.to ?? "#f0e2d5", angle: section.background.gradient?.angle ?? 160 },
                    },
                  })
                }
              />
            </Field>
            <Field label="To">
              <ColorInput
                value={section.background.gradient?.to ?? "#f0e2d5"}
                onChange={(v) =>
                  onChange({
                    background: {
                      ...section.background,
                      gradient: { from: section.background.gradient?.from ?? "#b4622b", to: v, angle: section.background.gradient?.angle ?? 160 },
                    },
                  })
                }
              />
            </Field>
          </div>
        )}
        {(section.background.type === "image" || section.background.type === "video") && (
          <div className="space-y-3">
            <AssetButton onClick={onReplaceMedia}>Choose from assets</AssetButton>
            <Field label="Overlay">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={section.background.overlay}
                onChange={(e) => onChange({ background: { ...section.background, overlay: Number(e.target.value) } })}
                className="w-full"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={section.background.fixed}
                onChange={(e) => onChange({ background: { ...section.background, fixed: e.target.checked } })}
              />
              Fixed (sticky) background
            </label>
          </div>
        )}
      </Group>

      <Group title="Media">
        <p className="text-xs text-ink-soft">
          {section.media.length} image{section.media.length === 1 ? "" : "s"} attached
        </p>
        <AssetButton onClick={onReplaceMedia}>Replace / add image</AssetButton>
        {section.media[0] && (
          <Field label="Alt text">
            <Input
              value={section.media[0].alt}
              onChange={(e) =>
                onChange({
                  media: section.media.map((m, i) => (i === 0 ? { ...m, alt: e.target.value } : m)),
                })
              }
            />
          </Field>
        )}
      </Group>

      <Group title="Animation">
        <Field label="Preset">
          <Select value={section.animation.preset} onChange={(e) => onChange({ animation: { ...section.animation, preset: e.target.value as never } })}>
            {ANIMATION_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mode">
          <Select value={section.animation.mode} onChange={(e) => onChange({ animation: { ...section.animation, mode: e.target.value as never } })}>
            <option value="in-view">In view (on scroll into viewport)</option>
            <option value="scroll-linked">Scroll-linked (driven by position)</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Duration (${section.animation.duration}ms)`}>
            <input
              type="range"
              min={0}
              max={2000}
              step={50}
              value={section.animation.duration}
              onChange={(e) => onChange({ animation: { ...section.animation, duration: Number(e.target.value) } })}
              className="w-full"
            />
          </Field>
          <Field label={`Distance (${section.animation.distance}px)`}>
            <input
              type="range"
              min={0}
              max={200}
              step={10}
              value={section.animation.distance}
              onChange={(e) => onChange({ animation: { ...section.animation, distance: Number(e.target.value) } })}
              className="w-full"
            />
          </Field>
        </div>
      </Group>

      <Group title="Responsive">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={section.responsive.hideOnMobile} onChange={(e) => onChange({ responsive: { ...section.responsive, hideOnMobile: e.target.checked } })} />
          Hide on mobile
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={section.responsive.hideOnDesktop} onChange={(e) => onChange({ responsive: { ...section.responsive, hideOnDesktop: e.target.checked } })} />
          Hide on desktop
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={section.responsive.stackOnMobile} onChange={(e) => onChange({ responsive: { ...section.responsive, stackOnMobile: e.target.checked } })} />
          Stack on mobile
        </label>
      </Group>

      <Group title="Interaction">
        <Field label="Type">
          <Select value={section.interaction.type} onChange={(e) => onChange({ interaction: { ...section.interaction, type: e.target.value as never } })}>
            {["none", "cta", "form", "external-link", "scroll-to", "lightbox"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        {section.interaction.type !== "none" && (
          <>
            <Field label="Label">
              <Input
                value={section.interaction.label ?? ""}
                onChange={(e) => onChange({ interaction: { ...section.interaction, label: e.target.value } })}
              />
            </Field>
            {section.interaction.type !== "form" && (
              <Field label="Destination" hint="https://, mailto: or a relative path">
                <Input
                  value={section.interaction.href ?? ""}
                  onChange={(e) => onChange({ interaction: { ...section.interaction, href: e.target.value } })}
                />
              </Field>
            )}
          </>
        )}
      </Group>
    </div>
  );
}

function StoryProps({
  doc,
  onMetaChange,
}: {
  doc: StoryDocument;
  onMetaChange: (patch: Partial<StoryDocument>) => void;
}) {
  return (
    <div className="space-y-6">
      <Group title="Details">
        <Field label="Title">
          <Input value={doc.title} onChange={(e) => onMetaChange({ title: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea rows={3} value={doc.description} onChange={(e) => onMetaChange({ description: e.target.value })} />
        </Field>
        <Field label="Slug" hint="Used in the public URL: /s/your-slug">
          <Input value={doc.slug} onChange={(e) => onMetaChange({ slug: e.target.value })} />
        </Field>
      </Group>

      <Group title="Theme">
        <Field label="Theme preset">
          <Select value={doc.theme} onChange={(e) => onMetaChange({ theme: e.target.value as never })}>
            {["editorial", "cinematic", "minimal", "bold", "paper"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Display font">
          <Select
            value={doc.typography.displayFont}
            onChange={(e) => onMetaChange({ typography: { ...doc.typography, displayFont: e.target.value as never } })}
          >
            {["serif", "sans", "mono"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paper">
            <ColorInput value={doc.palette.paper} onChange={(v) => onMetaChange({ palette: { ...doc.palette, paper: v } })} />
          </Field>
          <Field label="Ink">
            <ColorInput value={doc.palette.ink} onChange={(v) => onMetaChange({ palette: { ...doc.palette, ink: v } })} />
          </Field>
          <Field label="Accent">
            <ColorInput value={doc.palette.accent} onChange={(v) => onMetaChange({ palette: { ...doc.palette, accent: v } })} />
          </Field>
          <Field label="Line">
            <ColorInput value={doc.palette.line} onChange={(v) => onMetaChange({ palette: { ...doc.palette, line: v } })} />
          </Field>
        </div>
      </Group>

      <Group title="Navigation">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={doc.navigation.showProgress} onChange={(e) => onMetaChange({ navigation: { ...doc.navigation, showProgress: e.target.checked } })} />
          Show reading progress bar
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={doc.navigation.showBackToTop} onChange={(e) => onMetaChange({ navigation: { ...doc.navigation, showBackToTop: e.target.checked } })} />
          Show back-to-top control
        </label>
      </Group>

      <Group title="SEO">
        <Field label="Meta title">
          <Input value={doc.seo.title} onChange={(e) => onMetaChange({ seo: { ...doc.seo, title: e.target.value } })} />
        </Field>
        <Field label="Meta description">
          <Textarea rows={3} value={doc.seo.description} onChange={(e) => onMetaChange({ seo: { ...doc.seo, description: e.target.value } })} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={doc.seo.noIndex} onChange={(e) => onMetaChange({ seo: { ...doc.seo, noIndex: e.target.checked } })} />
          Ask search engines not to index
        </label>
      </Group>

      <Group title="Footer">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={doc.footer.showBranding} onChange={(e) => onMetaChange({ footer: { ...doc.footer, showBranding: e.target.checked } })} />
          Show &ldquo;Made with Scrollwright&rdquo; badge
        </label>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="eyebrow mb-1">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[0.7rem] text-ink-faint">{hint}</p>}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Colour picker"
        className="h-9 w-10 shrink-0 cursor-pointer rounded border border-line bg-paper-raised"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} aria-label="Hex colour" />
    </div>
  );
}

function AssetButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
    >
      {children}
    </button>
  );
}
