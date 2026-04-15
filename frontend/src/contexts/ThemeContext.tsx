import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType 
{
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
//storaing dark or light mode preference in browserstorage
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => 
{
    // Check local storage first, fallback to system preference
    const [theme, setTheme] = useState<Theme>(() => 
    {
        const saved = localStorage.getItem('app-theme') as Theme;
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => 
    {
        // Update the DOM and save to local storage whenever theme changes
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const toggleTheme = () => 
    {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => 
{
    const context = useContext(ThemeContext);
    if (context === undefined) 
    {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
  return context;
};