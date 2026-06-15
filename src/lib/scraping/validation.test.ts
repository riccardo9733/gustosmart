import { describe, it, expect, vi } from 'vitest';
import { validateAndFormatRecipe } from './validation';

describe('validateAndFormatRecipe', () => {
  const validGeminiOutput = {
    title: 'Pasta alla Carbonara',
    sourceLanguage: 'it',
    servings: 2,
    ingredients: [
      { name: 'Spaghetti', quantity: 200, unit: 'g' },
      { name: 'Guanciale', quantity: 150, unit: 'g' },
      { name: 'Pecorino Romano', quantity: 50, unit: 'g' },
      { name: 'Tuorli d\'uovo', quantity: 4, unit: 'pz' },
      { name: 'Sale e Pepe' } // test fallback for quantity/unit
    ],
    instructions: [
      'Cuocere la pasta',
      'Rosolare il guanciale',
      'Mescolare uova e formaggio',
      'Amalgamare il tutto'
    ],
    prepTimeMinutes: 25,
    category: 'primi', // will be normalized to first_courses
    kcal: 750,
    proteins: 25,
    carbs: 80,
    fats: 35,
    fiber: 2,
    sugar: 1,
    nutritionalRating: 'c', // will be normalized to C
    nutritionalAssessment: 'Piatto calorico e saporito',
    isGlutenFree: false,
    isVegan: false,
    isVegetarian: false,
    isLactoseFree: false
  };

  const sourceUrl = 'https://example.com/carbonara';
  const imageUrl = 'https://example.com/carbonara.jpg';
  const creatorInfo = {
    username: 'chef_riccardo',
    fullName: 'Riccardo Rossi',
    id: 'user_123'
  };

  it('validates and formats a correct recipe successfully', () => {
    const result = validateAndFormatRecipe(validGeminiOutput, sourceUrl, imageUrl, creatorInfo);

    expect(result.title).toBe('Pasta alla Carbonara');
    expect(result.category).toBe('first_courses');
    expect(result.nutritionalRating).toBe('C');
    expect(result.sourceUrl).toBe(sourceUrl);
    expect(result.imageUrl).toBe(imageUrl);
    expect(result.creatorUsername).toBe('chef_riccardo');
    expect(result.creatorFullName).toBe('Riccardo Rossi');
    expect(result.creatorId).toBe('user_123');

    // Ingredients check
    expect(result.ingredients[0]).toEqual({ name: 'Spaghetti', quantity: 200, unit: 'g' });
    expect(result.ingredients[4]).toEqual({ name: 'Sale e Pepe', quantity: null, unit: 'q.b.' }); // fallback values
  });

  it('correctly maps various category inputs to the enum values', () => {
    const testCases = [
      { input: 'secondi piatti', expected: 'second_courses' },
      { input: 'Dolce', expected: 'desserts' },
      { input: 'antipasto', expected: 'appetizers' },
      { input: 'contorni', expected: 'sides' },
      { input: 'piatto_unico', expected: 'single_dishes' },
      { input: 'unknown-category', expected: 'other' },
      { input: null, expected: 'other' }
    ];

    testCases.forEach(({ input, expected }) => {
      const output = validateAndFormatRecipe({ ...validGeminiOutput, category: input }, sourceUrl, imageUrl);
      expect(output.category).toBe(expected);
    });
  });

  it('throws an error if required fields are missing', () => {
    const invalidOutput = { ...validGeminiOutput, title: '' }; // Title is required and must be min 1 char

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => validateAndFormatRecipe(invalidOutput, sourceUrl, imageUrl)).toThrow(
      "Il JSON generato dall'IA non rispetta lo schema richiesto:"
    );

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('throws an error if sourceUrl is invalid', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => validateAndFormatRecipe(validGeminiOutput, 'not-a-valid-url', imageUrl)).toThrow(
      "Il JSON generato dall'IA non rispetta lo schema richiesto:"
    );

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
