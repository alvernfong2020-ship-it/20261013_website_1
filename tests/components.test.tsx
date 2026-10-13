import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Accordion } from "@/components/marketing/Accordion";
import { SiteHeader } from "@/components/marketing/SiteHeader";

describe("Accordion accessibility", () => {
  const items = [
    { question: "Is coding required?", answer: "No — the editor is visual." },
    { question: "Can I use a custom domain?", answer: "Yes, on paid plans." },
  ];

  it("marks the first item open and toggles others via the button", async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);

    const first = screen.getByRole("button", { name: /Is coding required\?/ });
    const second = screen.getByRole("button", { name: /Can I use a custom domain\?/ });
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "false");

    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");
    // Answer region is now visible.
    expect(screen.getByText(/Yes, on paid plans\./)).toBeVisible();
  });

  it("keeps answer text in the DOM for crawlers", () => {
    render(<Accordion items={items} />);
    expect(screen.getByText(/the editor is visual/)).toBeInTheDocument();
  });
});

describe("SiteHeader responsive navigation", () => {
  it("exposes the mobile menu button and toggles the nav landmark", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: /menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const mobileNav = screen.getByRole("navigation", { name: /mobile/i });
    expect(within(mobileNav).getByRole("link", { name: "Pricing" })).toBeInTheDocument();
  });

  it("shows a sign-in link when signed out and a studio link when signed in", () => {
    const { rerender } = render(<SiteHeader signedIn={false} />);
    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
    rerender(<SiteHeader signedIn />);
    expect(screen.getAllByRole("link", { name: /open studio/i }).length).toBeGreaterThan(0);
  });
});
