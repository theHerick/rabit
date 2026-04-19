/**
 * Skills database.
 * Persistent storage for user-created skill definitions.
 */

export interface Skill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  language?: string;
  usageCount?: number;
  createdAt: string;
}

/**
 * List all skills saved by the user.
 */
export async function listSkills(): Promise<Skill[]> {
  // TODO: Implement skills persistence.
  // For now, return an empty list.
  return [];
}

/**
 * Delete a skill by ID.
 */
export async function deleteSkill(id: string): Promise<void> {
  // TODO: Implement skill deletion.
}

/**
 * Create or update a skill.
 */
export async function saveSkill(skill: Skill): Promise<void> {
  // TODO: Implement skill saving.
}
