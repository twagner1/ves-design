import { ReactFlowProvider } from 'reactflow';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import Parameters from './components/Parameters';
import LiveStats from './components/LiveStats';
import BillOfMaterials from './components/BillOfMaterials';
import NodeInspector from './components/NodeInspector';
import './App.css';

export default function App() {
  return (
    <ReactFlowProvider>
      <div className="app">
        <Sidebar />
        <main className="workspace">
          <Canvas />
        </main>
        <aside className="rightpane">
          <Parameters />
          <LiveStats />
          <NodeInspector />
          <BillOfMaterials />
        </aside>
      </div>
    </ReactFlowProvider>
  );
}
