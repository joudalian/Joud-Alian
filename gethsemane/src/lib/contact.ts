export const contactTopics = ["sales", "support", "custom", "wholesale", "other"] as const;
export type ContactTopic = (typeof contactTopics)[number];

/** English first line of every contact prefill, so the owner sees the topic whatever language the visitor uses. */
export const contactSubjects: Record<ContactTopic, string> = {
  sales: "Question about a piece",
  support: "Help with an order",
  custom: "Custom or engraved piece",
  wholesale: "Wholesale enquiry",
  other: "General question",
};
