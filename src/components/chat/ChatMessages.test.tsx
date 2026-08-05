import { render, screen } from "@testing-library/react";
import { ChatMessages } from "./ChatMessages";

beforeEach(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

describe("ChatMessages", () => {
  it("shows empty state when no messages", () => {
    render(<ChatMessages messages={[]} loading={false} />);

    expect(screen.getByText("Send a message to get started.")).toBeInTheDocument();
  });

  it("does not show empty state when loading with no messages", () => {
    render(<ChatMessages messages={[]} loading={true} />);

    expect(screen.queryByText("Send a message to get started.")).not.toBeInTheDocument();
  });

  it("renders user messages on the right", () => {
    render(<ChatMessages messages={[{ role: "user", content: "Hi" }]} loading={false} />);

    expect(screen.getByText("Hi")).toBeInTheDocument();
    expect(screen.getByText("V")).toBeInTheDocument();
  });

  it("renders assistant messages on the left", () => {
    render(<ChatMessages messages={[{ role: "assistant", content: "Hello" }]} loading={false} />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("renders both user and assistant messages", () => {
    render(
      <ChatMessages
        messages={[
          { role: "user", content: "Hi" },
          { role: "assistant", content: "How can I help?" },
        ]}
        loading={false}
      />
    );

    expect(screen.getByText("Hi")).toBeInTheDocument();
    expect(screen.getByText("How can I help?")).toBeInTheDocument();
  });

  it("shows timestamp when provided", () => {
    render(
      <ChatMessages
        messages={[{ role: "user", content: "Hi", timestamp: "2025-06-01T10:30:00" }]}
        loading={false}
      />
    );

    expect(screen.getByText("10:30")).toBeInTheDocument();
  });

  it("shows typing indicator when loading", () => {
    render(<ChatMessages messages={[{ role: "user", content: "Hi" }]} loading={true} />);

    const dots = document.querySelectorAll(".animate-bounce");
    expect(dots.length).toBe(3);
  });

  it("does not show typing indicator when not loading", () => {
    render(<ChatMessages messages={[]} loading={false} />);

    const dots = document.querySelectorAll(".animate-bounce");
    expect(dots.length).toBe(0);
  });
});
