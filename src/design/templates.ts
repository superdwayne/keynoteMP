/**
 * Presentation template system.
 *
 * Predefined slide sequences for common presentation types.
 * Each template maps a sequence of layout names with content hints,
 * letting users scaffold a full deck from a single command.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlideTemplate {
  /** Layout name from the layout library. */
  layoutName: string;
  /** Human-readable purpose of this slide. */
  purpose: string;
  /** Placeholder hints showing what content the user should provide. */
  suggestedContent: {
    title?: string;
    subtitle?: string;
    body?: string;
    bodyItems?: string[];
  };
}

export interface PresentationTemplate {
  name: string;
  description: string;
  slides: SlideTemplate[];
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

const pitchDeck: PresentationTemplate = {
  name: "pitch-deck",
  description: "10-slide startup pitch deck for investors",
  slides: [
    { layoutName: "title-center", purpose: "Title slide", suggestedContent: { title: "Company Name", subtitle: "One-line description" } },
    { layoutName: "content-left", purpose: "Problem statement", suggestedContent: { title: "The Problem", body: "Describe the pain point..." } },
    { layoutName: "content-right-image", purpose: "Solution overview", suggestedContent: { title: "Our Solution", body: "How you solve it..." } },
    { layoutName: "statistic", purpose: "Market opportunity", suggestedContent: { title: "Market Size" } },
    { layoutName: "content-left-image", purpose: "Product demo / how it works", suggestedContent: { title: "How It Works" } },
    { layoutName: "three-column", purpose: "Business model", suggestedContent: { title: "Business Model" } },
    { layoutName: "comparison", purpose: "Competitive landscape", suggestedContent: { title: "Competitive Advantage" } },
    { layoutName: "roadmap", purpose: "Timeline and milestones", suggestedContent: { title: "Roadmap" } },
    { layoutName: "statistic", purpose: "Funding request / the ask", suggestedContent: { title: "The Ask" } },
    { layoutName: "closing-cta", purpose: "Contact and CTA", suggestedContent: { title: "Let's Talk", subtitle: "Get in touch" } },
  ],
};

const statusUpdate: PresentationTemplate = {
  name: "status-update",
  description: "5-slide team status update",
  slides: [
    { layoutName: "title-center", purpose: "Title slide", suggestedContent: { title: "Status Update", subtitle: "Week of..." } },
    { layoutName: "statistic", purpose: "Key metrics", suggestedContent: { title: "Key Metrics" } },
    { layoutName: "content-left", purpose: "Accomplishments", suggestedContent: { title: "What We Did", bodyItems: ["Shipped feature X", "Fixed bug Y"] } },
    { layoutName: "content-left", purpose: "Blockers & risks", suggestedContent: { title: "Blockers & Risks", bodyItems: ["Waiting on API access", "Timeline risk on Z"] } },
    { layoutName: "timeline", purpose: "Next steps", suggestedContent: { title: "Next Steps" } },
  ],
};

const workshop: PresentationTemplate = {
  name: "workshop",
  description: "8-slide interactive workshop deck",
  slides: [
    { layoutName: "title-bold", purpose: "Workshop title", suggestedContent: { title: "Workshop Title", subtitle: "Facilitator Name" } },
    { layoutName: "content-left", purpose: "Agenda / overview", suggestedContent: { title: "Agenda", bodyItems: ["Topic 1", "Topic 2", "Topic 3"] } },
    { layoutName: "section-break", purpose: "Section 1 break", suggestedContent: { title: "Section 1" } },
    { layoutName: "content-right-image", purpose: "Key concept", suggestedContent: { title: "Key Concept", body: "Explain the concept..." } },
    { layoutName: "section-break", purpose: "Section 2 break", suggestedContent: { title: "Section 2" } },
    { layoutName: "two-column", purpose: "Activity / discussion", suggestedContent: { title: "Activity" } },
    { layoutName: "quote", purpose: "Key takeaway", suggestedContent: { title: "Remember..." } },
    { layoutName: "closing-cta", purpose: "Wrap up & resources", suggestedContent: { title: "Resources & Next Steps" } },
  ],
};

const productLaunch: PresentationTemplate = {
  name: "product-launch",
  description: "7-slide product launch announcement",
  slides: [
    { layoutName: "title-bold", purpose: "Product name reveal", suggestedContent: { title: "Introducing Product", subtitle: "The future of..." } },
    { layoutName: "content-left-image", purpose: "Problem / opportunity", suggestedContent: { title: "Why Now", body: "The market is ready..." } },
    { layoutName: "full-image", purpose: "Product hero shot", suggestedContent: { title: "Meet the Product" } },
    { layoutName: "three-column", purpose: "Key features", suggestedContent: { title: "Key Features" } },
    { layoutName: "before-after", purpose: "Before / after comparison", suggestedContent: { title: "The Difference" } },
    { layoutName: "pricing-table", purpose: "Pricing tiers", suggestedContent: { title: "Pricing" } },
    { layoutName: "closing-cta", purpose: "Launch CTA", suggestedContent: { title: "Get Started Today" } },
  ],
};

// ---------------------------------------------------------------------------
// Exported library
// ---------------------------------------------------------------------------

export const templateLibrary: Record<string, PresentationTemplate> = {
  "pitch-deck": pitchDeck,
  "status-update": statusUpdate,
  "workshop": workshop,
  "product-launch": productLaunch,
};
