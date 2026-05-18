import { addStoreItem } from "./stores.js";

export async function addFeedback(projectDir: string, title: string, content: string) {
  return addStoreItem(projectDir, "feedback", title, content);
}
