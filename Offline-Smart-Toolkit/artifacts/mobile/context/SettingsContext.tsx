// Global settings context — language, print size, default folder.
// Theme is handled separately by ThemeContext (already wired).
import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import {
  loadAllSettings,
  setLanguage, setPrintSize, setDefaultFolder,
  type LanguageValue, type PrintSizeValue, type DefaultFolderValue,
  DEFAULTS,
} from '@/lib/features/settings/SettingsService';

interface SettingsContextType {
  language:      LanguageValue;
  printSize:     PrintSizeValue;
  defaultFolder: DefaultFolderValue;
  setLanguage:   (v: LanguageValue)      => Promise<void>;
  setPrintSize:  (v: PrintSizeValue)     => Promise<void>;
  setDefaultFolder: (v: DefaultFolderValue) => Promise<void>;
  isReady: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  language:      DEFAULTS.language,
  printSize:     DEFAULTS.printSize,
  defaultFolder: DEFAULTS.defaultFolder,
  setLanguage:   async () => {},
  setPrintSize:  async () => {},
  setDefaultFolder: async () => {},
  isReady: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language,      setLang]   = useState<LanguageValue>(DEFAULTS.language);
  const [printSize,     setPrint]  = useState<PrintSizeValue>(DEFAULTS.printSize);
  const [defaultFolder, setFolder] = useState<DefaultFolderValue>(DEFAULTS.defaultFolder);
  const [isReady,       setReady]  = useState(false);

  useEffect(() => {
    loadAllSettings()
      .then((s) => {
        setLang(s.language);
        setPrint(s.printSize);
        setFolder(s.defaultFolder);
      })
      .catch(() => {
        // Use defaults if AsyncStorage fails
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  const handleSetLanguage = useCallback(async (v: LanguageValue) => {
    await setLanguage(v);
    setLang(v);
  }, []);

  const handleSetPrintSize = useCallback(async (v: PrintSizeValue) => {
    await setPrintSize(v);
    setPrint(v);
  }, []);

  const handleSetDefaultFolder = useCallback(async (v: DefaultFolderValue) => {
    await setDefaultFolder(v);
    setFolder(v);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        language,
        printSize,
        defaultFolder,
        setLanguage:      handleSetLanguage,
        setPrintSize:     handleSetPrintSize,
        setDefaultFolder: handleSetDefaultFolder,
        isReady,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
