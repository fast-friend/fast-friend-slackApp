import GameTemplate from "../models/GameTemplate.model";

/**
 * Get all active game templates
 * @returns Array of game template documents
 */
export const getAllGameTemplates = async () => {
  return await GameTemplate.find({ isActive: true }).sort({ displayName: 1 });
};

/**
 * Get a game template by ID
 * @param templateId - MongoDB ObjectId of the GameTemplate
 * @returns Game template document
 */
export const getGameTemplateById = async (templateId: string) => {
  const template = await GameTemplate.findOne({
    _id: templateId,
    isActive: true,
  });

  if (!template) {
    throw new Error("Game template not found");
  }

  return template;
};

/**
 * Seed initial game templates (run once during setup)
 */
export const seedGameTemplates = async () => {
  const templates = [
    {
      templateName: "discovery",
      displayName: "Discovery",
      description:
        "Get to know your teammates! Match faces to names in this fun icebreaker game.",
      questionFormat: "Who is this person?",
      imageRequired: true,
      minOptions: 4,
      maxOptions: 4,
      icon: "PersonSearch",
      isActive: true,
    },
    {
      templateName: "onboarding",
      displayName: "Onboarding Profile Completion",
      description: "Automatically send profile completion links to team members.",
      questionFormat: "Please complete your profile!",
      imageRequired: false,
      minOptions: 1,
      maxOptions: 1,
      icon: "PersonAdd",
      isActive: true,
    },
  ];

  for (const template of templates) {
    await GameTemplate.findOneAndUpdate(
      { templateName: template.templateName },
      template,
      { upsert: true, new: true }
    );
  }

  console.log(`Seeded/Verified ${templates.length} game template(s).`);
};
