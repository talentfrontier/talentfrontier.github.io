import { normalizeRows, parseCsvContacts } from "./csv.util";

describe("parseCsvContacts", () => {
  it("parses a basic comma CSV with headers", () => {
    const { contacts, invalid } = parseCsvContacts(
      "email,name,company\nada@example.com,Ada,Acme\nbob@example.com,Bob,Globex",
    );
    expect(invalid).toHaveLength(0);
    expect(contacts).toHaveLength(2);
    expect(contacts[0]).toEqual({
      email: "ada@example.com",
      name: "Ada",
      fields: { company: "Acme" },
    });
  });

  it("lower-cases emails, dedupes, and flags invalid ones", () => {
    const { contacts, invalid } = parseCsvContacts(
      "Email\nADA@Example.com\nada@example.com\nnot-an-email\n",
    );
    expect(contacts.map((c) => c.email)).toEqual(["ada@example.com"]);
    expect(invalid).toContain("not-an-email");
  });

  it("supports semicolon delimiters and quoted fields", () => {
    const { contacts } = parseCsvContacts(
      'email;name\n"jo@example.com";"Jo, the Great"',
    );
    expect(contacts[0].email).toBe("jo@example.com");
    expect(contacts[0].name).toBe("Jo, the Great");
  });

  it("throws when there is no email column", () => {
    expect(() => parseCsvContacts("name,company\nAda,Acme")).toThrow(/email/i);
  });

  it("normalizeRows handles client-parsed xlsx rows", () => {
    const { contacts } = normalizeRows([
      { Email: "ada@example.com", Name: "Ada", City: "Nairobi" },
      { email: "bob@example.com" },
    ]);
    expect(contacts).toHaveLength(2);
    expect(contacts[0].fields).toEqual({ city: "Nairobi" });
  });
});
