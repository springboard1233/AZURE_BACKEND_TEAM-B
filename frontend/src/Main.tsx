// import React from "react";
// import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
// import Overview from "./pages/Overview";
// import Analytics from "./pages/Analytics";
// import MergedData from "./pages/MergedData";

// const App: React.FC = () => {
//   return (
//     <Router>
//       <div className="flex">
//         {/* Sidebar */}
//         <div className="w-60 bg-gray-900 text-white h-screen p-4">
//           <h2 className="text-xl font-bold mb-4">Dashboard</h2>
//           <ul>
//             <li><Link to="/" className="block p-2 hover:bg-gray-700 rounded">Overview</Link></li>
//             <li><Link to="/analytics" className="block p-2 hover:bg-gray-700 rounded">Analytics</Link></li>
//             <li><Link to="/merged-data" className="block p-2 hover:bg-gray-700 rounded">Merged Data</Link></li>
//           </ul>
//         </div>

//         {/* Main Content */}
//         <div className="flex-1 p-6">
//           <Routes>
//             <Route path="/" element={<Overview />} />
//             <Route path="/analytics" element={<Analytics />} />
//             <Route path="/merged-data" element={<MergedData />} />
//           </Routes>
//         </div>
//       </div>
//     </Router>
//   );
// };

// export default App;
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import Analytics from './pages/Analytics';
import RawData from './pages/RawData';
import MergedData from './pages/MergedData';

const Main: React.FC = () => {
  return (
    <Router>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 bg-gray-800 text-white min-h-screen">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/raw-data" element={<RawData />} />
            <Route path="/merged-data" element={<MergedData />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default Main;
