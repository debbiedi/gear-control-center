// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OptionList } from "./OptionList";

const OPTIONS = [
  { value: "system", label: "Match the system" },
  { value: "en", label: "English" },
  { value: "tr", label: "Türkçe" },
];

afterEach(cleanup);

describe("OptionList", () => {
  it("marks the chosen option for a screen reader, not only visually", () => {
    render(
      <OptionList options={OPTIONS} value="tr" onChange={() => {}} label="Language" />,
    );
    const chosen = screen.getByRole("radio", { name: "Türkçe" });
    expect(chosen.getAttribute("aria-checked")).toBe("true");
    expect(
      screen.getByRole("radio", { name: "English" }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("reports the value rather than the index", () => {
    const onChange = vi.fn();
    render(
      <OptionList options={OPTIONS} value="system" onChange={onChange} label="Language" />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("is a group a keyboard can find", () => {
    render(
      <OptionList options={OPTIONS} value="en" onChange={() => {}} label="Language" />,
    );
    expect(screen.getByRole("radiogroup", { name: "Language" })).toBeTruthy();
  });
});
