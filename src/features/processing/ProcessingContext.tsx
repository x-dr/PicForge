import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  defaults,
  normalizePipeline,
  type PipelineSettings,
  type ProcessingMode,
} from './model';
import { useProcessingJobs } from './use-processing-jobs';
function useTool() {
  const [settings, setSettings] = useState(defaults);
  const [selectedId, select] = useState('');
  const jobs = useProcessingJobs();
  const patch = (input: Partial<PipelineSettings>) =>
    setSettings((s) => normalizePipeline({ ...s, ...input }));
  return { settings, patch, selectedId, select, jobs };
}
const Context = createContext<Record<
  ProcessingMode,
  ReturnType<typeof useTool>
> | null>(null);
export function ProcessingProvider({ children }: { children: ReactNode }) {
  const transform = useTool();
  const convert = useTool();
  const batch = useTool();
  return (
    <Context.Provider value={{ transform, convert, batch }}>
      {children}
    </Context.Provider>
  );
}
export function useProcessing(mode: ProcessingMode) {
  const value = useContext(Context);
  if (!value) throw new Error('ProcessingProvider missing');
  return value[mode];
}
