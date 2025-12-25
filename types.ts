
export interface Ingredient {
  id: string;
  name: string;
  possibleAlternates: string[];
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredientsNeeded: string[];
  instructions: string[];
}

export type AppState = 'IDLE' | 'ANALYZING' | 'EDITING' | 'GENERATING' | 'RESULTS';
