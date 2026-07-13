import { applyComplianceFooter, mergeFields } from "./compliance.util";

describe("applyComplianceFooter", () => {
  const sender = { name: "Demo Realty", address: "1 Kimathi St, Nairobi" };

  it("appends an unsubscribe link and the sender address", () => {
    const out = applyComplianceFooter("<p>Hello</p>", {
      unsubscribeUrl: "https://api.test/unsub/abc",
      sender,
    });
    expect(out).toContain("https://api.test/unsub/abc");
    expect(out).toContain("Unsubscribe");
    expect(out).toContain("Kimathi");
  });

  it("escapes HTML in the sender identity", () => {
    const out = applyComplianceFooter("<p>Hi</p>", {
      unsubscribeUrl: "https://api.test/u",
      sender: { name: "<script>x</script>", address: "a" },
    });
    expect(out).not.toContain("<script>x");
    expect(out).toContain("&lt;script&gt;");
  });
});

describe("mergeFields", () => {
  it("substitutes name and custom fields", () => {
    const out = mergeFields("Hi {{name}} from {{company}}", {
      name: "Ada",
      email: "ada@example.com",
      fields: { company: "Acme" },
    });
    expect(out).toBe("Hi Ada from Acme");
  });

  it("falls back to 'there' when name is missing and blanks unknown fields", () => {
    const out = mergeFields("Hi {{name}}, ref {{unknown}}", {
      name: null,
      email: "x@y.com",
    });
    expect(out).toBe("Hi there, ref ");
  });
});
