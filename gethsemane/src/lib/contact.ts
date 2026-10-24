export const contactTopics = ["sales", "support", "custom", "wholesale", "other"] as const;
export type ContactTopic = (typeof contactTopics)[number];
