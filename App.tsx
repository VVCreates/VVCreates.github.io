
import React, { useState, useRef } from 'react';
import { Layout } from './components/Layout';
import { AppState, Ingredient, Recipe } from './types';
import { analyzeFridgeImage, generateRecipes } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('IDLE');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    const readers = Array.from(files).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
    });

    try {
      const base64Results = await Promise.all(readers);
      setCapturedImages(prev => [...prev, ...base64Results]);
    } catch (err) {
      setError('Failed to process one or more images.');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartAnalysis = async () => {
    if (capturedImages.length === 0) return;
    setState('ANALYZING');
    setError(null);

    try {
      const detected = await analyzeFridgeImage(capturedImages);
      setIngredients(detected);
      setState('EDITING');
    } catch (err) {
      setError('Failed to analyze images. Please try again.');
      setState('IDLE');
    }
  };

  const handleAddIngredient = () => {
    const newIng: Ingredient = {
      id: `manual-${Date.now()}`,
      name: 'New Item',
      possibleAlternates: []
    };
    setIngredients([...ingredients, newIng]);
  };

  const updateIngredientName = (id: string, name: string) => {
    setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, name } : ing));
  };

  const swapIngredient = (id: string, newName: string) => {
    setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, name: newName } : ing));
  };

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  const handleGenerateRecipes = async () => {
    setState('GENERATING');
    try {
      const ingredientNames = ingredients.map(i => i.name);
      const results = await generateRecipes(ingredientNames);
      setRecipes(results);
      setState('RESULTS');
    } catch (err) {
      setError('Failed to generate recipes.');
      setState('EDITING');
    }
  };

  const handleMoreSuggestions = async () => {
    setState('GENERATING');
    try {
      const ingredientNames = ingredients.map(i => i.name);
      const existingTitles = recipes.map(r => r.title);
      const moreResults = await generateRecipes(ingredientNames, existingTitles);
      setRecipes(prev => [...prev, ...moreResults]);
      setState('RESULTS');
    } catch (err) {
      setError('Failed to get more suggestions.');
      setState('RESULTS');
    }
  };

  const reset = () => {
    setIngredients([]);
    setRecipes([]);
    setCapturedImages([]);
    setState('IDLE');
  };

  return (
    <Layout>
      {state === 'IDLE' && (
        <div className="h-full flex flex-col items-center animate-fade-in py-6 space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Build Ingredients List</h2>
            <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed px-4">
              Take or upload images of your fridge, freezer, pantry, or anywhere else you may store food!
            </p>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            {capturedImages.map((img, idx) => (
              <div key={idx} className="aspect-square relative rounded-2xl overflow-hidden bg-slate-100 group shadow-sm ring-1 ring-slate-100">
                <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover" alt={`Kitchen part ${idx}`} />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 bg-white/90 backdrop-blur-md text-amber-600 p-1.5 rounded-full shadow-lg active:scale-90 border border-amber-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            
            {capturedImages.length < 10 && (
              <>
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center gap-2 hover:border-amber-400 hover:bg-amber-100/20 transition-all text-amber-600 active:scale-95 group"
                >
                  <div className="p-3 rounded-full bg-white border border-amber-200 shadow-md shadow-amber-100 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest mt-1">Camera</span>
                </button>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-amber-400 hover:bg-slate-50 transition-all text-slate-400 hover:text-amber-600 active:scale-95 group"
                >
                  <div className="p-3 rounded-full bg-slate-50 border border-slate-100 group-hover:bg-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest mt-1">Upload</span>
                </button>
              </>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent max-w-md mx-auto z-20">
            <button 
              disabled={capturedImages.length === 0}
              onClick={handleStartAnalysis}
              className={`w-full py-4.5 px-8 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 font-black uppercase tracking-widest ${
                capturedImages.length > 0 
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 shadow-amber-200 hover:brightness-105' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              Analyze Items ({capturedImages.length})
            </button>
          </div>

          <input type="file" ref={cameraInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />
        </div>
      )}

      {(state === 'ANALYZING' || state === 'GENERATING') && (
        <div className="flex flex-col items-center justify-center py-24 space-y-8">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-amber-100 border-t-amber-400 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-12 h-12 bg-white border border-amber-200 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                 <div className="w-4 h-4 bg-amber-400 rounded-full"></div>
               </div>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
              {state === 'ANALYZING' ? 'Processing Items' : 'Crafting Menu'}
            </h3>
            <p className="text-sm font-medium text-amber-600 mt-2 animate-pulse">Consulting the culinary experts...</p>
          </div>
        </div>
      )}

      {state === 'EDITING' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Detected Items</h2>
            <button 
              onClick={handleAddIngredient}
              className="text-amber-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-4 py-2 rounded-full shadow-sm active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          <div className="space-y-3 pb-40">
            {ingredients.map(ing => (
              <div key={ing.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:border-amber-400/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] group-hover:scale-125 transition-transform"></div>
                  <input 
                    type="text" 
                    value={ing.name}
                    onChange={(e) => updateIngredientName(ing.id, e.target.value)}
                    className="flex-1 bg-transparent font-bold text-lg text-slate-800 border-none focus:ring-0 p-0 placeholder-slate-200"
                  />
                  <button onClick={() => removeIngredient(ing.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                {ing.possibleAlternates.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest border-r border-slate-100 pr-2 mr-1">Correction?</span>
                    {ing.possibleAlternates.map(alt => (
                      <button 
                        key={alt}
                        onClick={() => swapIngredient(ing.id, alt)}
                        className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:border-amber-400 hover:text-amber-600 transition-all shadow-sm"
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDFDFD] via-[#FDFDFD] to-transparent max-w-md mx-auto z-20">
            <button 
              onClick={handleGenerateRecipes}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 text-slate-900 font-black py-5 rounded-2xl shadow-xl shadow-amber-200/50 transition-all flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest"
            >
              Suggest Meals
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {state === 'RESULTS' && (
        <div className="space-y-8 animate-fade-in pb-20">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Curated Menu</h2>
            <button onClick={reset} className="text-amber-600 text-xs font-black uppercase tracking-widest active:scale-90 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">Reset</button>
          </div>

          <div className="space-y-8">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 hover:shadow-amber-900/5 transition-shadow">
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter">{recipe.title}</h3>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="bg-amber-100 border border-amber-200 text-amber-700 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                        {recipe.difficulty}
                      </span>
                      <span className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-widest">{recipe.prepTime}</span>
                    </div>
                  </div>
                  
                  <p className="text-slate-600 text-sm leading-relaxed font-medium italic">"{recipe.description}"</p>
                  
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <span className="w-4 h-px bg-amber-300"></span>
                      Required Pantry
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {recipe.ingredientsNeeded.map(item => (
                        <span key={item} className="bg-slate-50 text-slate-700 border border-slate-100 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <details className="group border-t border-slate-50 mt-4">
                    <summary className="list-none flex items-center justify-between cursor-pointer py-4">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Instructions</span>
                      <div className="p-2 rounded-full bg-slate-50 group-open:bg-amber-100 transition-colors border border-slate-100 group-open:border-amber-200">
                        <svg className="w-4 h-4 text-slate-400 group-open:text-amber-600 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <ol className="mt-4 space-y-6 border-l-2 border-amber-100 ml-3 pl-6">
                      {recipe.instructions.map((step, sIdx) => (
                        <li key={sIdx} className="relative">
                          <span className="absolute -left-[2.1rem] top-0 w-8 h-8 bg-white border border-amber-200 text-amber-600 flex items-center justify-center rounded-xl text-xs font-black shadow-md">
                            {sIdx + 1}
                          </span>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>
              </div>
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent max-w-md mx-auto z-20">
            <button 
              onClick={handleMoreSuggestions}
              className="w-full bg-white border-2 border-amber-400 text-amber-600 font-black py-5 rounded-2xl shadow-xl shadow-amber-100/50 transition-all flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest mb-safe"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Discover More
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-24 left-6 right-6 bg-white border border-red-100 p-5 rounded-2xl flex items-start gap-4 z-50 animate-bounce shadow-2xl">
          <div className="bg-red-50 p-2 rounded-lg">
            <svg className="w-6 h-6 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black text-red-600 uppercase tracking-widest">Notice</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-slate-300 hover:text-slate-600">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
          </button>
        </div>
      )}
    </Layout>
  );
};

export default App;
