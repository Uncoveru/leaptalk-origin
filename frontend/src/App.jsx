import React from "react";
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";
import HomePage from "./pages/HomePage";
import ChatPage from "@/pages/ChatPage.jsx";
import ScenarioSelPage from "@/pages/ScenarioSelPage";
import SummaryPage from "@/pages/SummaryPage.jsx";
import {ErrorBoundary} from "@/components/Common/ErrorBoundary.jsx";

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          {/* 首页 */}
          <Route path="/" element={<HomePage/>}/>
          {/* 自由对话页面 */}
          <Route path="/chat" element={<ChatPage/>}/>
          {/* 情景演练页面 */}
          <Route path="/scenario" element={<ScenarioSelPage/>}/>
          {/* 其他页面 */}
          <Route path="/summary" element={<SummaryPage/>}/>
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
