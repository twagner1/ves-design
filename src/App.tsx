import { ReactFlowProvider } from 'reactflow';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Parameters from './components/Parameters';
import LiveStats from './components/LiveStats';
import Timeline from './components/Timeline';
import BillOfMaterials from './components/BillOfMaterials';
import Inspector from './components/Inspector';
import './App.css';

export default function App() {
  return (
    <ReactFlowProvider>
      <div className="app">
        <Sidebar />
        <main className="workspace">
          <Toolbar />
          <Canvas />
        </main>
        <aside className="rightpane">
          <Parameters />
          <LiveStats />
          <Timeline />
          <Inspector />
          <BillOfMaterials />
        </aside>
      </div>
    </ReactFlowProvider>
  );
}
