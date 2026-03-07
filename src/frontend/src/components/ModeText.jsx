import { useMode } from '../contexts/ModeContext.jsx';
import light from '../copy/light.json';
import shadow from '../copy/shadow.json';

export default function ModeText({ id }) {
  const { mode } = useMode();
  const dict = mode === 'SHADOW' ? shadow : light;
  return dict[id] ?? id;
}
